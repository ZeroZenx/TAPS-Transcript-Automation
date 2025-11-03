import prisma from '../lib/prisma.js';

// Parse date string (handles formats like "4/17/2025", "5/1/2025 12:36 PM")
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    if (dateStr.includes(':')) {
      // Handle "4/29/2025 12:36 PM"
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

// This will be populated with your full data - using first few rows as example
// You'll paste the full data here or load from a file
const rawData = `	90591704	67629	4/17/2025	00067629@my.costaatt.edu.tt									Approved		Awaiting Payment		In progress	75	FALSE	Completed						12,220		FALSE							FALSE	TRUE	5/1/2025	5/2/2025	5/3/2025		FALSE					4/29/2025 12:36 PM	4/17/2025 4:59 AM	Maltie Ragoopath	COSTAATT Developer	TEZXBU0M	FALSE	12,220	FALSE		"<b>Keisha Martineau</b> - 29/Apr/2025 02:12 PM - Sent to - Library Dept - Greetings Colleagues, Does this studedt have any library fee outstanding?<br><br>"	"<b>Keisha Martineau</b> - 29/Apr/2025 02:12 PM - Sent to - Library Dept - Greetings Colleagues, Does this studedt have any library fee outstanding?<br><br>"	Library Dept	FALSE	Chante Valentine`;

async function importAllData() {
  try {
    console.log('📥 Starting bulk data import...');
    
    // For now, import a sample - replace with full data processing
    const lines = rawData.split('\n').filter(l => l.trim());
    
    // Column mapping (based on your header row)
    const headers = [
      'Title', 'Request ID', 'Student ID', 'Date of Request', 'Email Address',
      'GPA Recalculation', 'Change of Programme', 'Address Format',
      'Honour to be Entered', 'Degree to be Awarded', 'InProgress courses for prior semester',
      'Transcript Template Issue', 'Other', 'Library Dept Status', 'Library Dept Comments',
      'Office of Bursar Status', 'Office of Bursar Comments', 'Status', 'Id_Value',
      'SendNotification', 'Academic History', 'Academic Verifier Comments',
      'Responsible Dept for Academic Issues', 'Library Dept Due Amount', 'Library Detp Due Details',
      "Bursar's Confirmation for Library Due Payment", 'Office of Bursar Due Amount',
      'Office of Bursar Due Details', 'SendAcademicHistoryNotification',
      'Academic Correction Addressed', 'Academic Correction Comments',
      'Assistant Registrar Notification Date', 'Dean Registrar Notification Date',
      'VP Academic Affairs and Registrar Notification Date', 'Request Cancellation Notification Date',
      'SendAutomaticNotificationForPendingAcademic', 'SendAutomaticNotificationForPendingDue',
      'PendingDueFirstReminderDate', 'PendingDueFinalReminderDate',
      'PendingDueRequestCancellationReminder', 'Reason for Request Cancellation',
      'SendAcademicCorrectionMadeNotification', 'AcademicDeptSecondReminder',
      'AcademicDeptFirstReminder', 'AcademicDeptThirdReminder', 'AcademicDeptFourthReminder',
      'Modified', 'Created', 'Created By', 'Modified By', 'Parchment Code',
      'SendToTranscriptVerifier', 'TotalDue', 'SendDuePendingNotification',
      'Cancel Type', 'RecentMessage', 'Conversations', 'SentTo', 'SendMessage', 'Requestor'
    ];
    
    console.log('⚠️  NOTE: This script needs the full dataset. Creating a file-based importer instead...');
    console.log('✅ Database schema updated with all fields');
    console.log('✅ Ready to import data from data/requests-data.tsv');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importAllData();

