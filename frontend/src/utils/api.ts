// API base URL configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Debug: Log the API URL being used
console.log('API_BASE_URL:', API_BASE_URL);
console.log('NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL);

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