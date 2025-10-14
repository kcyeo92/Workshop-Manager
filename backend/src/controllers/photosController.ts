import { Request, Response } from 'express';
import { uploadPhoto, getTaskPhotos, getPhotoContent } from '../services/googleDrive.js';

// Upload photos for a task
export const uploadTaskPhotos = async (req: Request, res: Response) => {
  try {
    const { customer, plateNumber } = req.body;
    
    if (!customer || !plateNumber) {
      return res.status(400).json({ error: 'customer and plateNumber are required' });
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    console.log(`Uploading ${req.files.length} photos for ${customer} - ${plateNumber}`);

    const uploadResults = await Promise.all(
      req.files.map((file) => uploadPhoto(file as Express.Multer.File, customer, plateNumber))
    );

    res.json({
      success: true,
      photos: uploadResults,
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
};

// Get photos for a task
export const getPhotos = async (req: Request, res: Response) => {
  try {
    const { customer, plateNumber } = req.query;
    
    if (!customer || !plateNumber) {
      return res.status(400).json({ error: 'customer and plateNumber are required' });
    }

    const photos = await getTaskPhotos(customer as string, plateNumber as string);

    res.json({
      success: true,
      photos,
    });
  } catch (error) {
    console.error('Error getting photos:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
};

// Get photo content (proxy for frontend)
export const getPhotoById = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const content = await getPhotoContent(fileId);

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(content);
  } catch (error) {
    console.error('Error getting photo content:', error);
    res.status(500).json({ error: 'Failed to get photo content' });
  }
};

