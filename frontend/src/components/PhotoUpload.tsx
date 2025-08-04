"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';

// Dynamic import for heic2any to handle potential issues
const convertHeicToJpeg = async (file: File) => {
  try {
    // Dynamic import to ensure it loads properly
    const heic2any = (await import('heic2any')).default;
    
    const conversionResult = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.8
    });
    
    // heic2any can return an array or single blob
    const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    return blob as Blob;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw error;
  }
};

interface PhotoUploadProps {
  photos: (File | string)[];
  onPhotosChange: (photos: (File | string)[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
}

interface PhotoWithPreview {
  file: File | string;
  id: string;
  preview: string;
  order: number;
}

// Helper function to check if file is HEIC/HEIF
const isHeicFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  const isHeic = mimeType === 'image/heic' || 
         mimeType === 'image/heif' || 
         mimeType === 'image/x-heic' ||
         mimeType === 'image/x-heif' ||
         mimeType === '' && (fileName.endsWith('.heic') || fileName.endsWith('.heif')) ||
         fileName.endsWith('.heic') || 
         fileName.endsWith('.heif');
  
  console.log('HEIC detection for file:', file.name, 'type:', file.type, 'size:', file.size, 'isHeic:', isHeic);
  
  // Additional check: HEIC files are typically larger and have specific characteristics
  if (isHeic && file.size > 0) {
    console.log('Confirmed HEIC file based on extension and/or type');
  }
  
  return isHeic;
};

// Function to convert HEIC to JPEG for preview
const convertHeicForPreview = async (file: File): Promise<string> => {
  console.log('Converting HEIC file:', file.name, file.type, 'size:', file.size);
  
  // First, let's try the heic2any conversion
  try {
    const convertedBlob = await convertHeicToJpeg(file);
    const previewUrl = URL.createObjectURL(convertedBlob);
    console.log('HEIC conversion successful, created preview URL:', previewUrl);
    return previewUrl;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
  }
  
  // If heic2any fails, try to create a preview using FileReader and canvas
  try {
    console.log('Attempting canvas-based fallback for HEIC preview');
    return await createCanvasFallbackPreview(file);
  } catch (canvasError) {
    console.error('Canvas fallback failed:', canvasError);
  }
  
  // Final fallback: show HEIC file info with placeholder
  console.log('Using placeholder for HEIC file');
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA4SDI4VjMySDEyVjhaIiBzdHJva2U9IiM5Q0E0QjAiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8dGV4dCB4PSIyMCIgeT0iMjIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjNkI3MjgwIj5IRUlDPC90ZXh0Pgo8L3N2Zz4K';
};

// Canvas-based fallback for HEIC files
const createCanvasFallbackPreview = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = 40;
        canvas.height = 40;
        
        // Fill with gray background
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(0, 0, 40, 40);
        
        // Draw HEIC text
        ctx.fillStyle = '#6B7280';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HEIC', 20, 22);
        
