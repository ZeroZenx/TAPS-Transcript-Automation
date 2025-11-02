import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

let graphClient = null;

export const getGraphClient = () => {
  if (graphClient) return graphClient;

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID || '',
    process.env.AZURE_CLIENT_ID || '',
    process.env.AZURE_CLIENT_SECRET || ''
  );

  // For now, return a mock client that stores files info
  // In production, implement proper Graph API authentication
  graphClient = {
    uploadFile: async (siteId, driveId, fileName, fileBuffer) => {
      // Mock implementation - store file metadata
      return {
        webUrl: `https://sharepoint.example.com/files/${fileName}`,
        id: `file-${Date.now()}`,
        name: fileName,
      };
    },
  };

  return graphClient;
};

export const uploadFileToSharePoint = async (fileName, fileBuffer, folderPath = 'TranscriptRequests') => {
  try {
    const client = getGraphClient();
    const siteId = process.env.SHAREPOINT_SITE_ID || '';
    const driveId = process.env.SHAREPOINT_DRIVE_ID || '';

    // For development, return mock data
    if (!siteId || !driveId) {
      return {
        webUrl: `https://sharepoint.example.com/files/${folderPath}/${fileName}`,
        id: `file-${Date.now()}`,
        name: fileName,
      };
    }

    // In production, implement actual SharePoint upload
    return await client.uploadFile(siteId, driveId, `${folderPath}/${fileName}`, fileBuffer);
  } catch (error) {
    console.error('SharePoint upload error:', error);
    // Fallback: return mock URL
    return {
      webUrl: `https://sharepoint.example.com/files/${fileName}`,
      id: `file-${Date.now()}`,
      name: fileName,
    };
  }
};
