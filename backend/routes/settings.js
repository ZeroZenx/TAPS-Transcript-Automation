import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { clearEmailSettingsCache } from '../lib/email.js';
import { createAuditLog } from '../lib/audit.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// All settings routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Get settings
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'settings',
          fromName: 'TAPS System',
          enableAlerts: true,
          enableReminders: true,
        },
      });
    }

    // Don't send sensitive password/secret data to frontend
    const safeSettings = {
      ...settings,
      emailPassword: settings.emailPassword ? '***ENCRYPTED***' : null,
      clientSecret: settings.clientSecret ? '***ENCRYPTED***' : null,
    };

    res.json({ settings: safeSettings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.patch('/', async (req, res) => {
  try {
    const {
      emailAccount,
      emailPassword,
      tenantId,
      clientId,
      clientSecret,
      useClientCredentials,
      fromName,
      replyTo,
      enableAlerts,
      enableReminders,
      libraryEmail,
      bursarEmail,
      academicEmail,
      libraryQueueTemplate,
      libraryQueueSubject,
      bursarQueueTemplate,
      bursarQueueSubject,
      academicQueueTemplate,
      academicQueueSubject,
      academicCompletedTemplate,
      academicCompletedSubject,
      academicCorrectionTemplate,
      academicCorrectionSubject,
      completionTemplate,
      completionSubject,
      cancellationTemplate,
      cancellationSubject,
      reminderHoursLibrary,
      reminderHoursBursar,
      reminderHoursAcademic,
      enableReminderLibrary,
      enableReminderBursar,
      enableReminderAcademic,
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
    });

    // Get current settings
    const currentSettings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    // Prepare update data
    const updateData = {};

    if (emailAccount !== undefined) updateData.emailAccount = emailAccount || null;
    if (emailPassword !== undefined && emailPassword && emailPassword !== '***ENCRYPTED***') {
      // Only update password if a new value is provided (not the masked version)
      // In production, you should encrypt this properly
      updateData.emailPassword = emailPassword;
    }
    if (tenantId !== undefined) updateData.tenantId = tenantId || null;
    if (clientId !== undefined) updateData.clientId = clientId || null;
    if (clientSecret !== undefined && clientSecret && clientSecret !== '***ENCRYPTED***') {
      // Only update secret if a new value is provided
      updateData.clientSecret = clientSecret;
    }
    if (useClientCredentials !== undefined) updateData.useClientCredentials = useClientCredentials;
    if (fromName !== undefined) updateData.fromName = fromName || null;
    if (replyTo !== undefined) updateData.replyTo = replyTo || null;
    if (enableAlerts !== undefined) updateData.enableAlerts = enableAlerts;
    if (enableReminders !== undefined) updateData.enableReminders = enableReminders;
    if (libraryEmail !== undefined) updateData.libraryEmail = libraryEmail || null;
    if (bursarEmail !== undefined) updateData.bursarEmail = bursarEmail || null;
    if (academicEmail !== undefined) updateData.academicEmail = academicEmail || null;
    if (libraryQueueTemplate !== undefined) updateData.libraryQueueTemplate = libraryQueueTemplate || null;
    if (libraryQueueSubject !== undefined) updateData.libraryQueueSubject = libraryQueueSubject || null;
    if (bursarQueueTemplate !== undefined) updateData.bursarQueueTemplate = bursarQueueTemplate || null;
    if (bursarQueueSubject !== undefined) updateData.bursarQueueSubject = bursarQueueSubject || null;
    if (academicQueueTemplate !== undefined) updateData.academicQueueTemplate = academicQueueTemplate || null;
    if (academicQueueSubject !== undefined) updateData.academicQueueSubject = academicQueueSubject || null;
    if (academicCompletedTemplate !== undefined) updateData.academicCompletedTemplate = academicCompletedTemplate || null;
    if (academicCompletedSubject !== undefined) updateData.academicCompletedSubject = academicCompletedSubject || null;
    if (academicCorrectionTemplate !== undefined) updateData.academicCorrectionTemplate = academicCorrectionTemplate || null;
    if (academicCorrectionSubject !== undefined) updateData.academicCorrectionSubject = academicCorrectionSubject || null;
    if (completionTemplate !== undefined) updateData.completionTemplate = completionTemplate || null;
    if (completionSubject !== undefined) updateData.completionSubject = completionSubject || null;
    if (cancellationTemplate !== undefined) updateData.cancellationTemplate = cancellationTemplate || null;
    if (cancellationSubject !== undefined) updateData.cancellationSubject = cancellationSubject || null;
    if (reminderHoursLibrary !== undefined) updateData.reminderHoursLibrary = reminderHoursLibrary || 48;
    if (reminderHoursBursar !== undefined) updateData.reminderHoursBursar = reminderHoursBursar || 48;
    if (reminderHoursAcademic !== undefined) updateData.reminderHoursAcademic = reminderHoursAcademic || 48;
    if (enableReminderLibrary !== undefined) updateData.enableReminderLibrary = enableReminderLibrary;
    if (enableReminderBursar !== undefined) updateData.enableReminderBursar = enableReminderBursar;
    if (enableReminderAcademic !== undefined) updateData.enableReminderAcademic = enableReminderAcademic;

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: { id: 'settings' },
      update: updateData,
      create: {
        id: 'settings',
        ...updateData,
        fromName: fromName || 'TAPS System',
        enableAlerts: enableAlerts !== undefined ? enableAlerts : true,
        enableReminders: enableReminders !== undefined ? enableReminders : true,
      },
    });

    // Clear email settings cache so new settings are used
    clearEmailSettingsCache();

    // Log settings update
    await createAuditLog(
      'SETTINGS_UPDATED',
      {
        updatedFields: Object.keys(updateData),
        updatedBy: user?.email,
      },
      user?.id
    );

    // Don't send sensitive data back
    const safeSettings = {
      ...settings,
      emailPassword: settings.emailPassword ? '***ENCRYPTED***' : null,
      clientSecret: settings.clientSecret ? '***ENCRYPTED***' : null,
    };

    res.json({ settings: safeSettings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    const { sendEmail } = await import('../lib/email.js');
    
    const result = await sendEmail({
      to: testEmail,
      subject: 'TAPS System - Test Email',
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">TAPS System Test Email</h2>
              <p>This is a test email from the TAPS - Transcript Automation and Processing Service.</p>
              <p>If you received this email, your email configuration is working correctly!</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                This is an automated test message. Please do not reply to this email.
              </p>
            </div>
          </body>
        </html>
      `,
      textBody: 'This is a test email from the TAPS System. If you received this, your email configuration is working correctly!',
    });

    if (result.success) {
      res.json({ message: 'Test email sent successfully', success: true });
    } else {
      res.status(400).json({ error: result.message || 'Failed to send test email', success: false });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

// Send conversation message
router.post('/send-message', authenticateToken, async (req, res) => {
  try {
    const { requestId, message, recipient } = req.body;

    if (!requestId || !message || !recipient) {
      return res.status(400).json({ error: 'Request ID, message, and recipient are required' });
    }

    // Get settings to find recipient email
    const config = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!config || !config.enableAlerts) {
      return res.status(400).json({ error: 'Email alerts are disabled' });
    }

    // Get request details
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Determine recipient email based on selection
    let recipientEmail = null;
    let recipientName = '';

    switch (recipient.toLowerCase()) {
      case 'library':
        recipientEmail = config.libraryEmail;
        recipientName = 'Library Department';
        break;
      case 'bursar':
        recipientEmail = config.bursarEmail;
        recipientName = 'Bursar Department';
        break;
      case 'academic':
        recipientEmail = config.academicEmail;
        recipientName = 'Academic Department';
        break;
      case 'admin':
        // For admin, use the configured email account or find an admin user
        recipientEmail = config.emailAccount;
        recipientName = 'Administrator';
        break;
      default:
        return res.status(400).json({ error: 'Invalid recipient' });
    }

    if (!recipientEmail) {
      return res.status(400).json({ 
        error: `${recipientName} email address not configured. Please configure it in Settings.` 
      });
    }

    // Get user who is sending
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
    });

    // Use default conversation template
    const template = `
      <p>You have received a new message regarding transcript request <strong>{{REQUEST_ID}}</strong>.</p>
      <p><strong>Student:</strong> {{STUDENT_EMAIL}}</p>
      <p><strong>Student ID:</strong> {{STUDENT_ID}}</p>
      <p><strong>Message:</strong></p>
      <p>{{MESSAGE}}</p>
      <p><strong>From:</strong> {{SENDER_NAME}}</p>
    `;

    // Replace template variables
    const htmlBody = template
      .replace(/{{REQUEST_ID}}/g, request.requestId || request.id.substring(0, 8))
      .replace(/{{STUDENT_EMAIL}}/g, request.studentEmail)
      .replace(/{{STUDENT_ID}}/g, request.studentId || 'N/A')
      .replace(/{{MESSAGE}}/g, message.replace(/\n/g, '<br>'))
      .replace(/{{SENDER_NAME}}/g, user?.name || req.user.email);

    const { sendEmail } = await import('../lib/email.js');

    const result = await sendEmail({
      to: recipientEmail,
      subject: `TAPS System - Message regarding Request ${request.requestId || request.id.substring(0, 8)}`,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">New Message from TAPS System</h2>
              ${htmlBody}
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                This is an automated message from the TAPS - Transcript Automation and Processing Service.
              </p>
            </div>
          </body>
        </html>
      `,
      textBody: `You have received a new message regarding transcript request ${request.requestId || request.id.substring(0, 8)}.\n\nStudent: ${request.studentEmail}\nStudent ID: ${request.studentId || 'N/A'}\n\nMessage:\n${message}\n\nFrom: ${user?.name || req.user.email}`,
    });

    if (result.success) {
      // Log the message
      await createAuditLog(
        'MESSAGE_SENT',
        {
          requestId: request.requestId || request.id,
          recipient,
          recipientEmail,
          message,
        },
        user?.id,
        requestId
      );

      res.json({ 
        message: 'Message sent successfully',
        success: true,
        recipientEmail,
      });
    } else {
      res.status(400).json({ 
        error: result.message || 'Failed to send message',
        success: false,
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

export default router;

