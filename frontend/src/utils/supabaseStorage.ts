import { supabase } from './supabaseClient';

// Configuration
const LISTING_IMAGES_BUCKET = 'listing-images';
const AVATARS_BUCKET = 'avatars';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Helper function to check if file is HEIC/HEIF
const isHeicFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  return mimeType === 'image/heic' || 
         mimeType === 'image/heif' || 
         mimeType === 'image/x-heic' ||
         mimeType === 'image/x-heif' ||
         fileName.endsWith('.heic') || 
         fileName.endsWith('.heif');
};

// Function to convert HEIC to JPEG
const convertHeicToJpeg = async (file: File): Promise<File> => {
  try {
    // Dynamic import to handle potential loading issues
    const heic2any = (await import('heic2any')).default;
    
    console.log('Converting HEIC file for upload:', file.name);
    
    const conversionResult = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9 // Higher quality for uploaded files
    });
    
    // heic2any can return an array or single blob
    const convertedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    
    // Create a new File object with JPEG extension
    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob as Blob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });
    
    console.log('HEIC conversion successful, converted to:', convertedFile.name);
    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC file');
  }
};

/**
 * Upload a listing image to Supabase Storage
 */
export async function uploadListingImage(
  file: File,
  listingId: string,
  imageIndex: number
): Promise<UploadResult> {
  try {
    let fileToUpload = file;
    
    // Convert HEIC files to JPEG before upload
    if (isHeicFile(file)) {
      console.log('HEIC file detected, converting before upload');
      fileToUpload = await convertHeicToJpeg(file);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const fileExtension = fileToUpload.name.split('.').pop() || 'jpg';
    const fileName = `${listingId}-${imageIndex}-${timestamp}-${random}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

/**
 * Upload an avatar image to Supabase Storage
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    let fileToUpload = file;
    
    // Convert HEIC files to JPEG before upload
    if (isHeicFile(file)) {
      console.log('HEIC avatar detected, converting before upload');
      fileToUpload = await convertHeicToJpeg(file);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const fileExtension = fileToUpload.name.split('.').pop() || 'jpg';
    const fileName = `avatar-${userId}-${timestamp}-${random}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Avatar upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Avatar upload failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Avatar upload failed' };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteStorageFile(url: string): Promise<boolean> {
  try {
    // Extract bucket and file path from URL
    const urlParts = url.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) return false;

    const [bucket, filePath] = urlParts[1].split('/', 2);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    return false;
  }
}

/**
 * Get public URL for a file (if you need to regenerate)
 */
export function getStorageUrl(bucket: string, fileName: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
  
  return publicUrl;
}

// Export bucket names for reference
export { LISTING_IMAGES_BUCKET, AVATARS_BUCKET }; 