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
 * Send queue notification email to Library
 */
export async function sendLibraryQueueNotification(request) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.libraryEmail) {
      console.log('Library queue notification disabled or email not configured');
      return { success: false, message: 'Library email not configured' };
    }

    const subjectTemplate = settings.libraryQueueSubject || 'Library Department Review Pending - {{REQUEST_ID}}';
    const bodyTemplate = settings.libraryQueueTemplate || 'Dear colleagues,\n\nA transcript request has been submitted by {{STUDENT_NAME}} {{STUDENT_ID}}.\n\nPlease indicate if {{STUDENT_NAME}} is cleared for processing.\n\nRegards,';

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
      to: settings.libraryEmail,
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
    console.error('Error sending Library queue notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send queue notification email to Bursar
 */
export async function sendBursarQueueNotification(request) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.bursarEmail) {
      console.log('Bursar queue notification disabled or email not configured');
      return { success: false, message: 'Bursar email not configured' };
    }

    const subjectTemplate = settings.bursarQueueSubject || 'Bursar Department Review Pending - {{REQUEST_ID}}';
    const bodyTemplate = settings.bursarQueueTemplate || 'Dear colleagues,\n\nA transcript request has been submitted by {{STUDENT_NAME}} {{STUDENT_ID}}.\n\nPlease indicate if {{STUDENT_NAME}} is cleared for processing.\n\nRegards,';

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
      to: settings.bursarEmail,
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
    console.error('Error sending Bursar queue notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send queue notification email to Academic department
 */
export async function sendAcademicQueueNotification(request) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.academicEmail) {
      console.log('Academic queue notification disabled or email not configured');
      return { success: false, message: 'Academic email not configured' };
    }

    const subjectTemplate = settings.academicQueueSubject || 'Academic corrections required: {{REQUEST_ID}}';
    const bodyTemplate = settings.academicQueueTemplate || 'Dear Academic Department,\n\n{{STUDENT_NAME}} {{STUDENT_ID}} has submitted a request for a transcript. Based on our review of the student\'s academic history, we noticed missing details for the following:\n\n\n\nPlease submit the updated GPA Guide and the relevant documents as per the details provided above.\n\nThese submissions must be uploaded by 3 working days from notification date.\n\nRegards,';

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
      to: settings.academicEmail,
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
    console.error('Error sending Academic queue notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send reminder emails to Library and Bursar if they haven't responded within the configured hours
 */
export async function sendReminderEmails() {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableReminders) {
      console.log('Reminders disabled');
      return { success: false, message: 'Reminders disabled' };
    }

    const reminderHoursLibrary = settings.reminderHoursLibrary || 48;
    const reminderHoursBursar = settings.reminderHoursBursar || 48;
    const reminderHoursAcademic = settings.reminderHoursAcademic || 48;
    const cutoffTimeLibrary = new Date(Date.now() - (reminderHoursLibrary * 60 * 60 * 1000));
    const cutoffTimeBursar = new Date(Date.now() - (reminderHoursBursar * 60 * 60 * 1000));
    const cutoffTimeAcademic = new Date(Date.now() - (reminderHoursAcademic * 60 * 60 * 1000));

    // Find requests where Library hasn't responded
    if (settings.enableReminderLibrary && settings.libraryEmail) {
      const libraryPendingRequests = await prisma.request.findMany({
        where: {
          libraryStatus: 'PENDING',
          created: {
            lte: cutoffTimeLibrary,
          },
        },
      });

      for (const request of libraryPendingRequests) {
        // Check if we've already sent a reminder recently (avoid spamming)
        const recentReminder = await prisma.auditLog.findFirst({
          where: {
            requestId: request.id,
            action: 'LIBRARY_REMINDER_SENT',
            timestamp: {
              gte: new Date(Date.now() - (24 * 60 * 60 * 1000)), // Don't send more than once per day
            },
          },
        });

        if (!recentReminder) {
          const result = await sendLibraryQueueNotification(request);
          if (result.success) {
            await prisma.auditLog.create({
              data: {
                action: 'LIBRARY_REMINDER_SENT',
                requestId: request.id,
                details: JSON.stringify({ reminderHours: reminderHoursLibrary }),
              },
            });
            console.log(`Reminder sent to Library for request ${request.requestId}`);
          }
        }
      }
    }

    // Find requests where Bursar hasn't responded
    if (settings.enableReminderBursar && settings.bursarEmail) {
      const bursarPendingRequests = await prisma.request.findMany({
        where: {
          bursarStatus: 'PENDING',
          created: {
            lte: cutoffTimeBursar,
          },
        },
      });

      for (const request of bursarPendingRequests) {
        // Check if we've already sent a reminder recently
        const recentReminder = await prisma.auditLog.findFirst({
          where: {
            requestId: request.id,
            action: 'BURSAR_REMINDER_SENT',
            timestamp: {
              gte: new Date(Date.now() - (24 * 60 * 60 * 1000)), // Don't send more than once per day
            },
          },
        });

        if (!recentReminder) {
          const result = await sendBursarQueueNotification(request);
          if (result.success) {
            await prisma.auditLog.create({
              data: {
                action: 'BURSAR_REMINDER_SENT',
                requestId: request.id,
                details: JSON.stringify({ reminderHours: reminderHoursBursar }),
              },
            });
            console.log(`Reminder sent to Bursar for request ${request.requestId}`);
          }
        }
      }
    }

    // Find requests where Academic hasn't responded
    // Only send reminders for requests where both Library and Bursar have confirmed
    if (settings.enableReminderAcademic && settings.academicEmail) {
      // First, get requests where Academic status is PENDING and both Library and Bursar have confirmed
      const academicEligibleRequests = await prisma.request.findMany({
        where: {
          academicStatus: 'PENDING',
          libraryStatus: { not: 'PENDING' }, // Library has confirmed
          bursarStatus: { not: 'PENDING' }, // Bursar has confirmed
        },
      });

      for (const request of academicEligibleRequests) {
        // Check when Academic was first notified (when queue notification was sent)
        const academicNotification = await prisma.auditLog.findFirst({
          where: {
            requestId: request.id,
            action: 'ACADEMIC_QUEUE_NOTIFICATION_SENT',
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        // Only send reminder if Academic was notified more than reminderHoursAcademic ago
        if (academicNotification && academicNotification.timestamp <= cutoffTimeAcademic) {
          // Check if we've already sent a reminder recently
          const recentReminder = await prisma.auditLog.findFirst({
            where: {
              requestId: request.id,
              action: 'ACADEMIC_REMINDER_SENT',
              timestamp: {
                gte: new Date(Date.now() - (24 * 60 * 60 * 1000)), // Don't send more than once per day
              },
            },
          });

          if (!recentReminder) {
            const result = await sendAcademicQueueNotification(request);
            if (result.success) {
              await prisma.auditLog.create({
                data: {
                  action: 'ACADEMIC_REMINDER_SENT',
                  requestId: request.id,
                  details: JSON.stringify({ reminderHours: reminderHoursAcademic }),
                },
              });
              console.log(`Reminder sent to Academic for request ${request.requestId}`);
            }
          }
        }
      }
    }

    return { success: true, message: 'Reminders processed' };
  } catch (error) {
    console.error('Error sending reminder emails:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Check if Library and Bursar have both confirmed, and send Academic notification if needed
 */
export async function checkAndNotifyAcademic(request) {
  try {
    // Only proceed if both Library and Bursar have confirmed (not PENDING)
    if (request.libraryStatus && request.libraryStatus !== 'PENDING' &&
        request.bursarStatus && request.bursarStatus !== 'PENDING') {
      
      // Check if we've already sent the Academic notification
      const existingNotification = await prisma.auditLog.findFirst({
        where: {
          requestId: request.id,
          action: 'ACADEMIC_QUEUE_NOTIFICATION_SENT',
        },
      });

      if (!existingNotification && request.academicStatus === 'PENDING') {
        const result = await sendAcademicQueueNotification(request);
        
        if (result.success) {
          await prisma.auditLog.create({
            data: {
              action: 'ACADEMIC_QUEUE_NOTIFICATION_SENT',
              requestId: request.id,
              details: JSON.stringify({ 
                libraryStatus: request.libraryStatus,
                bursarStatus: request.bursarStatus,
              }),
            },
          });
          console.log(`Academic notification sent for request ${request.requestId}`);
        }
        
        return result;
      }
    }
    
    return { success: false, message: 'Not ready for Academic notification' };
  } catch (error) {
    console.error('Error checking and notifying Academic:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification to Bursar when Library status changes (e.g., to APPROVED or AWAITING_PAYMENT)
 */
export async function sendLibraryStatusChangeNotification(request, oldStatus, newStatus) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.bursarEmail) {
      console.log('Library status change notification disabled or Bursar email not configured');
      return { success: false, message: 'Bursar email not configured' };
    }

    // Only notify if status changed from PENDING to something else
    if (oldStatus !== 'PENDING' || newStatus === 'PENDING') {
      return { success: false, message: 'No notification needed' };
    }

    const libraryDueAmount = request.libraryDeptDueAmount || null;
    const libraryDueDetails = request.libraryDeptDueDetails || null;

    const subject = `Library Status Update - Request ${request.requestId || request.id.substring(0, 8)}`;
    let body = `Dear Bursar Department,\n\nLibrary has updated the status for transcript request ${request.requestId || request.id.substring(0, 8)}.\n\nStudent: ${request.requestor || 'N/A'}\nStudent ID: ${request.studentId || 'N/A'}\n\nPrevious Status: ${oldStatus}\nNew Status: ${newStatus}\n`;
    
    if (libraryDueAmount) {
      body += `\nLibrary Dept Due Amount: ${libraryDueAmount}\n`;
    }
    if (libraryDueDetails) {
      body += `Library Dept Due Details: ${libraryDueDetails}\n`;
    }
    
    body += `\nPlease review and update the Bursar status accordingly.\n\nRegards,\nTAPS System`;

    let htmlBodyContent = `
      <p>Dear Bursar Department,</p>
      <p>Library has updated the status for transcript request <strong>${request.requestId || request.id.substring(0, 8)}</strong>.</p>
      <p><strong>Student:</strong> ${request.requestor || 'N/A'}<br>
      <strong>Student ID:</strong> ${request.studentId || 'N/A'}</p>
      <p><strong>Previous Status:</strong> ${oldStatus || 'N/A'}<br>
      <strong>New Status:</strong> ${newStatus}</p>`;
    
    if (libraryDueAmount) {
      htmlBodyContent += `<p><strong>Library Dept Due Amount:</strong> ${libraryDueAmount}</p>`;
    }
    if (libraryDueDetails) {
      htmlBodyContent += `<p><strong>Library Dept Due Details:</strong> ${libraryDueDetails}</p>`;
    }
    
    htmlBodyContent += `<p>Please review and update the Bursar status accordingly.</p>`;

    const result = await sendEmail({
      to: settings.bursarEmail,
      subject,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Library Status Update</h2>
              ${htmlBodyContent}
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                This is an automated message from the TAPS - Transcript Automation and Processing Service.
              </p>
            </div>
          </body>
        </html>
      `,
      textBody: body,
    });

    return result;
  } catch (error) {
    console.error('Error sending Library status change notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification to TAPS system email when Bursar status changes
 */
export async function sendBursarStatusChangeNotification(request, oldStatus, newStatus) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.emailAccount) {
      console.log('Bursar status change notification disabled or TAPS email not configured');
      return { success: false, message: 'TAPS email not configured' };
    }

    // Notify TAPS of any Bursar status change
    if (oldStatus === newStatus) {
      return { success: false, message: 'No status change detected' };
    }

    const bursarDueAmount = request.officeOfBursarDueAmount || null;
    const bursarDueDetails = request.officeOfBursarDueDetails || null;
    
    const subject = `Bursar Status Update - Request ${request.requestId || request.id.substring(0, 8)}`;
    let body = `Dear TAPS System Administrator,\n\nBursar has updated the status for transcript request ${request.requestId || request.id.substring(0, 8)}.\n\nStudent: ${request.requestor || 'N/A'}\nStudent ID: ${request.studentId || 'N/A'}\n\nPrevious Status: ${oldStatus || 'N/A'}\nNew Status: ${newStatus}\n`;
    
    if (bursarDueAmount) {
      body += `\nOffice of Bursar Due Amount: ${bursarDueAmount}\n`;
    }
    if (bursarDueDetails) {
      body += `Office of Bursar Due Details: ${bursarDueDetails}\n`;
    }
    
    body += `\nRegards,\nTAPS System`;

    let htmlBodyContent = `
      <p>Dear TAPS System Administrator,</p>
      <p>Bursar has updated the status for transcript request <strong>${request.requestId || request.id.substring(0, 8)}</strong>.</p>
      <p><strong>Student:</strong> ${request.requestor || 'N/A'}<br>
      <strong>Student ID:</strong> ${request.studentId || 'N/A'}</p>
      <p><strong>Previous Status:</strong> ${oldStatus || 'N/A'}<br>
      <strong>New Status:</strong> ${newStatus}</p>`;
    
    if (bursarDueAmount) {
      htmlBodyContent += `<p><strong>Office of Bursar Due Amount:</strong> ${bursarDueAmount}</p>`;
    }
    if (bursarDueDetails) {
      htmlBodyContent += `<p><strong>Office of Bursar Due Details:</strong> ${bursarDueDetails}</p>`;
    }

    const result = await sendEmail({
      to: settings.emailAccount,
      subject,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Bursar Status Update</h2>
              ${htmlBodyContent}
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                This is an automated message from the TAPS - Transcript Automation and Processing Service.
              </p>
            </div>
          </body>
        </html>
      `,
      textBody: body,
    });

    return result;
  } catch (error) {
    console.error('Error sending Bursar status change notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification to TAPS system email when Library status changes
 */
export async function sendLibraryStatusChangeToTAPS(request, oldStatus, newStatus) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.emailAccount) {
      console.log('Library status change notification to TAPS disabled or email not configured');
      return { success: false, message: 'TAPS email not configured' };
    }

    // Notify TAPS of any Library status change
    if (oldStatus === newStatus) {
      return { success: false, message: 'No status change detected' };
    }

    const libraryDueAmount = request.libraryDeptDueAmount || null;
    const libraryDueDetails = request.libraryDeptDueDetails || null;
    
    const subject = `Library Status Update - Request ${request.requestId || request.id.substring(0, 8)}`;
    let body = `Dear TAPS System Administrator,\n\nLibrary has updated the status for transcript request ${request.requestId || request.id.substring(0, 8)}.\n\nStudent: ${request.requestor || 'N/A'}\nStudent ID: ${request.studentId || 'N/A'}\n\nPrevious Status: ${oldStatus || 'N/A'}\nNew Status: ${newStatus}\n`;
    
    if (libraryDueAmount) {
      body += `\nLibrary Dept Due Amount: ${libraryDueAmount}\n`;
    }
    if (libraryDueDetails) {
      body += `Library Dept Due Details: ${libraryDueDetails}\n`;
    }
    
    body += `\nRegards,\nTAPS System`;

    let htmlBodyContent = `
      <p>Dear TAPS System Administrator,</p>
      <p>Library has updated the status for transcript request <strong>${request.requestId || request.id.substring(0, 8)}</strong>.</p>
      <p><strong>Student:</strong> ${request.requestor || 'N/A'}<br>
      <strong>Student ID:</strong> ${request.studentId || 'N/A'}</p>
      <p><strong>Previous Status:</strong> ${oldStatus || 'N/A'}<br>
      <strong>New Status:</strong> ${newStatus}</p>`;
    
    if (libraryDueAmount) {
      htmlBodyContent += `<p><strong>Library Dept Due Amount:</strong> ${libraryDueAmount}</p>`;
    }
    if (libraryDueDetails) {
      htmlBodyContent += `<p><strong>Library Dept Due Details:</strong> ${libraryDueDetails}</p>`;
    }

    const result = await sendEmail({
      to: settings.emailAccount,
      subject,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Library Status Update</h2>
              ${htmlBodyContent}
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                This is an automated message from the TAPS - Transcript Automation and Processing Service.
              </p>
            </div>
          </body>
        </html>
      `,
      textBody: body,
    });

    return result;
  } catch (error) {
    console.error('Error sending Library status change notification to TAPS:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification to TAPS system email when Academic status changes
 */
export async function sendAcademicStatusChangeToTAPS(request, oldStatus, newStatus) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.emailAccount) {
      console.log('Academic status change notification to TAPS disabled or email not configured');
      return { success: false, message: 'TAPS email not configured' };
    }

    // Notify TAPS of any Academic status change
    if (oldStatus === newStatus) {
      return { success: false, message: 'No status change detected' };
    }

    const subject = `Academic Status Update - Request ${request.requestId || request.id.substring(0, 8)}`;
    const body = `Dear TAPS System Administrator,\n\nAcademic department has updated the status for transcript request ${request.requestId || request.id.substring(0, 8)}.\n\nStudent: ${request.requestor || 'N/A'}\nStudent ID: ${request.studentId || 'N/A'}\n\nPrevious Status: ${oldStatus || 'N/A'}\nNew Status: ${newStatus}\n\nRegards,\nTAPS System`;

    const result = await sendEmail({
      to: settings.emailAccount,
      subject,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Academic Status Update</h2>
              <p>Dear TAPS System Administrator,</p>
              <p>Academic department has updated the status for transcript request <strong>${request.requestId || request.id.substring(0, 8)}</strong>.</p>
              <p><strong>Student:</strong> ${request.requestor || 'N/A'}<br>
              <strong>Student ID:</strong> ${request.studentId || 'N/A'}</p>
              <p><strong>Previous Status:</strong> ${oldStatus || 'N/A'}<br>
              <strong>New Status:</strong> ${newStatus}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                This is an automated message from the TAPS - Transcript Automation and Processing Service.
              </p>
            </div>
          </body>
        </html>
      `,
      textBody: body,
    });

    return result;
  } catch (error) {
    console.error('Error sending Academic status change notification to TAPS:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification to TAPS system email when general request status changes
 */
export async function sendRequestStatusChangeToTAPS(request, oldStatus, newStatus) {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enableAlerts || !settings.emailAccount) {
      console.log('Request status change notification to TAPS disabled or email not configured');
      return { success: false, message: 'TAPS email not configured' };
    }

    // Notify TAPS of any general request status change
    if (oldStatus === newStatus) {
      return { success: false, message: 'No status change detected' };
    }

    const subject = `Request Status Update - Request ${request.requestId || request.id.substring(0, 8)}`;
    const body = `Dear TAPS System Administrator,\n\nThe status has been updated for transcript request ${request.requestId || request.id.substring(0, 8)}.\n\nStudent: ${request.requestor || 'N/A'}\nStudent ID: ${request.studentId || 'N/A'}\n\nPrevious Status: ${oldStatus || 'N/A'}\nNew Status: ${newStatus}\n\nRegards,\nTAPS System`;

    const result = await sendEmail({
      to: settings.emailAccount,
      subject,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Request Status Update</h2>
              <p>Dear TAPS System Administrator,</p>
              <p>The status has been updated for transcript request <strong>${request.requestId || request.id.substring(0, 8)}</strong>.</p>
              <p><strong>Student:</strong> ${request.requestor || 'N/A'}<br>
              <strong>Student ID:</strong> ${request.studentId || 'N/A'}</p>
              <p><strong>Previous Status:</strong> ${oldStatus || 'N/A'}<br>
              <strong>New Status:</strong> ${newStatus}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                This is an automated message from the TAPS - Transcript Automation and Processing Service.
              </p>
            </div>
          </body>
        </html>
      `,
      textBody: body,
    });

    return result;
  } catch (error) {
    console.error('Error sending Request status change notification to TAPS:', error);
    return { success: false, message: error.message };
  }
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
      requestId: request.requestId || request.id?.substring(0, 8) || 'N/A',
      studentName: request.requestor || request.user?.name || 'Student',
      studentId: request.studentId || 'N/A',
      studentEmail: request.studentEmail || 'N/A',
      program: request.program || 'N/A',
    });
    const body = replaceTemplateVariables(bodyTemplate, {
      requestId: request.requestId || request.id?.substring(0, 8) || 'N/A',
      studentName: request.requestor || request.user?.name || 'Student',
      studentId: request.studentId || 'N/A',
      studentEmail: request.studentEmail || 'N/A',
      program: request.program || 'N/A',
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
      requestId: request.requestId || request.id?.substring(0, 8) || 'N/A',
      studentName: request.requestor || request.user?.name || 'Student',
      studentId: request.studentId || 'N/A',
      studentEmail: request.studentEmail || 'N/A',
      program: request.program || 'N/A',
    });
    const body = replaceTemplateVariables(bodyTemplate, {
      requestId: request.requestId || request.id?.substring(0, 8) || 'N/A',
      studentName: request.requestor || request.user?.name || 'Student',
      studentId: request.studentId || 'N/A',
      studentEmail: request.studentEmail || 'N/A',
      program: request.program || 'N/A',
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

