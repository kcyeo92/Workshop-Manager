import { google } from 'googleapis';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './service-account-key.json';
const SERVICE_ACCOUNT_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

let drive: any = null;

// Initialize Google Drive API with Service Account
export const initializeDrive = () => {
  if (drive) return drive;

  try {
    let auth;

    // Check if credentials are provided as environment variable (Railway)
    if (SERVICE_ACCOUNT_CREDENTIALS) {
      console.log('Using service account credentials from environment variable');
      const credentials = JSON.parse(SERVICE_ACCOUNT_CREDENTIALS);
      
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    } else {
      // Use key file (local development)
      console.log('Using service account key file');
      const keyPath = path.resolve(SERVICE_ACCOUNT_KEY_PATH);
      
      if (!fs.existsSync(keyPath)) {
        console.error('Service account key file not found at:', keyPath);
        throw new Error('Service account key file not found. Please set GOOGLE_SERVICE_ACCOUNT_CREDENTIALS env variable or provide key file.');
      }

      auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    }

    drive = google.drive({ version: 'v3', auth });
    console.log('Google Drive API initialized with service account');
    return drive;
  } catch (error) {
    console.error('Failed to initialize Google Drive:', error);
    throw error;
  }
};

// Create folder structure: Workshop Photos/yyyy/mm/customer_plateNumber
export const ensureFolderStructure = async (customer: string, plateNumber: string): Promise<string> => {
  const drive = initializeDrive();
  
  if (!FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured');
  }

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const customerPlate = `${customer.replace(/[^a-zA-Z0-9]/g, '_')}_${plateNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;

  try {
    // Find or create year folder
    const yearFolder = await findOrCreateFolder(drive, year, FOLDER_ID);
    
    // Find or create month folder
    const monthFolder = await findOrCreateFolder(drive, month, yearFolder);
    
    // Find or create customer_plate folder
    const taskFolder = await findOrCreateFolder(drive, customerPlate, monthFolder);
    
    return taskFolder;
  } catch (error) {
    console.error('Error ensuring folder structure:', error);
    throw error;
  }
};

// Helper function to find or create a folder
const findOrCreateFolder = async (drive: any, folderName: string, parentId: string): Promise<string> => {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create folder if it doesn't exist
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    return folder.data.id;
  } catch (error) {
    console.error(`Error finding/creating folder ${folderName}:`, error);
    throw error;
  }
};

// Upload a photo to Google Drive
export const uploadPhoto = async (
  file: Express.Multer.File,
  customer: string,
  plateNumber: string
): Promise<{ fileId: string; fileName: string; webViewLink: string }> => {
  const drive = initializeDrive();
  
  try {
    const folderId = await ensureFolderStructure(customer, plateNumber);
    
    const fileMetadata = {
      name: file.originalname,
      parents: [folderId],
    };

    const media = {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log('Photo uploaded:', response.data.name);

    return {
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// Get photos for a task
export const getTaskPhotos = async (
  customer: string,
  plateNumber: string
): Promise<Array<{ fileId: string; fileName: string; webViewLink: string }>> => {
  const drive = initializeDrive();
  
  try {
    // Try to find the folder
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const customerPlate = `${customer.replace(/[^a-zA-Z0-9]/g, '_')}_${plateNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (!FOLDER_ID) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured');
    }

    // Search for the task folder
    const yearFolder = await findOrCreateFolder(drive, year, FOLDER_ID);
    const monthFolder = await findOrCreateFolder(drive, month, yearFolder);
    
    // Search for customer_plate folder
    const folderResponse = await drive.files.list({
      q: `name='${customerPlate}' and '${monthFolder}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (!folderResponse.data.files || folderResponse.data.files.length === 0) {
      return [];
    }

    const taskFolderId = folderResponse.data.files[0].id;

    // Get all files in the folder
    const filesResponse = await drive.files.list({
      q: `'${taskFolderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive',
      orderBy: 'createdTime',
    });

    return filesResponse.data.files || [];
  } catch (error) {
    console.error('Error getting task photos:', error);
    return [];
  }
};

// Get photo content as buffer
export const getPhotoContent = async (fileId: string): Promise<Buffer> => {
  const drive = initializeDrive();
  
  try {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error getting photo content:', error);
    throw error;
  }
};

