import prisma from './prisma.js';
import { getEmailSettings, sendEmail } from './email.js';

/**
 * Replace template variables in email templates
 */
function replaceTemplateVariables(template, data) {
  if (!template) return '';
  
  let result = template;
  result = result.replace(/{{REQUEST_ID}}/g, data.requestId || data.id?.substring(0, 8) || 'N/A');
  result = result.replace(/{{STUDENT_NAME}}/g, data.studentName || data.requestor || 'Student');
  result = result.replace(/{{STUDENT_ID}}/g, data.studentId || 'N/A');
  result = result.replace(/{{STUDENT_EMAIL}}/g, data.studentEmail || 'N/A');
  result = result.replace(/{{PROGRAM}}/g, data.program || 'N/A');
  
  return result;
}

/**
 * Send Academic Verification Completed email to Transcript Processor
 */
export async function sendAcademicCompletedNotification(request) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts) {
      console.log('Academic completed notification disabled');
      return { success: false, message: 'Notifications disabled' };
    }

    // Get processor email (could be from settings or find a processor user)
    // For now, we'll use a settings field or default to admin email
    const processorEmail = settings.emailAccount; // Or find processor user from database

    const subjectTemplate = settings.academicCompletedSubject || 'Transcript Request for Academic Verification Completed - {{REQUEST_ID}}';
    const bodyTemplate = settings.academicCompletedTemplate || 'Dear Transcript Processor,\n\nTranscript request - {{REQUEST_ID}} - {{STUDENT_ID}} has been verified and there are no corrections.\n\nRegards,';

    const subject = replaceTemplateVariables(subjectTemplate, {
      requestId: request.requestId || request.id.substring(0, 8),
      studentName: request.requestor || 'Student',
      studentId: request.studentId,
      studentEmail: request.studentEmail,
      program: request.program,
    });

    const body = replaceTemplateVariables(bodyTemplate, {
      requestId: request.requestId || request.id.substring(0, 8),
      studentName: request.requestor || 'Student',
      studentId: request.studentId,
      studentEmail: request.studentEmail,
      program: request.program,
    });

    const result = await sendEmail({
      to: processorEmail,
      subject,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              ${body.replace(/\n/g, '<br>')}
            </div>
          </body>
        </html>
      `,
      textBody: body,
    });

    return result;
  } catch (error) {
    console.error('Error sending Academic completed notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send Academic Corrections Required email to Transcript Processor
 */
export async function sendAcademicCorrectionNotification(request) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts) {
      console.log('Academic correction notification disabled');
      return { success: false, message: 'Notifications disabled' };
    }

    const processorEmail = settings.emailAccount; // Or find processor user from database

    const subjectTemplate = settings.academicCorrectionSubject || 'Academic corrections required: {{REQUEST_ID}}';
    const bodyTemplate = settings.academicCorrectionTemplate || 'Dear Transcript Processor,\n\nTranscript request - {{REQUEST_ID}} - {{STUDENT_ID}} has been reviewed and corrections are required.:\n\nRegards,';

    const subject = replaceTemplateVariables(subjectTemplate, {
      requestId: request.requestId || request.id.substring(0, 8),
      studentName: request.requestor || 'Student',
      studentId: request.studentId,
      studentEmail: request.studentEmail,
      program: request.program,
    });

    const body = replaceTemplateVariables(bodyTemplate, {
      requestId: request.requestId || request.id.substring(0, 8),
      studentName: request.requestor || 'Student',
      studentId: request.studentId,
      studentEmail: request.studentEmail,
      program: request.program,
    });

    const result = await sendEmail({
      to: processorEmail,
      subject,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              ${body.replace(/\n/g, '<br>')}
            </div>
          </body>
        </html>
      `,
      textBody: body,
    });

    return result;
  } catch (error) {
    console.error('Error sending Academic correction notification:', error);
    return { success: false, message: error.message };
  }
}

