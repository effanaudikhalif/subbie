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
  name?: string;
  avatar_url?: string;
  university_name?: string;
  bedrooms?: number;
  bathrooms?: number;
  averageRating?: number;
  totalReviews?: number;
}

interface InteractiveMapProps {
  listings: Listing[];
  searchLocation?: string;
  className?: string;
  dateRange?: Array<{
    startDate: Date | null;
    endDate: Date | null;
    key: string;
  }>;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  listings,
  searchLocation,
  className = "",
  dateRange
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();

        // Default center (Boston area)
        let center = { lat: 42.3601, lng: -71.0589 };
        let zoom = 10;

        // If we have a search location, try to geocode it
        if (searchLocation) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: searchLocation }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location;
              center = { lat: location.lat(), lng: location.lng() };
              zoom = 12;
              
              if (map) {
                map.setCenter(center);
                map.setZoom(zoom);
              }
            }
          });
        }

        const mapInstance = new google.maps.Map(mapRef.current, {
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

        // Add markers for each listing
        const newMarkers: google.maps.Marker[] = [];
        listings.forEach(listing => {
          if (listing.latitude && listing.longitude) {
            const lat = parseFloat(listing.latitude as any);
            const lng = parseFloat(listing.longitude as any);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              // Calculate price based on date range if available
              let displayPrice = listing.price_per_night;
              let priceText = `$${Math.round(displayPrice)}`;
              let priceLabel = `$${Math.round(displayPrice)}`;
              
              if (dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate) {
                const checkIn = new Date(dateRange[0].startDate);
                const checkOut = new Date(dateRange[0].endDate);
                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                displayPrice = nights * listing.price_per_night;
                priceText = `$${Math.round(displayPrice)} for ${nights} night${nights !== 1 ? 's' : ''}`;
                priceLabel = `$${Math.round(displayPrice)}`;
              }
              
              const marker = new google.maps.Marker({
                position: { lat, lng },
                map: mapInstance,
                title: listing.title,
                label: {
                  text: priceLabel,
                  className: 'map-marker-label'
                }
              });

              // Create info window
              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div style="padding: 10px; max-width: 200px;">
                    <h3 style="margin: 0 0 5px 0; font-weight: bold;">${listing.title}</h3>
                    <p style="margin: 0 0 5px 0; color: #666;">${listing.neighborhood || listing.city}, ${listing.state}</p>
                    <p style="margin: 0; font-weight: bold; color: #000;">${priceText}</p>
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

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load map');
      } finally {
        setIsLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      initMap();
    } else {
      setError('Google Maps API key not configured');
    }
  }, [listings, searchLocation]);

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '600px' }}
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

export default InteractiveMap; 