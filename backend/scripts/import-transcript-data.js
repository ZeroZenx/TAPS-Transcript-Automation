import prisma from '../lib/prisma.js';
import { createAuditLog } from '../lib/audit.js';
import fs from 'fs';

// Status mapping from old system to new system
const STATUS_MAP = {
  'New': 'PENDING',
  'In progress': 'IN_REVIEW',
  'Completed': 'COMPLETED',
  'Cancelled': 'REJECTED',
  'Pending': 'PENDING',
  'Approved': 'APPROVED',
};

// Parse date string (handles MM/DD/YYYY format)
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return new Date();
  
  // Try MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try standard date parsing
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}


// Clean HTML tags from text
function cleanHTML(text) {
  if (!text || text.trim() === '') return null;
  return text
    .replace(/<br>/gi, '\n')
    .replace(/<b>/gi, '')
    .replace(/<\/b>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

// Parse tab-separated data
function parseTSV(data) {
  const lines = data.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    // Skip completely empty rows
    if (Object.values(row).some(v => v !== '')) {
      rows.push(row);
    }
  }
  
  return rows;
}

// Create or get user
async function getOrCreateUser(email, name, role = 'STUDENT') {
  if (!email || email.trim() === '') return null;
  
  let user = await prisma.user.findUnique({
    where: { email: email.trim() },
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email.trim(),
        name: name || email.split('@')[0] || 'Unknown User',
        role: role,
        authMethod: 'AZURE',
      },
    });
  }
  
  return user;
}

// Map library status
function mapLibraryStatus(status) {
  if (!status || status === '' || status === 'Pending') return null;
  if (status === 'Approved') return 'Clear';
  if (status === 'Awaiting Payment') return 'Hold';
  return status; // Keep as-is for 'Hold', 'Issue', etc.
}

// Map bursar status
function mapBursarStatus(status) {
  if (!status || status === '' || status === 'Pending') return null;
  if (status === 'Approved' || status === '0.00 Balance' || status === 'Eligible for Refund') return 'Paid';
  if (status === 'Awaiting Payment') return 'Owing';
  return status; // Keep as-is for 'Paid', 'Owing', 'Waived', 'Hold'
}

// Map academic status
function mapAcademicStatus(row) {
  const academicHistory = row['Academic History'];
  if (academicHistory === 'Completed') return 'Good Standing';
  if (academicHistory === 'In complete' || academicHistory === 'Incomplete') return 'Outstanding';
  
  // Check status field for academic info
  const status = row['Status'];
  if (status === 'Completed' && !academicHistory) return 'Good Standing';
  
  return null; // Default to PENDING
}

// Extract and clean program name
function extractProgram(row) {
  // Try various fields for program
  if (row['Degree to be Awarded']) return row['Degree to be Awarded'].trim();
  if (row['Program']) return row['Program'].trim();
  if (row['Change of Programme']) return row['Change of Programme'].trim();
  
  // Default programs based on common patterns
  return 'General Studies';
}

// Get notes from multiple possible fields
function extractNotes(row, fieldName) {
  const primary = cleanHTML(row[fieldName]);
  if (primary) return primary;
  
  // Try alternative field names
  const alternatives = [
    `${fieldName} Comments`,
    `${fieldName} Note`,
    `Comments`,
  ];
  
  for (const alt of alternatives) {
    const note = cleanHTML(row[alt]);
    if (note) return note;
  }
  
  return null;
}

