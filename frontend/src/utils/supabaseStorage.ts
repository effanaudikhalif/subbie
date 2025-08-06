import { supabase } from './supabaseClient';

// Configuration
const LISTING_IMAGES_BUCKET = 'listing-images';
const AVATARS_BUCKET = 'avatars';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a listing image to Supabase Storage
 */
export async function uploadListingImage(
  file: File,
  listingId: string,
  imageIndex: number
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${listingId}-${imageIndex}-${timestamp}-${random}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(fileName, file, {
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
    return { success: false, error: 'Upload failed' };
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
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `avatar-${userId}-${timestamp}-${random}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, file, {
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
    return { success: false, error: 'Avatar upload failed' };
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