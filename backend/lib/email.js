import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import prisma from './prisma.js';

let emailClient = null;
let settings = null;

/**
 * Get email settings from database
 */
export const getEmailSettings = async () => {
  try {
    if (!settings) {
      settings = await prisma.settings.findUnique({
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
    }
    return settings;
  } catch (error) {
    console.error('Error getting email settings:', error);
    return null;
  }
};

/**
 * Initialize Microsoft Graph client for sending emails
 */
export const getEmailClient = async () => {
  if (emailClient) return emailClient;

  const config = await getEmailSettings();
  if (!config || !config.enableAlerts) {
    console.warn('Email alerts are disabled or not configured');
    return null;
  }

  try {
    if (config.useClientCredentials && config.tenantId && config.clientId && config.clientSecret) {
      // Use Client Credentials flow (service principal)
      const credential = new ClientSecretCredential(
        config.tenantId,
        config.clientId,
        config.clientSecret
      );

      // Create authentication provider function
      const getAccessToken = async () => {
        const tokenResponse = await credential.getToken([
          'https://graph.microsoft.com/.default'
        ]);
        return tokenResponse.token;
      };

      emailClient = Client.init({
        authProvider: {
          getAccessToken
        }
      });
    } else if (config.emailAccount && config.emailPassword) {
      // For development/testing - using username/password (not recommended for production)
      // In production, use OAuth2 or client credentials
      console.warn('Username/password authentication is not recommended for production');
      // This would require implementing OAuth2 flow for user credentials
      return null;
    } else {
      console.warn('Email not configured - missing credentials');
      return null;
    }

    return emailClient;
  } catch (error) {
    console.error('Error initializing email client:', error);
    return null;
  }
};

/**
 * Send an email using Microsoft Graph API
 */
export const sendEmail = async ({
  to,
  subject,
  htmlBody,
  textBody,
  cc = null,
  bcc = null,
  attachments = [],
}) => {
  try {
    const config = await getEmailSettings();
    if (!config || !config.enableAlerts) {
      console.log('Email alerts disabled - email not sent');
      return { success: false, message: 'Email alerts are disabled' };
    }

    const client = await getEmailClient();
    if (!client) {
      console.error('Email client not initialized');
      return { success: false, message: 'Email client not configured' };
    }

    const fromEmail = config.emailAccount;
    const fromName = config.fromName || 'TAPS System';
    const replyTo = config.replyTo || fromEmail;

    if (!fromEmail) {
      return { success: false, message: 'Email account not configured' };
    }

    // Build message
    const message = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlBody || textBody,
        },
        from: {
          emailAddress: {
            address: fromEmail,
            name: fromName,
          },
        },
        replyTo: replyTo ? [
          {
            emailAddress: {
              address: replyTo,
              name: fromName,
            },
          },
        ] : undefined,
        toRecipients: Array.isArray(to) ? to.map(email => ({
          emailAddress: { address: email },
        })) : [{ emailAddress: { address: to } }],
        ccRecipients: cc ? (Array.isArray(cc) ? cc.map(email => ({
          emailAddress: { address: email },
        })) : [{ emailAddress: { address: cc } }]) : undefined,
        bccRecipients: bcc ? (Array.isArray(bcc) ? bcc.map(email => ({
          emailAddress: { address: email },
        })) : [{ emailAddress: { address: bcc } }]) : undefined,
        attachments: attachments.length > 0 ? attachments.map((att, index) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.name || `attachment-${index}`,
          contentType: att.contentType || 'application/octet-stream',
          contentBytes: att.contentBase64,
        })) : undefined,
      },
      saveToSentItems: true,
    };

    // Send email using Microsoft Graph API
    await client.api(`/users/${fromEmail}/sendMail`).post(message);

    console.log(`Email sent successfully to: ${Array.isArray(to) ? to.join(', ') : to}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: error.message || 'Failed to send email',
      error: error,
    };
  }
};

/**
 * Send alert email (e.g., status change, new request)
 */
export const sendAlert = async ({ to, subject, message, requestId = null }) => {
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">TAPS System Alert</h2>
          <p>${message}</p>
          ${requestId ? `<p><strong>Request ID:</strong> ${requestId}</p>` : ''}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">
            This is an automated message from the TAPS - Transcript Automation and Processing Service.
            Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: subject || 'TAPS System Alert',
    htmlBody,
    textBody: message,
  });
};

/**
 * Send reminder email
 */
export const sendReminder = async ({ to, subject, message, requestId = null, dueDate = null }) => {
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">TAPS System Reminder</h2>
          <p>${message}</p>
          ${requestId ? `<p><strong>Request ID:</strong> ${requestId}</p>` : ''}
          ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">
            This is an automated reminder from the TAPS - Transcript Automation and Processing Service.
            Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: subject || 'TAPS System Reminder',
    htmlBody,
    textBody: message,
  });
};

/**
 * Clear cached settings (call this when settings are updated)
 */
export const clearEmailSettingsCache = () => {
  settings = null;
  emailClient = null;
};

