import prisma from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse date string (handles formats like "4/17/2025", "5/1/2025 12:36 PM")
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    // Handle date-time format: "4/29/2025 12:36 PM"
    if (dateStr.includes(':')) {
      const [datePart, timePart] = dateStr.split(' ');
      const [m, d, y] = datePart.split('/').map(Number);
      const time = timePart?.toUpperCase() || 'AM';
      let [h, min] = timePart?.replace(/[^0-9:]/g, '').split(':').map(Number) || [0, 0];
      if (time.includes('PM') && h < 12) h += 12;
      if (time.includes('AM') && h === 12) h = 0;
      return new Date(y, m - 1, d, h || 0, min || 0);
    }
    // Handle date-only format: "4/17/2025"
    const [m, d, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  } catch {
    return null;
  }
}

// Convert TRUE/FALSE string to boolean string
function parseBoolean(str) {
  if (!str || str.trim() === '') return null;
  const upper = str.toUpperCase();
  if (upper === 'TRUE' || upper === 'FALSE') return upper;
  return str;
}

// Parse number/currency string
function parseAmount(str) {
  if (!str || str.trim() === '') return null;
  // Remove currency symbols and commas
  return str.replace(/[$,]/g, '').trim();
}

async function importData() {
  try {
    console.log('📥 Starting data import...');
    
    // Try multiple possible data file locations
    const possiblePaths = [
      path.join(__dirname, '../../data/requests-data.tsv'),
      path.join(__dirname, '../../data/transcript-requests.tsv'),
      path.join(__dirname, '../../data/transcript-import.tsv')
    ];
    
    let dataPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        dataPath = p;
        break;
      }
    }
    
    if (!dataPath) {
      console.log('❌ No data file found. Tried:', possiblePaths.join(', '));
      return;
    }
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ Data file not found. Please create data/requests-data.tsv with the tab-separated data.');
      return;
    }
    
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    
    // Better TSV parsing that handles quoted fields with newlines
    function parseTSV(text) {
      const lines = [];
      let currentLine = [];
      let currentField = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < text.length) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"' && !inQuotes) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else if (char === '"' && inQuotes) {
          inQuotes = false;
        } else if (char === '\t' && !inQuotes) {
          // End of field
          currentLine.push(currentField);
          currentField = '';
        } else if (char === '\n' && !inQuotes) {
          // End of row
          currentLine.push(currentField);
          if (currentLine.length > 0 && currentLine.some(f => f.trim() !== '')) {
            lines.push(currentLine);
          }
          currentLine = [];
          currentField = '';
        } else {
          currentField += char;
        }
        i++;
      }
      
      // Push last field and line
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField);
        if (currentLine.length > 0 && currentLine.some(f => f.trim() !== '')) {
          lines.push(currentLine);
        }
      }
      
      return lines;
    }
    
    const parsed = parseTSV(fileContent);
    
    if (parsed.length < 2) {
      console.log('❌ No data rows found in file');
      return;
    }
    
    // Parse headers
    const headers = parsed[0].map(h => h.trim());
    console.log(`📋 Found ${headers.length} columns, ${parsed.length - 1} data rows`);
    
    let imported = 0;
    let errors = 0;
    
    // Process each row
    for (let i = 1; i < parsed.length; i++) {
      const values = parsed[i];
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim();
      });
      
      try {
        // Validate row - skip continuation rows and invalid data
        const requestId = row['Request ID']?.trim();
        const studentId = row['Student ID']?.trim();
        const studentEmail = row['Email Address']?.trim();
        
        // Skip rows with invalid request IDs (these are continuation rows)
        const invalidRequestIds = [
          'Library Dept', 'Bursar Dept', 'Transcript Processor', 'Transcript Verifier',
          'Completed', 'False', ''
        ];
        if (requestId && invalidRequestIds.includes(requestId)) {
          continue;
        }
        
        // Skip rows where request ID looks like HTML/conversation content
        if (requestId && (requestId.includes('<b>') || requestId.includes('<br>') || requestId.length > 100)) {
          continue;
        }
        
        // Skip rows with invalid student IDs
        if (studentId && ['False', 'Completed', ''].includes(studentId)) {
          continue;
        }
        
        // Skip rows without valid student ID or email
        if (!studentId || (!studentEmail && !studentId.match(/^\d+$/))) {
          continue;
        }
        
        // Validate date - skip if date is invalid
        const requestDate = parseDate(row['Date of Request']);
        if (!requestDate || isNaN(requestDate.getTime())) {
          // If we have a valid request ID, try to find existing request and update it
          if (requestId && requestId.match(/^\d+$/)) {
            // This might be a valid request with a bad date, skip for now
            continue;
          } else {
            // Skip completely invalid rows
            continue;
          }
        }
        
        // Find or create user by email
        let user = await prisma.user.findUnique({
          where: { email: studentEmail || `student_${studentId}@costaatt.edu.tt` }
        });
        
        if (!user && studentEmail) {
          // Create user if doesn't exist
          user = await prisma.user.create({
            data: {
              email: studentEmail,
              name: row['Requestor'] || studentEmail.split('@')[0],
              role: 'STUDENT',
              authMethod: 'LOCAL'
            }
          });
        }
        
        // Prepare request data
        const requestData = {
          title: row['Title'] || null,
          requestId: requestId || null,
          studentId: studentId || '',
          studentEmail: studentEmail || '',
          program: row['Program'] || '',
          requestDate: requestDate || new Date(),
          status: row['Status'] || 'PENDING',
          idValue: row['Id_Value'] || null,
          requestor: row['Requestor'] || null,
          
          // Academic
          academicStatus: row['Academic History'] || row['Academic Status'] || null,
          academicNote: row['Academic Verifier Comments'] || null,
          academicHistory: row['Academic History'] || null,
          academicVerifierComments: row['Academic Verifier Comments'] || null,
          academicCorrectionAddressed: parseBoolean(row['Academic Correction Addressed']),
          academicCorrectionComments: row['Academic Correction Comments'] || null,
          responsibleDeptForAcademicIssues: row['Responsible Dept for Academic Issues'] || null,
          academicDeptFirstReminder: (() => {
            const d = parseDate(row['AcademicDeptFirstReminder']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          academicDeptSecondReminder: (() => {
            const d = parseDate(row['AcademicDeptSecondReminder']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          academicDeptThirdReminder: (() => {
            const d = parseDate(row['AcademicDeptThirdReminder']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          academicDeptFourthReminder: (() => {
            const d = parseDate(row['AcademicDeptFourthReminder']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          
          // Library
          libraryStatus: row['Library Dept Status'] || null,
          libraryNote: row['Library Dept Comments'] || null,
          libraryDeptDueAmount: parseAmount(row['Library Dept Due Amount']),
          libraryDeptDueDetails: row['Library Detp Due Details'] || null,
          bursarsConfirmationForLibraryDuePayment: parseBoolean(row["Bursar's Confirmation for Library Due Payment"]),
          
          // Bursar
          bursarStatus: row['Office of Bursar Status'] || null,
          bursarNote: row['Office of Bursar Comments'] || null,
          officeOfBursarDueAmount: parseAmount(row['Office of Bursar Due Amount']),
          officeOfBursarDueDetails: row['Office of Bursar Due Details'] || null,
          
          // Request details
          gpaRecalculation: row['GPA Recalculation'] || null,
          changeOfProgramme: row['Change of Programme'] || null,
          addressFormat: row['Address Format'] || null,
          honourToBeEntered: row['Honour to be Entered'] || null,
          degreeToBeAwarded: row['Degree to be Awarded'] || null,
          inProgressCoursesForPriorSemester: row['InProgress courses for prior semester'] || null,
          transcriptTemplateIssue: row['Transcript Template Issue'] || null,
          other: row['Other'] || null,
          
          // Financial
          totalDue: parseAmount(row['TotalDue']),
          
          // Notifications
          sendNotification: parseBoolean(row['SendNotification']),
          sendAcademicHistoryNotification: parseBoolean(row['SendAcademicHistoryNotification']),
          sendAutomaticNotificationForPendingAcademic: parseBoolean(row['SendAutomaticNotificationForPendingAcademic']),
          sendAutomaticNotificationForPendingDue: parseBoolean(row['SendAutomaticNotificationForPendingDue']),
          sendDuePendingNotification: parseBoolean(row['SendDuePendingNotification']),
          sendAcademicCorrectionMadeNotification: parseBoolean(row['SendAcademicCorrectionMadeNotification']),
          sendToTranscriptVerifier: parseBoolean(row['SendToTranscriptVerifier']),
          
          // Dates (skip invalid dates)
          assistantRegistrarNotificationDate: (() => {
            const d = parseDate(row['Assistant Registrar Notification Date']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          deanRegistrarNotificationDate: (() => {
            const d = parseDate(row['Dean Registrar Notification Date']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          vpAcademicAffairsAndRegistrarNotificationDate: (() => {
            const d = parseDate(row['VP Academic Affairs and Registrar Notification Date']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          requestCancellationNotificationDate: (() => {
            const d = parseDate(row['Request Cancellation Notification Date']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          pendingDueFirstReminderDate: (() => {
            const d = parseDate(row['PendingDueFirstReminderDate']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          pendingDueFinalReminderDate: (() => {
            const d = parseDate(row['PendingDueFinalReminderDate']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          pendingDueRequestCancellationReminder: (() => {
            const d = parseDate(row['PendingDueRequestCancellationReminder']);
            return d && !isNaN(d.getTime()) ? d : null;
          })(),
          
          // Cancellation
          cancelType: row['Cancel Type'] || null,
          reasonForRequestCancellation: row['Reason for Request Cancellation'] || null,
          
          // Messages
          recentMessage: row['RecentMessage'] || null,
          conversations: row['Conversations'] || null,
          sentTo: row['SentTo'] || null,
          sendMessage: parseBoolean(row['SendMessage']),
          
          // Parchment
          parchmentCode: row['Parchment Code'] || null,
          
          // Metadata
          created: (() => {
            const d = parseDate(row['Created']);
            return d && !isNaN(d.getTime()) ? d : new Date();
          })(),
          createdBy: row['Created By'] || null,
          modified: (() => {
            const d = parseDate(row['Modified']);
            return d && !isNaN(d.getTime()) ? d : new Date();
          })(),
          modifiedBy: row['Modified By'] || null,
          
          // User relation
          userId: user?.id || null
        };
        
        // Additional validation - ensure we have at least student ID
        if (!requestData.studentId || requestData.studentId === 'False' || requestData.studentId === 'Completed') {
          continue;
        }
        
        // Check if request already exists by requestId
        let existing = null;
        if (requestData.requestId) {
          existing = await prisma.request.findUnique({
            where: { requestId: requestData.requestId }
          });
        }
        
        if (!existing) {
          // If no requestId, generate one
          if (!requestData.requestId) {
            requestData.requestId = `REQ_${requestData.studentId}_${Date.now()}_${i}`;
          }
          
          await prisma.request.create({ data: requestData });
          imported++;
          if (imported % 50 === 0) {
            console.log(`✅ Imported ${imported} requests...`);
          }
        } else {
          // Update existing
          await prisma.request.update({
            where: { requestId: requestData.requestId },
            data: requestData
          });
          imported++;
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error importing row ${i + 1}:`, error.message);
        if (errors > 10) {
          console.log('❌ Too many errors, stopping import');
          break;
        }
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported} requests`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
