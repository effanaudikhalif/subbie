# PhotoUpload Component

A modern, user-friendly photo upload component that provides a reliable upload experience across desktop and mobile devices.

## Features

- **Drag & Drop Support**: Users can drag and drop photos directly onto the upload area
- **Mobile-Friendly**: Optimized interface for touch devices with clear tap targets
- **Photo Ordering**: Clear visual indication of photo order with labels (Cover Photo, Photo 2, etc.)
- **File Validation**: Validates file types (images only) and file sizes (max 10MB per file)
- **Visual Feedback**: Hover states, loading indicators, and error messages
- **Responsive Design**: Adapts to different screen sizes
- **Photo Management**: Remove individual photos with hover-to-reveal delete buttons

## Props

```typescript
interface PhotoUploadProps {
  photos: File[];                    // Array of uploaded photo files
  onPhotosChange: (photos: File[]) => void;  // Callback when photos change
  maxPhotos?: number;                // Maximum number of photos (default: 7)
  minPhotos?: number;                // Minimum number of photos (default: 5)
  error?: string;                    // Error message to display
}
```

## Usage

```tsx
import PhotoUpload from './components/PhotoUpload';

function MyComponent() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string>('');

  return (
    <PhotoUpload
      photos={photos}
      onPhotosChange={setPhotos}
      maxPhotos={7}
      minPhotos={5}
      error={error}
    />
  );
}
```

## Photo Order

The component clearly indicates photo order:
- **Cover Photo**: The first photo (index 0) - displayed prominently
- **Photo 2-7**: Subsequent photos with clear numbering
- Photos are displayed in a grid layout with the cover photo taking up more space

## File Requirements

- **File Types**: Images only (JPEG, PNG, GIF, WebP, etc.)
- **File Size**: Maximum 10MB per file
- **Quantity**: 5-7 photos (configurable via props)

## Mobile Experience

- Touch-friendly interface
- Clear visual feedback for tap interactions
- Optimized layout for small screens
- Responsive grid that adapts to screen size

## Error Handling

- File type validation with user feedback
- File size validation with clear error messages
- Minimum photo requirement enforcement
- Visual error states with helpful messaging 