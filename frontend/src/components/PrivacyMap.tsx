"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface PrivacyMapProps {
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  address?: string;
  showFullAddress?: boolean;
  className?: string;
  height?: string;
}

const PrivacyMap: React.FC<PrivacyMapProps> = ({
  latitude,
  longitude,
  city,
  state,
  address,
  showFullAddress = false,
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

        // Use the exact coordinates but don't show the address text
        // Convert to numbers to ensure they're valid
        const lat = parseFloat(latitude as any);
        const lng = parseFloat(longitude as any);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid coordinates');
        }
        
        const exactLocation = {
          lat: lat,
          lng: lng
        };

        const map = new google.maps.Map(mapRef.current, {
          center: exactLocation,
          zoom: 16, // Closer zoom to show the exact point
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Add a marker at the exact location
        const marker = new google.maps.Marker({
          position: exactLocation,
          map: map,
          title: city && state ? `${city}, ${state}` : 'Location',
          animation: google.maps.Animation.DROP,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#3B82F6" opacity="0.8"/>
                <circle cx="12" cy="12" r="4" fill="#1E40AF"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
          }
        });

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        if (err instanceof Error && err.message === 'Invalid coordinates') {
          setError('Invalid location coordinates');
        } else {
          setError('Failed to load map');
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
  }, [latitude, longitude, city, state]);

  // Check if coordinates exist and are valid numbers
  const lat = parseFloat(latitude as any);
  const lng = parseFloat(longitude as any);
  
  if (!latitude || !longitude || isNaN(lat) || isNaN(lng)) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500 text-center">
          {city && state ? `Location in ${city}, ${state}` : 'Location not available'}
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
      
      {city && state && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
          <strong>Location:</strong> {city}, {state}
          {showFullAddress && address && (
            <p className="text-xs text-gray-600 mt-1">
              <strong>Address:</strong> {address}
            </p>
          )}
          {!showFullAddress && (
            <p className="text-xs text-gray-500 mt-1">
              Exact address hidden for privacy
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PrivacyMap; 