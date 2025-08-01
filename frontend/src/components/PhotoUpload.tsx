"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';

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

export default function PhotoUpload({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 7, 
  minPhotos = 5
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const photosWithPreviews = photos.map((photo, index) => ({
      file: photo,
      id: `${Date.now()}-${index}`,
      preview: typeof photo === 'string' ? photo : URL.createObjectURL(photo),
      order: index
    }));
    setPhotosWithPreview(photosWithPreviews);
  }, [photos]);

  // Cleanup preview URLs
  React.useEffect(() => {
    return () => {
      photosWithPreview.forEach(photo => {
        if (typeof photo.file !== 'string') {
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
                  <img
                    src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
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