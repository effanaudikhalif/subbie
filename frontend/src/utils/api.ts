// API base URL configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Debug: Log the API URL being used
console.log('API_BASE_URL:', API_BASE_URL);
console.log('NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL);
console.log('Current environment:', process.env.NODE_ENV);

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Building API URL:', url);
  return url;
};

// Helper function to build image URLs
export const buildImageUrl = (imagePath: string): string => {
  if (imagePath.startsWith('/uploads/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  return imagePath;
};

// Enhanced function to handle avatar URLs for both local and production environments
export const buildAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  
  // If we're in development and the URL points to production, convert it to local
  if (API_BASE_URL.includes('localhost') && avatarUrl.includes('onrender.com')) {
    // Extract the filename from the production URL
    const filename = avatarUrl.split('/uploads/')[1];
    if (filename) {
      return `${API_BASE_URL}/uploads/${filename}`;
    }
  }
  
  // If we're in production and the URL points to localhost, convert it to production
  if (!API_BASE_URL.includes('localhost') && avatarUrl.includes('localhost')) {
    // Extract the filename from the local URL
    const filename = avatarUrl.split('/uploads/')[1];
    if (filename) {
      // Use the configured API_BASE_URL instead of hardcoded URL
      return `${API_BASE_URL}/uploads/${filename}`;
    }
  }
  
  // If the avatar URL is already a full URL with the correct domain, return as is
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  
  // If it's a relative path, prepend the API base URL
  if (avatarUrl.startsWith('/uploads/')) {
    return `${API_BASE_URL}${avatarUrl}`;
  }
  
  return avatarUrl;
}; 