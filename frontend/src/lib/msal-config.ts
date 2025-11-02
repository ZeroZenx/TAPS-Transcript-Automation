import { Configuration, PublicClientApplication } from '@azure/msal-browser';

// MSAL configuration - gracefully handles missing Azure config
const hasAzureConfig = !!(import.meta.env.VITE_AZURE_CLIENT_ID && import.meta.env.VITE_AZURE_TENANT_ID);

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '00000000-0000-0000-0000-000000000000',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
};

// Only initialize MSAL if Azure config is available, otherwise create a mock
export const pca = hasAzureConfig 
  ? new PublicClientApplication(msalConfig)
  : ({
      initialize: async () => Promise.resolve(),
      getAllAccounts: () => [],
      loginPopup: async () => { throw new Error('Azure AD not configured'); },
      logoutPopup: async () => Promise.resolve(),
      acquireTokenSilent: async () => { throw new Error('Azure AD not configured'); },
    } as any);

