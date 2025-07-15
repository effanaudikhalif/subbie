"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Listing {
  id: string;
  title: string;
  city: string;
  state: string;
  neighborhood?: string;
  price_per_night: number;
  latitude?: number;
  longitude?: number;
  images?: Array<{ url: string }>;
}

interface LocationMapPreviewProps {
  searchLocation?: string;
  listings?: Listing[];
  className?: string;
}

const LocationMapPreview: React.FC<LocationMapPreviewProps> = ({
  searchLocation,
  listings = [],
  className = ""
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || !searchLocation) return;

      setIsLoading(true);
      setError(null);

      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();

        // Default center (Boston area) - will be updated after geocoding
        let center = { lat: 42.3601, lng: -71.0589 };
        let zoom = 12;

        // Geocode the search location
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: searchLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            center = { lat: location.lat(), lng: location.lng() };
            
            // Determine zoom level based on the type of location
            let zoom = 12; // Default zoom
            
            // Check if it's a neighborhood (usually has "neighborhood" in the result)
            const isNeighborhood = results[0].types.includes('sublocality') || 
                                 results[0].types.includes('sublocality_level_1') ||
                                 searchLocation.toLowerCase().includes('neighborhood') ||
                                 searchLocation.split(',').length > 2; // Multiple parts suggest neighborhood
            
            if (isNeighborhood) {
              zoom = 15; // Zoom in more for neighborhoods
            } else if (results[0].types.includes('locality')) {
              zoom = 12; // City level
            } else if (results[0].types.includes('administrative_area_level_1')) {
              zoom = 8; // State level
            }
            
            // Create the map
            const mapInstance = new google.maps.Map(mapRef.current!, {
              center,
              zoom,
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

            setMap(mapInstance);

            // Clear existing markers
            markers.forEach(marker => marker.setMap(null));

            // Add a red marker for the searched location
            new google.maps.Marker({
              position: center,
              map: mapInstance,
              title: searchLocation,
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(32, 32)
              }
            });

            // Add markers for each listing
            const newMarkers: google.maps.Marker[] = [];
            listings.forEach(listing => {
              if (listing.latitude && listing.longitude) {
                const lat = parseFloat(listing.latitude as any);
                const lng = parseFloat(listing.longitude as any);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                  const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: mapInstance,
                    title: listing.title,
                    // Custom rectangular marker
                    icon: {
                      path: 'M-10,-8 L10,-8 L10,8 L-10,8 Z', // Rectangle path
                      scale: 1,
                      fillColor: '#FFFFFF',
                      fillOpacity: 1,
                      strokeColor: '#000000',
                      strokeWeight: 2,
                    },
                    label: {
                      text: `$${listing.price_per_night}`,
                      className: 'rectangular-marker-label',
                      color: '#000000',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }
                  });

                  // Create info window for listing
                  const infoWindow = new google.maps.InfoWindow({
                    content: `
                      <div style="padding: 10px; max-width: 200px;">
                        <h3 style="margin: 0 0 5px 0; font-weight: bold;">${listing.title}</h3>
                        <p style="margin: 0 0 5px 0; color: #666;">${listing.neighborhood || listing.city}, ${listing.state}</p>
                        <p style="margin: 0; font-weight: bold; color: #000;">$${listing.price_per_night}/night</p>
                      </div>
                    `
                  });

                  marker.addListener('click', () => {
                    infoWindow.open(mapInstance, marker);
                  });

                  newMarkers.push(marker);
                }
              }
            });

            setMarkers(newMarkers);

          } else {
            setError('Location not found');
          }
        });

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load map preview');
      } finally {
        setIsLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && searchLocation) {
      initMap();
    } else if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
    }
  }, [searchLocation, listings]);

  if (!searchLocation) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">Enter a location to see the map preview</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="text-red-500 text-center">
            <p className="font-semibold">Map Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMapPreview; 