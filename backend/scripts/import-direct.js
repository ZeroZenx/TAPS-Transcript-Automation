import prisma from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse date string
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    if (dateStr.includes(':')) {
      const parts = dateStr.split(' ');
      const datePart = parts[0];
      const timePart = parts[1]?.toUpperCase() || 'AM';
      const [m, d, y] = datePart.split('/').map(Number);
      let [h, min] = (parts[1]?.replace(/[^0-9:]/g, '') || '12:00').split(':').map(Number);
      if (timePart.includes('PM') && h < 12) h += 12;
      if (timePart.includes('AM') && h === 12) h = 0;
      return new Date(y, m - 1, d, h || 0, min || 0);
    }
    const [m, d, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  } catch {
    return null;
  }
}

function parseBoolean(str) {
  if (!str || str.trim() === '') return null;
  const upper = str.toUpperCase();
  if (upper === 'TRUE' || upper === 'FALSE') return upper;
  return str;
}

function parseAmount(str) {
  if (!str || str.trim() === '') return null;
  return str.replace(/[$,]/g, '').trim();
}

// Smart TSV parser that handles multi-line fields by counting columns
function parseTSV(text) {
  // Remove BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  const lines = [];
  let headerColCount = 0;
  let currentRow = [];
  let currentField = '';
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    if (char === '\t') {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n') {
      currentRow.push(currentField);
      currentField = '';
      
      // First line is header - count columns
      if (lines.length === 0) {
        headerColCount = currentRow.length;
        lines.push(currentRow);
        currentRow = [];
      } else {
        // Check if we have a complete row
        if (currentRow.length >= headerColCount) {
          // Complete row
          if (currentRow.some(f => f.trim() !== '')) {
            // Ensure we have exactly headerColCount columns
            while (currentRow.length > headerColCount) {
              // Merge extra columns into last field (multi-line continuation)
              const lastField = currentRow.pop();
              currentRow[currentRow.length - 1] += '\n' + lastField;
            }
            lines.push(currentRow.slice(0, headerColCount));
          }
          currentRow = [];
        } else {
          // Incomplete row - this is a continuation of previous field
          // Merge into last field of previous row
          if (lines.length > 0 && currentRow.length > 0) {
            const lastRow = lines[lines.length - 1];
            const lastField = lastRow[lastRow.length - 1];
            lastRow[lastRow.length - 1] = lastField + '\n' + currentRow.join('\t');
          }
          currentRow = [];
        }
      }
    } else {
      currentField += char;
    }
    i++;
  }
  
  // Handle last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length >= headerColCount && currentRow.some(f => f.trim() !== '')) {
      while (currentRow.length > headerColCount) {
        const lastField = currentRow.pop();
        currentRow[currentRow.length - 1] += '\n' + lastField;
      }
      lines.push(currentRow.slice(0, headerColCount));
    }
  }
  
  return lines;
}

