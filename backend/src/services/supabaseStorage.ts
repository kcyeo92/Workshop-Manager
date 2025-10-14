import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'workshop-photos';

// Upload a photo to Supabase Storage
export const uploadPhoto = async (
  file: Express.Multer.File,
  customer: string,
  plateNumber: string
): Promise<{ fileId: string; fileName: string; publicUrl: string }> => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const customerPlate = `${customer.replace(/[^a-zA-Z0-9]/g, '_')}_${plateNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Create path: yyyy/mm/customer_plate/filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.originalname}`;
    const filePath = `${year}/${month}/${customerPlate}/${fileName}`;

    console.log('Uploading photo to Supabase:', filePath);

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Supabase upload failed: ${error.message || JSON.stringify(error)}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log('Photo uploaded successfully:', fileName);

    return {
      fileId: filePath, // Use path as ID
      fileName: file.originalname,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading photo to Supabase:', error);
    throw error;
  }
};

// Get photos for a task
export const getTaskPhotos = async (
  customer: string,
  plateNumber: string
): Promise<Array<{ fileId: string; fileName: string; publicUrl: string }>> => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const customerPlate = `${customer.replace(/[^a-zA-Z0-9]/g, '_')}_${plateNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // List files in the folder
    const folderPath = `${year}/${month}/${customerPlate}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath, {
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (error) {
      console.error('Error listing photos:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get public URLs for all files
    const photos = data.map((file) => {
      const filePath = `${folderPath}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // Extract original filename (remove timestamp prefix)
      const originalName = file.name.replace(/^\d+_/, '');

      return {
        fileId: filePath,
        fileName: originalName,
        publicUrl: urlData.publicUrl,
      };
    });

    return photos;
  } catch (error) {
    console.error('Error getting task photos:', error);
    return [];
  }
};

// Get photo content (proxy) - for Supabase, we can just return the public URL
export const getPhotoContent = async (fileId: string): Promise<Buffer> => {
  try {
    // Download the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(fileId);

    if (error) {
      console.error('Error downloading photo:', error);
      throw error;
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error getting photo content:', error);
    throw error;
  }
};