// Import data
async function importData(data) {
  const rows = parseTSV(data);
  console.log(`Found ${rows.length} rows to import`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      // Required fields with defaults
      const studentId = row['Student ID'] || row['Request ID'] || `IMPORT-${i + 1}`;
      const studentEmail = row['Email Address'] || `student-${i + 1}@costaatt.edu.tt`;
      const studentName = row['Requestor'] || studentEmail.split('@')[0] || 'Student';
      
      if (!studentId || !studentEmail) {
        console.log(`Skipping row ${i + 1}: Missing critical fields`);
        continue;
      }
      
      // Get or create student user
      const studentUser = await getOrCreateUser(studentEmail, studentName, 'STUDENT');
      
      // Map overall status
      const overallStatus = STATUS_MAP[row['Status']] || 'PENDING';
      
      // Map department statuses
      const libraryStatus = mapLibraryStatus(row['Library Dept Status']);
      const bursarStatus = mapBursarStatus(row['Office of Bursar Status']);
      const academicStatus = mapAcademicStatus(row);
      
      // Get notes (try multiple fields, clean HTML)
      const libraryNote = extractNotes(row, 'Library Dept Comments') || 
                         cleanHTML(row['Library Detp Due Details']) || null;
      const bursarNote = extractNotes(row, 'Office of Bursar Comments') || 
                         cleanHTML(row['Office of Bursar Due Details']) || null;
      const academicNote = extractNotes(row, 'Academic Verifier Comments') || 
                          cleanHTML(row['Academic Correction Comments']) || null;
      
      // Verifier and processor notes
      const verifierNotes = cleanHTML(row['Academic Verifier Comments']) || 
                           cleanHTML(row['Academic Correction Comments']) || null;
      const processorNotes = cleanHTML(row['Academic Verifier Comments']) || null;
      
      // Additional fields that might be useful
      const otherNotes = cleanHTML(row['Other']) || null;
      const recentMessage = cleanHTML(row['RecentMessage']) || null;
      
      // Parse dates
      const requestDate = parseDate(row['Date of Request'] || row['Created']);
      const modifiedDate = parseDate(row['Modified'] || row['Date of Request']);
      
      // Get program (with fallback)
      const program = extractProgram(row);
      
      // Combine additional notes into verifier notes if needed
      let finalVerifierNotes = verifierNotes;
      if (otherNotes && !finalVerifierNotes) {
        finalVerifierNotes = otherNotes;
      } else if (recentMessage && !finalVerifierNotes) {
        finalVerifierNotes = recentMessage;
      } else if (otherNotes && finalVerifierNotes) {
        finalVerifierNotes = `${finalVerifierNotes}\n\nAdditional Notes: ${otherNotes}`;
      }
      
      // Create request with all fields
      const request = await prisma.request.create({
        data: {
          studentId: studentId,
          studentEmail: studentEmail,
          program: program,
          requestDate: requestDate,
          status: overallStatus,
          academicStatus: academicStatus,
          academicNote: academicNote,
          libraryStatus: libraryStatus,
          libraryNote: libraryNote,
          bursarStatus: bursarStatus,
          bursarNote: bursarNote,
          verifierNotes: finalVerifierNotes,
          processorNotes: processorNotes,
          lastUpdated: modifiedDate,
          userId: studentUser?.id,
        },
      });
      
      // Create audit logs from conversations
      if (row['Conversations']) {
        const conversations = cleanHTML(row['Conversations']);
        if (conversations) {
          // Simple conversation parsing - split by common patterns
          const conversationLines = conversations.split('\n').filter(l => l.trim());
          
          for (const line of conversationLines) {
            if (line.includes(' - ')) {
              const parts = line.split(' - ');
              if (parts.length >= 3) {
                const actorName = parts[0].trim();
                const message = parts.slice(2).join(' - ');
                
                if (actorName && message) {
                  // Get or create actor user (default to VERIFIER role for staff)
                  const actorEmail = `${actorName.toLowerCase().replace(/\s+/g, '.')}@costaatt.edu.tt`;
                  const actorUser = await getOrCreateUser(actorEmail, actorName, 'VERIFIER');
                  
                  await createAuditLog(
                    'NOTE_ADDED',
                    { message: message.substring(0, 500) }, // Limit length
                    actorUser?.id,
                    request.id
                  );
                }
              }
            }
          }
        }
      }
      
      // Create initial audit log
      if (studentUser) {
        await createAuditLog(
          'REQUEST_CREATED',
          { 
            imported: true,
            originalRequestId: row['Request ID'] || row['Title'],
          },
          studentUser.id,
          request.id
        );
      }
      
      successCount++;
      
      if ((i + 1) % 50 === 0) {
        console.log(`Processed ${i + 1}/${rows.length} rows... (${successCount} success, ${errorCount} errors)`);
      }
      
    } catch (error) {
      errorCount++;
      errors.push({
        row: i + 1,
        error: error.message,
        studentId: row['Student ID'],
        email: row['Email Address'],
      });
      console.error(`Error importing row ${i + 1}:`, error.message);
    }
  }
  
  return {
    total: rows.length,
    success: successCount,
    errors: errorCount,
    errorDetails: errors,
  };
}

// Main execution
async function main() {
  const dataPath = process.argv[2];
  
  if (!dataPath) {
    console.error('Usage: node import-transcript-data.js <path-to-data-file>');
    console.error('Data file should be tab-separated with headers in first row');
    process.exit(1);
  }
  
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }
  
  console.log(`Reading data from: ${dataPath}`);
  const data = fs.readFileSync(dataPath, 'utf-8');
  
  console.log('Starting import...');
  const result = await importData(data);
  
  console.log('\n=== Import Summary ===');
  console.log(`Total rows: ${result.total}`);
  console.log(`Successfully imported: ${result.success}`);
  console.log(`Errors: ${result.errors}`);
  
  if (result.errorDetails.length > 0 && result.errorDetails.length <= 20) {
    console.log('\n=== Error Details ===');
    result.errorDetails.forEach(err => {
      console.log(`Row ${err.row}: ${err.error}`);
      console.log(`  Student: ${err.studentId}, Email: ${err.email}`);
    });
  } else if (result.errorDetails.length > 20) {
    console.log(`\n(${result.errorDetails.length} errors - showing first 10)`);
    result.errorDetails.slice(0, 10).forEach(err => {
      console.log(`Row ${err.row}: ${err.error}`);
    });
  }
  
  await prisma.$disconnect();
  process.exit(result.errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
