import axios from 'axios';

export const triggerPowerAutomateWebhook = async (event, data) => {
  const webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('Power Automate webhook URL not configured');
    return;
  }

  try {
    await axios.post(webhookUrl, {
      event,
      data,
      timestamp: new Date().toISOString(),
    }, {
      timeout: 5000,
    });
    console.log(`✅ Power Automate webhook triggered: ${event}`);
  } catch (error) {
    console.error(`❌ Power Automate webhook error (${event}):`, error.message);
    // Don't throw - webhook failures shouldn't break the flow
  }
};

