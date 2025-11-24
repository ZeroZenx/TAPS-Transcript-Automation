import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = {
  // Database
  DATABASE_URL: 'PostgreSQL database connection string',
  
  // JWT (required for local auth)
  JWT_SECRET: 'Secret key for JWT token signing (generate with: openssl rand -base64 32)',
  
  // Server
  PORT: 'Server port (optional, defaults to 4000)',
  NODE_ENV: 'Environment (development/production)',
  FRONTEND_URL: 'Frontend URL for CORS (optional)',
};

const optionalEnvVars = {
  // Azure AD (optional - app works with local auth)
  AZURE_TENANT_ID: 'Azure AD Tenant ID',
  AZURE_CLIENT_ID: 'Azure AD Client ID',
  AZURE_CLIENT_SECRET: 'Azure AD Client Secret',
  AZURE_AUTHORITY: 'Azure AD Authority URL',
  
  // SharePoint (optional)
  SHAREPOINT_SITE_ID: 'SharePoint Site ID',
  SHAREPOINT_DRIVE_ID: 'SharePoint Drive ID',
  
  // Power Automate (optional)
  POWER_AUTOMATE_WEBHOOK_URL: 'Power Automate webhook URL',
  
  // Logging
  LOG_LEVEL: 'Log level (error/warn/info/debug)',
};

/**
 * Validates required environment variables
 * @throws {Error} If required variables are missing
 */
export function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key] || process.env[key].trim() === '') {
      // PORT and NODE_ENV have defaults, so they're not strictly required
      if (key === 'PORT' || key === 'NODE_ENV') {
        continue;
      }
      missing.push({ key, description });
    }
  }

  // Check for insecure defaults
  if (process.env.JWT_SECRET === 'taps-secret-key-change-in-production') {
    warnings.push({
      key: 'JWT_SECRET',
      message: 'Using default JWT secret! This is insecure. Generate a secure secret with: openssl rand -base64 32',
    });
  }

  if (missing.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      '',
      ...missing.map(({ key, description }) => `  ${key}: ${description}`),
      '',
      'Please add these to your .env file in the backend directory.',
    ].join('\n');
    
    throw new Error(errorMessage);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Variable Warnings:');
    warnings.forEach(({ key, message }) => {
      console.warn(`  ${key}: ${message}`);
    });
    console.warn('');
  }

  // Log optional variables that are set
  const setOptional = Object.keys(optionalEnvVars).filter(
    key => process.env[key] && process.env[key].trim() !== ''
  );
  
  if (setOptional.length > 0) {
    console.log('✅ Optional environment variables configured:');
    setOptional.forEach(key => {
      console.log(`  ${key}: ${process.env[key] ? '✓' : '✗'}`);
    });
  }

  return true;
}

/**
 * Get environment variable with validation
 */
export function getEnv(key, defaultValue = null, required = false) {
  const value = process.env[key];
  
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value || defaultValue;
}

export default { validateEnv, getEnv };

