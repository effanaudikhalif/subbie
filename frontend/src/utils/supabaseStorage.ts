import { supabase } from './supabaseClient';

// Configuration
const LISTING_IMAGES_BUCKET = 'listing-images';
const AVATARS_BUCKET = 'avatars';

// Configuration flag to disable HEIC conversion for debugging
const ENABLE_HEIC_CONVERSION = false; // Set to false to completely skip HEIC conversion

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
  console.log('Starting HEIC conversion for:', file.name, 'size:', file.size);
  
  try {
    // Check if heic2any is available
    let heic2any;
    try {
      // Dynamic import to handle potential loading issues
      const heic2anyModule = await import('heic2any');
      heic2any = heic2anyModule.default;
      console.log('heic2any library loaded successfully');
    } catch (importError) {
      console.error('Failed to import heic2any library:', importError);
      throw new Error('heic2any library not available');
    }
    
    // Attempt conversion
    console.log('Attempting HEIC conversion...');
    const conversionResult = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9 // Higher quality for uploaded files
    });
    
    console.log('HEIC conversion completed, result type:', typeof conversionResult);
    
    // heic2any can return an array or single blob
    const convertedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    
    if (!convertedBlob || !(convertedBlob instanceof Blob)) {
      throw new Error('Conversion result is not a valid blob');
    }
    
    // Create a new File object with JPEG extension
    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([convertedBlob as Blob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });
    
    console.log('HEIC conversion successful. Original:', file.name, 'Converted:', convertedFile.name);
    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed with error:', error);
    throw error;
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
    let conversionAttempted = false;
    let conversionSkipped = false;
    
    // Convert HEIC files to JPEG before upload
    if (isHeicFile(file)) {
      if (!ENABLE_HEIC_CONVERSION) {
        console.log('HEIC conversion disabled, uploading original file');
        conversionSkipped = true;
      } else {
        console.log('HEIC file detected, attempting conversion before upload');
        conversionAttempted = true;
        
        try {
          fileToUpload = await convertHeicToJpeg(file);
          console.log('HEIC conversion successful, uploading converted file');
        } catch (conversionError) {
          console.error('HEIC conversion failed, uploading original file:', conversionError);
          // Fall back to uploading the original HEIC file
          // This allows the listing to be created even if conversion fails
          fileToUpload = file;
        }
      }
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const fileExtension = fileToUpload.name.split('.').pop() || 'jpg';
    const fileName = `${listingId}-${imageIndex}-${timestamp}-${random}.${fileExtension}`;

    console.log('Uploading file:', fileName, 'Type:', fileToUpload.type, 'Size:', fileToUpload.size);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    console.log('Upload successful, public URL:', publicUrl);

    // Add a note about conversion status
    const result = { success: true, url: publicUrl };
    if (conversionSkipped) {
      console.warn('HEIC file uploaded without conversion (conversion disabled)');
    } else if (conversionAttempted && fileToUpload === file) {
      console.warn('HEIC file uploaded without conversion - may not display on all devices');
    }

    return result;
  } catch (error) {
    console.error('Upload failed with error:', error);
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
    let conversionAttempted = false;
    
    // Convert HEIC files to JPEG before upload
    if (isHeicFile(file)) {
      console.log('HEIC avatar detected, attempting conversion before upload');
      conversionAttempted = true;
      
      try {
        fileToUpload = await convertHeicToJpeg(file);
        console.log('HEIC avatar conversion successful, uploading converted file');
      } catch (conversionError) {
        console.error('HEIC avatar conversion failed, uploading original file:', conversionError);
        // Fall back to uploading the original HEIC file
        fileToUpload = file;
      }
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

    // Add a note about conversion status
    const result = { success: true, url: publicUrl };
    if (conversionAttempted && fileToUpload === file) {
      console.warn('HEIC avatar uploaded without conversion - may not display on all devices');
    }

    return result;
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