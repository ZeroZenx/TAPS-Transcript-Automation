import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';

dotenv.config();

export const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    authority: process.env.AZURE_AUTHORITY || `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: 0,
    },
  },
};

// Only initialize MSAL if Azure credentials are provided
export const msalClient = (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET)
  ? new ConfidentialClientApplication(msalConfig)
  : null;

if (!msalClient) {
  console.log('⚠️  Azure MSAL not configured - Microsoft 365 login will be unavailable');
  console.log('   Local authentication is available. Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET to enable Azure AD.');
}

