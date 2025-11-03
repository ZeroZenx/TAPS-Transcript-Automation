import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendReminderEmails } from '../lib/queueNotifications.js';

const router = express.Router();

// All reminder routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Manually trigger reminder emails (can be called by cron job or scheduled task)
router.post('/send', async (req, res) => {
  try {
    const result = await sendReminderEmails();
    
    if (result.success) {
      res.json({ 
        message: 'Reminder emails processed successfully',
        success: true 
      });
    } else {
      res.status(400).json({ 
        error: result.message || 'Failed to process reminder emails',
        success: false 
      });
    }
  } catch (error) {
    console.error('Send reminders error:', error);
    res.status(500).json({ error: 'Failed to send reminder emails', details: error.message });
  }
});

export default router;