async function importData() {
  try {
    console.log('📥 Starting direct data import...');
    
    const dataPath = path.join(__dirname, '../../data/requests-data.tsv');
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ Data file not found at:', dataPath);
      return;
    }
    
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const parsed = parseTSV(fileContent);
    
    if (parsed.length < 2) {
      console.log('❌ No data rows found in file');
      return;
    }
    
    const headers = parsed[0].map(h => h.trim());
    console.log(`📋 Found ${headers.length} columns, ${parsed.length - 1} data rows`);
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    for (let i = 1; i < parsed.length; i++) {
      const values = parsed[i];
      if (values.length !== headers.length) {
        console.log(`⚠️  Row ${i + 1} has ${values.length} columns, expected ${headers.length} - skipping`);
        errors++;
        continue;
      }
      
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim();
      });
      
      try {
        if (!row['Student ID'] && !row['Email Address']) {
          continue;
        }
        
        let user = await prisma.user.findUnique({
          where: { email: row['Email Address'] || `student_${row['Student ID']}@costaatt.edu.tt` }
        });
        
        if (!user && row['Email Address']) {
          user = await prisma.user.create({
            data: {
              email: row['Email Address'],
              name: row['Requestor'] || row['Email Address'].split('@')[0],
              role: 'STUDENT',
              authMethod: 'LOCAL'
            }
          });
        }
        
        const requestData = {
          title: row['Title'] || null,
          requestId: row['Request ID'] || null,
          studentId: row['Student ID'] || '',
          studentEmail: row['Email Address'] || '',
          program: row['Program'] || '',
          requestDate: parseDate(row['Date of Request']) || new Date(),
          status: row['Status'] || 'PENDING',
          idValue: row['Id_Value'] || null,
          requestor: row['Requestor'] || null,
          academicStatus: row['Academic History'] || row['Academic Status'] || null,
          academicNote: row['Academic Verifier Comments'] || null,
          academicHistory: row['Academic History'] || null,
          academicVerifierComments: row['Academic Verifier Comments'] || null,
          academicCorrectionAddressed: parseBoolean(row['Academic Correction Addressed']),
          academicCorrectionComments: row['Academic Correction Comments'] || null,
          responsibleDeptForAcademicIssues: row['Responsible Dept for Academic Issues'] || null,
          academicDeptFirstReminder: parseDate(row['AcademicDeptFirstReminder']),
          academicDeptSecondReminder: parseDate(row['AcademicDeptSecondReminder']),
          academicDeptThirdReminder: parseDate(row['AcademicDeptThirdReminder']),
          academicDeptFourthReminder: parseDate(row['AcademicDeptFourthReminder']),
          libraryStatus: row['Library Dept Status'] || null,
          libraryNote: row['Library Dept Comments'] || null,
          libraryDeptDueAmount: parseAmount(row['Library Dept Due Amount']),
          libraryDeptDueDetails: row['Library Detp Due Details'] || null,
          bursarsConfirmationForLibraryDuePayment: parseBoolean(row["Bursar's Confirmation for Library Due Payment"]),
          bursarStatus: row['Office of Bursar Status'] || null,
          bursarNote: row['Office of Bursar Comments'] || null,
          officeOfBursarDueAmount: parseAmount(row['Office of Bursar Due Amount']),
          officeOfBursarDueDetails: row['Office of Bursar Due Details'] || null,
          gpaRecalculation: row['GPA Recalculation'] || null,
          changeOfProgramme: row['Change of Programme'] || null,
          addressFormat: row['Address Format'] || null,
          honourToBeEntered: row['Honour to be Entered'] || null,
          degreeToBeAwarded: row['Degree to be Awarded'] || null,
          inProgressCoursesForPriorSemester: row['InProgress courses for prior semester'] || null,
          transcriptTemplateIssue: row['Transcript Template Issue'] || null,
          other: row['Other'] || null,
          totalDue: parseAmount(row['TotalDue']),
          sendNotification: parseBoolean(row['SendNotification']),
          sendAcademicHistoryNotification: parseBoolean(row['SendAcademicHistoryNotification']),
          sendAutomaticNotificationForPendingAcademic: parseBoolean(row['SendAutomaticNotificationForPendingAcademic']),
          sendAutomaticNotificationForPendingDue: parseBoolean(row['SendAutomaticNotificationForPendingDue']),
          sendDuePendingNotification: parseBoolean(row['SendDuePendingNotification']),
          sendAcademicCorrectionMadeNotification: parseBoolean(row['SendAcademicCorrectionMadeNotification']),
          sendToTranscriptVerifier: parseBoolean(row['SendToTranscriptVerifier']),
          assistantRegistrarNotificationDate: parseDate(row['Assistant Registrar Notification Date']),
          deanRegistrarNotificationDate: parseDate(row['Dean Registrar Notification Date']),
          vpAcademicAffairsAndRegistrarNotificationDate: parseDate(row['VP Academic Affairs and Registrar Notification Date']),
          requestCancellationNotificationDate: parseDate(row['Request Cancellation Notification Date']),
          pendingDueFirstReminderDate: parseDate(row['PendingDueFirstReminderDate']),
          pendingDueFinalReminderDate: parseDate(row['PendingDueFinalReminderDate']),
          pendingDueRequestCancellationReminder: parseDate(row['PendingDueRequestCancellationReminder']),
          cancelType: row['Cancel Type'] || null,
          reasonForRequestCancellation: row['Reason for Request Cancellation'] || null,
          recentMessage: row['RecentMessage'] || null,
          conversations: row['Conversations'] || null,
          sentTo: row['SentTo'] || null,
          sendMessage: parseBoolean(row['SendMessage']),
          parchmentCode: row['Parchment Code'] || null,
          created: parseDate(row['Created']) || new Date(),
          createdBy: row['Created By'] || null,
          modified: parseDate(row['Modified']) || new Date(),
          modifiedBy: row['Modified By'] || null,
          userId: user?.id || null
        };
        
        if (!requestData.requestId) {
          requestData.requestId = `REQ_${requestData.studentId}_${Date.now()}_${i}`;
        }
        
        const existing = await prisma.request.findUnique({
          where: { requestId: requestData.requestId }
        });
        
        if (!existing) {
          await prisma.request.create({ data: requestData });
          imported++;
        } else {
          await prisma.request.update({
            where: { requestId: requestData.requestId },
            data: requestData
          });
          updated++;
        }
        
        if ((imported + updated) % 50 === 0) {
          console.log(`✅ Processed ${imported + updated} requests... (${imported} new, ${updated} updated)`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error importing row ${i + 1}:`, error.message);
        if (errors > 20) {
          console.log('❌ Too many errors, stopping import');
          break;
        }
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   New: ${imported} requests`);
    console.log(`   Updated: ${updated} requests`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importData();

