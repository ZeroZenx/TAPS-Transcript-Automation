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
    if (dateStr.includes(':')) {
      const [datePart, timePart] = dateStr.split(' ');
      const [m, d, y] = datePart.split('/').map(Number);
      const time = timePart?.toUpperCase() || 'AM';
      let [h, min] = timePart?.replace(/[^0-9:]/g, '').split(':').map(Number) || [0, 0];
      if (time.includes('PM') && h < 12) h += 12;
      if (time.includes('AM') && h === 12) h = 0;
      return new Date(y, m - 1, d, h || 0, min || 0);
    }
    const [m, d, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  } catch {
    return null;
  }
}

// Normalize strings for comparison
function normalize(str) {
  if (!str) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

// Parse TSV
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

async function verifyData() {
  try {
    console.log('🔍 Starting data verification...\n');
    
    const dataPath = path.join(__dirname, '../../data/requests-data.tsv');
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ Data file not found:', dataPath);
      return;
    }
    
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const parsed = parseTSV(fileContent);
    
    if (parsed.length < 2) {
      console.log('❌ No data rows found in file');
      return;
    }
    
    const headers = parsed[0].map(h => h.trim());
    console.log(`📋 TSV File: ${headers.length} columns, ${parsed.length - 1} data rows\n`);
    
    // Get all requests from database
    const dbRequests = await prisma.request.findMany({
      orderBy: { requestDate: 'desc' }
    });
    
    console.log(`📊 Database: ${dbRequests.length} requests\n`);
    
    // Create maps for quick lookup
    const dbByRequestId = new Map();
    const dbByStudentId = new Map();
    dbRequests.forEach(req => {
      if (req.requestId) dbByRequestId.set(String(req.requestId), req);
      if (req.studentId) dbByStudentId.set(String(req.studentId), req);
    });
    
    const fieldMappings = {
      'Request ID': 'requestId',
      'Student ID': 'studentId',
      'Email Address': 'studentEmail',
      'Status': 'status',
      'Library Dept Status': 'libraryStatus',
      'Library Dept Comments': 'libraryNote',
      'Office of Bursar Status': 'bursarStatus',
      'Office of Bursar Comments': 'bursarNote',
      'Academic History': 'academicHistory',
      'Academic Verifier Comments': 'academicVerifierComments',
      'Library Dept Due Amount': 'libraryDeptDueAmount',
      'Library Detp Due Details': 'libraryDeptDueDetails',
      'Office of Bursar Due Amount': 'officeOfBursarDueAmount',
      'Office of Bursar Due Details': 'officeOfBursarDueDetails',
      'RecentMessage': 'recentMessage',
      'Conversations': 'conversations',
      'Parchment Code': 'parchmentCode',
      'Requestor': 'requestor',
      'TotalDue': 'totalDue',
    };
    
    let verified = 0;
    let missing = 0;
    let differences = [];
    let notInDB = [];
    
    // Process each TSV row
    for (let i = 1; i < parsed.length; i++) {
      const values = parsed[i];
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim();
      });
      
      const requestId = row['Request ID'];
      const studentId = row['Student ID'];
      
      // Find matching DB record
      let dbRequest = null;
      if (requestId) {
        dbRequest = dbByRequestId.get(String(requestId));
      }
      if (!dbRequest && studentId) {
        dbRequest = dbByStudentId.get(String(studentId));
      }
      
      if (!dbRequest) {
        notInDB.push({
          requestId,
          studentId,
          email: row['Email Address'],
          status: row['Status']
        });
        missing++;
        continue;
      }
      
      // Verify key fields, especially notes and status
      const issues = [];
      
      // Status fields
      if (row['Status'] && normalize(row['Status']) !== normalize(dbRequest.status || '')) {
        issues.push({
          field: 'Status',
          tsv: row['Status'],
          db: dbRequest.status
        });
      }
      
      if (row['Library Dept Status'] && normalize(row['Library Dept Status']) !== normalize(dbRequest.libraryStatus || '')) {
        issues.push({
          field: 'Library Dept Status',
          tsv: row['Library Dept Status'],
          db: dbRequest.libraryStatus
        });
      }
      
      if (row['Office of Bursar Status'] && normalize(row['Office of Bursar Status']) !== normalize(dbRequest.bursarStatus || '')) {
        issues.push({
          field: 'Office of Bursar Status',
          tsv: row['Office of Bursar Status'],
          db: dbRequest.bursarStatus
        });
      }
      
      // Note/Comment fields
      if (row['Library Dept Comments'] && normalize(row['Library Dept Comments']) !== normalize(dbRequest.libraryNote || '')) {
        issues.push({
          field: 'Library Dept Comments',
          tsv: row['Library Dept Comments']?.substring(0, 100) + '...',
          db: dbRequest.libraryNote?.substring(0, 100) + '...'
        });
      }
      
      if (row['Office of Bursar Comments'] && normalize(row['Office of Bursar Comments']) !== normalize(dbRequest.bursarNote || '')) {
        issues.push({
          field: 'Office of Bursar Comments',
          tsv: row['Office of Bursar Comments']?.substring(0, 100) + '...',
          db: dbRequest.bursarNote?.substring(0, 100) + '...'
        });
      }
      
      if (row['Academic Verifier Comments'] && normalize(row['Academic Verifier Comments']) !== normalize(dbRequest.academicVerifierComments || '')) {
        issues.push({
          field: 'Academic Verifier Comments',
          tsv: row['Academic Verifier Comments']?.substring(0, 100) + '...',
          db: dbRequest.academicVerifierComments?.substring(0, 100) + '...'
        });
      }
      
      // Conversation fields
      if (row['RecentMessage'] && normalize(row['RecentMessage']) !== normalize(dbRequest.recentMessage || '')) {
        issues.push({
          field: 'RecentMessage',
          tsv: row['RecentMessage']?.substring(0, 100) + '...',
          db: dbRequest.recentMessage?.substring(0, 100) + '...'
        });
      }
      
      if (row['Conversations'] && normalize(row['Conversations']) !== normalize(dbRequest.conversations || '')) {
        issues.push({
          field: 'Conversations',
          tsv: row['Conversations']?.substring(0, 100) + '...',
          db: dbRequest.conversations?.substring(0, 100) + '...'
        });
      }
      
      // Due amounts
      const tsvLibAmount = row['Library Dept Due Amount']?.replace(/[$,]/g, '').trim();
      const dbLibAmount = dbRequest.libraryDeptDueAmount?.replace(/[$,]/g, '').trim();
      if (tsvLibAmount && normalize(tsvLibAmount) !== normalize(dbLibAmount || '')) {
        issues.push({
          field: 'Library Dept Due Amount',
          tsv: tsvLibAmount,
          db: dbLibAmount
        });
      }
      
      const tsvBursAmount = row['Office of Bursar Due Amount']?.replace(/[$,]/g, '').trim();
      const dbBursAmount = dbRequest.officeOfBursarDueAmount?.replace(/[$,]/g, '').trim();
      if (tsvBursAmount && normalize(tsvBursAmount) !== normalize(dbBursAmount || '')) {
        issues.push({
          field: 'Office of Bursar Due Amount',
          tsv: tsvBursAmount,
          db: dbBursAmount
        });
      }
      
      // Parchment Code
      if (row['Parchment Code'] && normalize(row['Parchment Code']) !== normalize(dbRequest.parchmentCode || '')) {
        issues.push({
          field: 'Parchment Code',
          tsv: row['Parchment Code'],
          db: dbRequest.parchmentCode
        });
      }
      
      if (issues.length > 0) {
        differences.push({
          requestId,
          studentId,
          email: row['Email Address'],
          issues
        });
      } else {
        verified++;
      }
    }
    
    // Generate report
    console.log('='.repeat(80));
    console.log('📊 VERIFICATION REPORT');
    console.log('='.repeat(80));
    console.log(`\n✅ Verified (all fields match): ${verified}`);
    console.log(`⚠️  Missing from database: ${missing}`);
    console.log(`🔍 Differences found: ${differences.length}\n`);
    
    if (notInDB.length > 0) {
      console.log('❌ REQUESTS NOT IN DATABASE:');
      console.log('-'.repeat(80));
      notInDB.slice(0, 10).forEach(req => {
        console.log(`  Request ID: ${req.requestId || 'N/A'}`);
        console.log(`  Student ID: ${req.studentId || 'N/A'}`);
        console.log(`  Email: ${req.email || 'N/A'}`);
        console.log(`  Status: ${req.status || 'N/A'}`);
        console.log('');
      });
      if (notInDB.length > 10) {
        console.log(`  ... and ${notInDB.length - 10} more\n`);
      }
    }
    
    if (differences.length > 0) {
      console.log('⚠️  REQUESTS WITH DIFFERENCES:');
      console.log('-'.repeat(80));
      differences.slice(0, 20).forEach(diff => {
        console.log(`\n📋 Request ID: ${diff.requestId || 'N/A'} | Student ID: ${diff.studentId || 'N/A'}`);
        console.log(`   Email: ${diff.email || 'N/A'}`);
        diff.issues.forEach(issue => {
          console.log(`   ❌ ${issue.field}:`);
          console.log(`      TSV: ${issue.tsv || '(empty)'}`);
          console.log(`      DB:  ${issue.db || '(empty)'}`);
        });
      });
      if (differences.length > 20) {
        console.log(`\n   ... and ${differences.length - 20} more requests with differences\n`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Verification complete!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();

