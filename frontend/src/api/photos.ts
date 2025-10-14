// API for photo uploads via backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface Photo {
  fileId: string;
  fileName: string;
  publicUrl: string;
  webViewLink?: string; // Keep for backward compatibility
}

// Upload photos for a task
export async function uploadPhotos(
  files: File[],
  customer: string,
  plateNumber: string
): Promise<Photo[]> {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('photos', file);
  });
  
  formData.append('customer', customer);
  formData.append('plateNumber', plateNumber);

  const response = await fetch(`${API_BASE_URL}/photos/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to upload photos';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.photos;
}

// Get photos for a task
export async function getPhotos(
  customer: string,
  plateNumber: string
): Promise<Photo[]> {
  const params = new URLSearchParams({
    customer,
    plateNumber,
  });

  const response = await fetch(`${API_BASE_URL}/photos?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to get photos';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.photos;
}

// Get photo URL (proxied through backend)
export function getPhotoUrl(fileId: string): string {
  return `${API_BASE_URL}/photos/${fileId}`;
}

