/**
 * Script to send reminder emails to Library and Bursar departments
 * This should be run periodically (e.g., via cron job every hour)
 * 
 * Usage:
 * node backend/scripts/send-reminders.js
 * 
 * Or set up a cron job:
 * 0 * * * * cd /path/to/app && node backend/scripts/send-reminders.js
 */

import { sendReminderEmails } from '../lib/queueNotifications.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Starting reminder email process...');
    const result = await sendReminderEmails();
    
    if (result.success) {
      console.log('Reminder emails processed successfully');
      process.exit(0);
    } else {
      console.error('Failed to process reminder emails:', result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in reminder email script:', error);
    process.exit(1);
  }
}

main();

