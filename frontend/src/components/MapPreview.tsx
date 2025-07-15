"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapPreviewProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  className?: string;
  height?: string;
}

const MapPreview: React.FC<MapPreviewProps> = ({
  latitude,
  longitude,
  address,
  className = "",
  height = "300px"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!latitude || !longitude || !mapRef.current) {
        return;
      }

      // Validate coordinates are numbers
      const lat = parseFloat(latitude as any);
      const lng = parseFloat(longitude as any);
      
      if (isNaN(lat) || isNaN(lng)) {
        setError('Invalid location coordinates');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: lat, lng: lng },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Add a marker for the selected location
        new google.maps.Marker({
          position: { lat: lat, lng: lng },
          map: map,
          title: address || 'Selected Location',
          animation: google.maps.Animation.DROP
        });

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        if (err instanceof Error && err.message === 'Invalid coordinates') {
          setError('Invalid location coordinates');
        } else {
          setError('Failed to load map preview');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      initMap();
    } else {
      setError('Google Maps API key not configured');
    }
  }, [latitude, longitude, address]);

  // Check if coordinates exist and are valid numbers
  const lat = parseFloat(latitude as any);
  const lng = parseFloat(longitude as any);
  
  if (!latitude || !longitude || isNaN(lat) || isNaN(lng)) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500 text-center">
          {address ? 'Select an address to see the map preview' : 'No location selected'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className="w-full rounded-lg border border-gray-300"
        style={{ height }}
      />
      
      {address && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
          <strong>Selected Address:</strong> {address}
        </div>
      )}
    </div>
  );
};

export default MapPreview; 