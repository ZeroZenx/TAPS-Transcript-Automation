import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../lib/email.js';

const router = express.Router();

// All scheduled report routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

/**
 * Get all scheduled reports
 */
router.get('/', async (req, res) => {
  try {
    const reports = await prisma.scheduledReport.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reports });
  } catch (error) {
    console.error('Get scheduled reports error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled reports' });
  }
});

/**
 * Create scheduled report
 */
router.post('/', async (req, res) => {
  try {
    const { name, reportType, frequency, dayOfWeek, dayOfMonth, recipients, filters } = req.body;

    // Calculate next run time
    const nextRun = calculateNextRun(frequency, dayOfWeek, dayOfMonth);

    const report = await prisma.scheduledReport.create({
      data: {
        name,
        reportType,
        frequency,
        dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : null,
        dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : null,
        recipients: JSON.stringify(recipients || []),
        filters: filters ? JSON.stringify(filters) : null,
        nextRun,
        enabled: true,
      },
    });

    res.json({ report });
  } catch (error) {
    console.error('Create scheduled report error:', error);
    res.status(500).json({ error: 'Failed to create scheduled report' });
  }
});

/**
 * Update scheduled report
 */
router.patch('/:id', async (req, res) => {
  try {
    const { name, frequency, dayOfWeek, dayOfMonth, recipients, filters, enabled } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (frequency !== undefined) {
      updateData.frequency = frequency;
      updateData.dayOfWeek = frequency === 'WEEKLY' ? dayOfWeek : null;
      updateData.dayOfMonth = frequency === 'MONTHLY' ? dayOfMonth : null;
      updateData.nextRun = calculateNextRun(frequency, dayOfWeek, dayOfMonth);
    }
    if (recipients !== undefined) updateData.recipients = JSON.stringify(recipients);
    if (filters !== undefined) updateData.filters = filters ? JSON.stringify(filters) : null;
    if (enabled !== undefined) updateData.enabled = enabled;

    const report = await prisma.scheduledReport.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ report });
  } catch (error) {
    console.error('Update scheduled report error:', error);
    res.status(500).json({ error: 'Failed to update scheduled report' });
  }
});

/**
 * Delete scheduled report
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.scheduledReport.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Scheduled report deleted successfully' });
  } catch (error) {
    console.error('Delete scheduled report error:', error);
    res.status(500).json({ error: 'Failed to delete scheduled report' });
  }
});

/**
 * Run scheduled report manually
 */
router.post('/:id/run', async (req, res) => {
  try {
    const report = await prisma.scheduledReport.findUnique({
      where: { id: req.params.id },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const result = await generateAndSendReport(report);

    // Update last run time
    await prisma.scheduledReport.update({
      where: { id: req.params.id },
      data: {
        lastRun: new Date(),
        nextRun: calculateNextRun(report.frequency, report.dayOfWeek, report.dayOfMonth),
      },
    });

    res.json({ message: 'Report generated and sent successfully', result });
  } catch (error) {
    console.error('Run scheduled report error:', error);
    res.status(500).json({ error: 'Failed to run scheduled report', details: error.message });
  }
});

/**
 * Process scheduled reports (for cron job)
 */
export async function processScheduledReports() {
  try {
    const now = new Date();
    
    const dueReports = await prisma.scheduledReport.findMany({
      where: {
        enabled: true,
        nextRun: { lte: now },
      },
    });

    for (const report of dueReports) {
      try {
        await generateAndSendReport(report);
        
        // Update next run time
        await prisma.scheduledReport.update({
          where: { id: report.id },
          data: {
            lastRun: new Date(),
            nextRun: calculateNextRun(report.frequency, report.dayOfWeek, report.dayOfMonth),
          },
        });
      } catch (error) {
        console.error(`Failed to process report ${report.id}:`, error);
      }
    }

    return { processed: dueReports.length };
  } catch (error) {
    console.error('Process scheduled reports error:', error);
    return { error: error.message };
  }
}

/**
 * Generate report data and send via email
 */
async function generateAndSendReport(report) {
  const filters = report.filters ? JSON.parse(report.filters) : {};
  const recipients = JSON.parse(report.recipients);

  // Generate report based on type
  let reportData = {};
  let reportHtml = '';

  if (report.reportType === 'ANALYTICS') {
    // Fetch analytics data
    const axios = (await import('axios')).default;
    const baseURL = process.env.API_URL || 'http://localhost:4000';
    
    try {
      const analyticsRes = await axios.get(`${baseURL}/api/analytics/performance`);
      reportData = analyticsRes.data;
      
      reportHtml = `
        <h2>Analytics Report - ${report.name}</h2>
        <h3>Department Performance</h3>
        <pre>${JSON.stringify(reportData, null, 2)}</pre>
      `;
    } catch (error) {
      reportHtml = `<p>Error generating analytics report: ${error.message}</p>`;
    }
  } else if (report.reportType === 'PERFORMANCE') {
    // Similar for performance reports
    reportHtml = `<h2>Performance Report - ${report.name}</h2><p>Report generated at ${new Date().toISOString()}</p>`;
  } else if (report.reportType === 'COMPLIANCE') {
    reportHtml = `<h2>Compliance Report - ${report.name}</h2><p>Report generated at ${new Date().toISOString()}</p>`;
  }

  // Send email to recipients
  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient,
        subject: `Scheduled Report: ${report.name}`,
        htmlBody: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                ${reportHtml}
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
                <p style="color: #666; font-size: 12px;">
                  This is an automated report from the TAPS - Transcript Automation and Processing Service.
                </p>
              </div>
            </body>
          </html>
        `,
        textBody: reportHtml.replace(/<[^>]*>/g, ''),
      });
    } catch (error) {
      console.error(`Failed to send report to ${recipient}:`, error);
    }
  }

  return { sent: recipients.length };
}

/**
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency, dayOfWeek, dayOfMonth) {
  const now = new Date();
  const next = new Date(now);

  if (frequency === 'DAILY') {
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0); // 8 AM
  } else if (frequency === 'WEEKLY') {
    const targetDay = dayOfWeek !== null ? dayOfWeek : 1; // Monday by default
    const currentDay = next.getDay();
    const daysUntil = (targetDay - currentDay + 7) % 7;
    next.setDate(next.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    next.setHours(8, 0, 0, 0);
  } else if (frequency === 'MONTHLY') {
    const targetDay = dayOfMonth !== null ? dayOfMonth : 1;
    next.setMonth(next.getMonth() + 1);
    next.setDate(targetDay);
    next.setHours(8, 0, 0, 0);
  }

  return next;
}

export default router;
