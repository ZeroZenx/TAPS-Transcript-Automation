/**
 * Parse email string(s) into an array of email addresses
 * Supports:
 * - Single email: "user@example.com"
 * - Comma-separated: "user1@example.com, user2@example.com"
 * - Array: ["user1@example.com", "user2@example.com"]
 * - JSON string: '["user1@example.com", "user2@example.com"]'
 */
export function parseEmails(emailInput) {
  if (!emailInput) return [];
  
  // If already an array, return it
  if (Array.isArray(emailInput)) {
    return emailInput.map(e => e.trim().toLowerCase()).filter(e => e);
  }
  
  // If it's a JSON string, parse it
  if (typeof emailInput === 'string' && emailInput.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(emailInput);
      if (Array.isArray(parsed)) {
        return parsed.map(e => String(e).trim().toLowerCase()).filter(e => e);
      }
    } catch (e) {
      // Not valid JSON, continue with comma-separated parsing
    }
  }
  
  // Treat as comma-separated string
  return emailInput
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e && e.includes('@'));
}

/**
 * Format email array into comma-separated string for storage
 */
export function formatEmailsForStorage(emails) {
  if (!emails || emails.length === 0) return null;
  if (Array.isArray(emails)) {
    return emails.filter(e => e && e.trim()).join(', ');
  }
  return String(emails).trim() || null;
}

/**
 * Validate email addresses
 */
export function validateEmails(emails) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const parsed = parseEmails(emails);
  
  const invalid = parsed.filter(email => !emailRegex.test(email));
  if (invalid.length > 0) {
    return {
      valid: false,
      invalid: invalid,
      message: `Invalid email addresses: ${invalid.join(', ')}`,
    };
  }
  
  return {
    valid: true,
    emails: parsed,
  };
}

export default {
  parseEmails,
  formatEmailsForStorage,
  validateEmails,
};

