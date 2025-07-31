"use client";
import React, { useState } from 'react';
import PhotoUpload from '../../components/PhotoUpload';

export default function TestPhotoUpload() {
  const [photos, setPhotos] = useState<(File | string)[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Photo Upload Test</h1>
        <p className="text-gray-600 mb-6">
          Test the mobile drag and drop functionality. Try uploading photos and then reordering them on mobile devices.
        </p>
        
        <div className="bg-white rounded-lg shadow p-6">
          <PhotoUpload
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={7}
            minPhotos={1}
          />
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <p className="text-sm text-gray-600">
            Photos count: {photos.length}
          </p>
          <p className="text-sm text-gray-600">
            Is mobile: {typeof window !== 'undefined' ? (window.innerWidth < 768 || 'ontouchstart' in window ? 'Yes' : 'No') : 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
} 