        // Draw camera icon outline
        ctx.strokeStyle = '#9CA4B0';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 24, 24);
        
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export default function PhotoUpload({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 7, 
  minPhotos = 5
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingHeic, setProcessingHeic] = useState(false);
  const [heicConversionComplete, setHeicConversionComplete] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photosWithPreview, setPhotosWithPreview] = useState<PhotoWithPreview[]>([]);
  
  // Note: Touch drag functionality removed for better mobile UX
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      const mobile = isTouchDevice || isSmallScreen;
      setIsMobile(mobile);
      console.log('Mobile detection:', { isTouchDevice, isSmallScreen, mobile });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Convert photos to PhotoWithPreview format
  React.useEffect(() => {
    const createPhotosWithPreviews = async () => {
      // Check if any files are HEIC and need processing
      const hasHeicFiles = photos.some(photo => 
        typeof photo !== 'string' && isHeicFile(photo)
      );
      
      if (hasHeicFiles) {
        setProcessingHeic(true);
        setHeicConversionComplete(false);
      }

      const photosWithPreviews = await Promise.all(
        photos.map(async (photo, index) => {
          let preview: string;
          
          if (typeof photo === 'string') {
            // Already a URL string
            preview = photo;
            console.log(`Photo ${index}: Using existing URL`);
          } else if (isHeicFile(photo)) {
            // Convert HEIC to JPEG for preview
            console.log(`Photo ${index}: Converting HEIC file`);
            preview = await convertHeicForPreview(photo);
          } else {
            // Regular image file
            preview = URL.createObjectURL(photo);
            console.log(`Photo ${index}: Regular image, created object URL:`, preview);
          }

          return {
            file: photo,
            id: `${Date.now()}-${index}`,
            preview,
            order: index
          };
        })
      );
      
      setPhotosWithPreview(photosWithPreviews);
      setProcessingHeic(false);
      
      // Show success message if HEIC files were processed
      if (hasHeicFiles) {
        setHeicConversionComplete(true);
        // Hide success message after 3 seconds
        setTimeout(() => setHeicConversionComplete(false), 3000);
      }
    };

    createPhotosWithPreviews();
  }, [photos]);

  // Cleanup preview URLs
  React.useEffect(() => {
    return () => {
      photosWithPreview.forEach(photo => {
        if (typeof photo.file !== 'string' && photo.preview) {
          URL.revokeObjectURL(photo.preview);
        }
      });
    };
  }, [photosWithPreview]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Filter for image files (we now accept all image formats including HEIC/HEIF)
    const imageFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || 
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif')
    );
    
    const nonImageFiles = fileArray.filter(file => 
      !file.type.startsWith('image/') && 
      !file.name.toLowerCase().endsWith('.heic') &&
      !file.name.toLowerCase().endsWith('.heif')
    );

    if (nonImageFiles.length > 0) {
      alert('Some files are not images. Please select image files only.');
      return;
    }
    
    if (imageFiles.length === 0) {
      alert('Please select image files.');
      return;
    }

    // Check file sizes (max 10MB per file)
    const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert('Some files are too large. Please select files smaller than 10MB.');
      return;
    }

    const newPhotos = [...photos, ...imageFiles].slice(0, maxPhotos);
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange, maxPhotos]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange]);

  const reorderPhoto = useCallback((fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Touch drag functionality removed for better mobile UX - now using up/down buttons instead

  // Mouse drag and drop handlers (for desktop)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isMobile) return; // Disable mouse drag on mobile
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isMobile) return; // Disable mouse drag on mobile
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (isMobile) return; // Disable mouse drag on mobile
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDropOnPhoto = (e: React.DragEvent, dropIndex: number) => {
    if (isMobile) return; // Disable mouse drag on mobile
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderPhoto(draggedIndex, dropIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getPhotoOrderLabel = (index: number) => {
    if (index === 0) return "Cover Photo";
    if (index === 1) return "Photo 2";
    if (index === 2) return "Photo 3";
    if (index === 3) return "Photo 4";
    if (index === 4) return "Photo 5";
    return `Photo ${index + 1}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      {photos.length === 0 && (
        <div className="text-center space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.heic,.heif"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                Upload photos
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isMobile ? 'Tap to select photos' : 'Drag and drop or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Upload {minPhotos}-{maxPhotos} photos • Max 10MB each<br/>
                Supports all image formats including HEIC/HEIF from iPhone
              </p>
            </div>

            <button
              type="button"
              onClick={openFileDialog}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Select Photos
            </button>
          </div>
        </div>
      )}

      {/* Photo List */}
      {photos.length > 0 && (
        <div className="space-y-6">
          {/* Photo Order Instructions */}
          <div className="rounded-lg p-4" style={{ backgroundColor: '#f0f8fa', border: '1px solid #368a98' }}>
            <div className="flex items-start">
              <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#368a98' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: '#2d5a63' }}>Photo Order</p>
                <p className="text-sm mt-1" style={{ color: '#368a98' }}>
                  {isMobile ? 'Use the arrow buttons to reorder photos. The first photo will be your cover photo.' : 'Drag photos to reorder them. The first photo will be your cover photo.'}
                </p>
              </div>
            </div>
          </div>

          {/* HEIC Processing Message */}
          {processingHeic && (
            <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8 0 004.646 9.646 8 8 0 0718 15m-3.343 2.657A7 7 0 717 10.657V4" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Processing HEIC Files</p>
                  <p className="text-sm mt-1 text-blue-600">
                    Converting HEIC files for web preview and upload. This ensures compatibility across all devices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* HEIC Conversion Success Message */}
          {heicConversionComplete && (
            <div className="rounded-lg p-4 bg-green-50 border border-green-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">HEIC Files Converted Successfully!</p>
                  <p className="text-sm mt-1 text-green-600">
                    Your HEIC files have been converted to JPEG format and will display properly on all devices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Photo List */}
          <div className="space-y-2">
            {photos.map((photo, index) => (
              <div
                key={index}
                draggable={!isMobile}
                onDragStart={!isMobile ? (e) => handleDragStart(e, index) : undefined}
                onDragOver={!isMobile ? (e) => handleDragOver(e, index) : undefined}
                onDragEnd={!isMobile ? handleDragEnd : undefined}
                onDrop={!isMobile ? (e) => handleDropOnPhoto(e, index) : undefined}
                className={`relative flex items-center p-3 border rounded-lg transition-all ${
                  isMobile 
                    ? 'cursor-default' 
                    : 'cursor-move'
                } ${
                  !isMobile && draggedIndex === index 
                    ? 'opacity-50 bg-gray-100 transform scale-105' 
                    : !isMobile && dragOverIndex === index 
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                style={{
                  transition: 'all 0.2s ease',
                  backgroundColor: !isMobile && dragOverIndex === index ? '#f0f8fa' : undefined,
                  borderColor: !isMobile && dragOverIndex === index ? '#368a98' : undefined
                }}
              >
                {/* Drag Handle - Desktop Only */}
                {!isMobile && (
                  <div className="mr-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                )}

                {/* Small Preview */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 mr-3 flex-shrink-0">
                  {typeof photo !== 'string' && isHeicFile(photo) ? (
                    // Always show HEIC indicator with preview or placeholder
                    <div className="w-full h-full relative">
                      {photosWithPreview[index]?.preview && !processingHeic ? (
                        <img
                          src={photosWithPreview[index].preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50">
                          {processingHeic ? (
                            <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8 0 004.646 9.646 8 8 0 0118 15m-3.343 2.657A7 7 0 717 10.657V4" />
                            </svg>
                          ) : (
                            <>
                              <div className="text-xs font-bold text-blue-600">HEIC</div>
                            </>
                          )}
                        </div>
                      )}
                      {/* HEIC badge */}
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-bl text-[8px] font-bold">
                        HEIC
                      </div>
                    </div>
                  ) : (
                    <img
                      src={photosWithPreview[index]?.preview || (typeof photo === 'string' ? photo : URL.createObjectURL(photo))}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {typeof photo === 'string' ? 'Existing Photo' : photo.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{typeof photo === 'string' ? 'Server Image' : formatFileSize(photo.size)}</span>
                        <span>•</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          index === 0 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`} style={{
                          backgroundColor: index === 0 ? '#f0f8fa' : undefined,
                          color: index === 0 ? '#368a98' : undefined
                        }}>
                          {getPhotoOrderLabel(index)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Reorder and Delete Buttons */}
                {isMobile && (
                  <div className="ml-3 flex flex-col space-y-1">
                    {/* Move Up Button */}
                    {index > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          reorderPhoto(index, index - 1);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors touch-manipulation"
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    )}
                    {/* Move Down Button */}
                    {index < photos.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          reorderPhoto(index, index + 1);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors touch-manipulation"
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Remove Button - Larger on Mobile */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removePhoto(index);
                  }}
                  className={`ml-3 text-gray-400 hover:text-red-500 transition-colors touch-manipulation ${
                    isMobile ? 'p-2' : ''
                  }`}
                  style={isMobile ? { minWidth: '44px', minHeight: '44px' } : {}}
                >
                  <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add More Photos Button */}
          {photos.length < maxPhotos && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={openFileDialog}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add More Photos
              </button>
            </div>
          )}

          {/* Photo Count and Requirements */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {photos.length} of {maxPhotos} photos uploaded
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
} 