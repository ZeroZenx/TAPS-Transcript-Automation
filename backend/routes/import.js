import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// TSV Parser that handles quoted fields with newlines
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
      currentField += '"';
      i++;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
    } else if (char === '\t' && !inQuotes) {
      currentLine.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
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
  
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField);
    if (currentLine.length > 0 && currentLine.some(f => f.trim() !== '')) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

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

// POST /api/import/tsv - Upload and import TSV file
router.post('/tsv', authenticateToken, requireRole('ADMIN'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Remove BOM if present and parse
    let fileContent = req.file.buffer.toString('utf-8');
    // Remove UTF-8 BOM (EF BB BF)
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    const parsed = parseTSV(fileContent);
    
    if (parsed.length < 2) {
      return res.status(400).json({ error: 'No data rows found in file' });
    }
    
    const headers = parsed[0].map(h => h.trim());
    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];
    
    for (let i = 1; i < parsed.length; i++) {
      const values = parsed[i];
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
      } catch (error) {
        errors++;
        errorDetails.push({ row: i + 1, error: error.message });
        if (errors > 20) {
          break;
        }
      }
    }
    
    res.json({
      success: true,
      imported,
      updated,
      errors,
      total: imported + updated,
      errorDetails: errorDetails.slice(0, 10) // First 10 errors
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import data', details: error.message });
  }
});

export default router;

