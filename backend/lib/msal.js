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

export const msalClient = new ConfidentialClientApplication(msalConfig);

