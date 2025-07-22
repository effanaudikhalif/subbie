"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import './google-autocomplete.css';

interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
}

interface GoogleMapsAutocompleteProps {
  onAddressSelect: (addressData: AddressData) => void;
  className?: string;
  placeholder?: string;
}

export type { AddressData };

const GoogleMapsAutocomplete: React.FC<GoogleMapsAutocompleteProps> = ({
  onAddressSelect,
  className = "",
  placeholder = "Enter your address"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAutocomplete = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();
        
        if (!inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'], // Allow building names and addresses
          componentRestrictions: { country: ['us', 'ca'] }, // Restrict to US and Canada
          fields: ['address_components', 'geometry', 'formatted_address', 'name', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (!place.address_components) {
            setError('No address details available');
            return;
          }

          const addressData: AddressData = {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: '',
            neighborhood: '',
            latitude: place.geometry?.location?.lat(),
            longitude: place.geometry?.location?.lng()
          };

          // Parse address components
          for (const component of place.address_components) {
            const types = component.types;

            if (types.includes('street_number')) {
              addressData.street = component.long_name + ' ';
            } else if (types.includes('route')) {
              addressData.street += component.long_name;
            } else if (types.includes('locality')) {
              addressData.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              addressData.state = component.short_name;
            } else if (types.includes('postal_code')) {
              addressData.zip = component.long_name;
            } else if (types.includes('country')) {
              addressData.country = component.long_name;
            } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
              // This might be the neighborhood
              addressData.neighborhood = component.long_name;
            }
          }

          // Clean up street address
          addressData.street = addressData.street.trim();

          // If no neighborhood found in components, try to extract from formatted address
          if (!addressData.neighborhood && place.formatted_address) {
            const addressParts = place.formatted_address.split(', ');
            // Look for neighborhood patterns (usually between street and city)
            if (addressParts.length > 2) {
              const potentialNeighborhood = addressParts[1];
              // Check if it's not the city or state
              if (potentialNeighborhood !== addressData.city && 
                  potentialNeighborhood !== addressData.state &&
                  !potentialNeighborhood.match(/^\d{5}/)) { // Not a zip code
                addressData.neighborhood = potentialNeighborhood;
              }
            }
          }

          onAddressSelect(addressData);
          setError(null);
        });

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load address autocomplete. Please enter address manually.');
      } finally {
        setIsLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      initAutocomplete();
    } else {
      setError('Google Maps API key not configured');
    }
  }, [onAddressSelect]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className={`w-full p-2 border border-gray-300 rounded-lg text-black text-sm ${className} ${error ? 'border-red-500' : ''} focus:outline-none focus:ring-1 focus:ring-black`}
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default GoogleMapsAutocomplete;