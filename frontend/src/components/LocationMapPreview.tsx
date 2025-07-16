"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

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

interface LocationMapPreviewProps {
  searchLocation?: string;
  listings?: Listing[];
  className?: string;
  dateRange?: Array<{
    startDate: Date | null;
    endDate: Date | null;
    key: string;
  }>;
}

const LocationMapPreview: React.FC<LocationMapPreviewProps> = React.memo(({
  searchLocation,
  listings = [],
  className = "",
  dateRange
}) => {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: string]: number }>({});
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const handleNextImage = (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    const imageCount = listing?.images?.length || 0;
    
    if (imageCount > 1) {
      setCurrentImageIndices(prev => ({
        ...prev,
        [listingId]: ((prev[listingId] || 0) + 1) % imageCount
      }));
    }
  };

  const handlePrevImage = (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    const imageCount = listing?.images?.length || 0;
    
    if (imageCount > 1) {
      setCurrentImageIndices(prev => ({
        ...prev,
        [listingId]: prev[listingId] === 0 
          ? imageCount - 1
          : (prev[listingId] || 0) - 1
      }));
    }
  };

  // Check if listing is in wishlist when selected listing changes
  useEffect(() => {
    if (!user || !selectedListing) return;

    const checkWishlistStatus = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/wishlist/check/${user.id}/${selectedListing.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsInWishlist(data.inWishlist);
        }
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [user, selectedListing]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !selectedListing) {
      alert('Please log in to add items to your wishlist');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(`http://localhost:4000/api/wishlist/${user.id}/${selectedListing.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setIsInWishlist(false);
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: selectedListing.id, inWishlist: false }
          }));
        }
      } else {
        // Add to wishlist
        const response = await fetch(`http://localhost:4000/api/wishlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            listing_id: selectedListing.id,
          }),
        });
        if (response.ok) {
          setIsInWishlist(true);
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: selectedListing.id, inWishlist: true }
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      alert('Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

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
                  // Calculate price based on date range if available
                  let displayPrice = listing.price_per_night;
                  let priceText = `$${Math.round(displayPrice)}`;
                  
                  if (dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate) {
                    const checkIn = new Date(dateRange[0].startDate);
                    const checkOut = new Date(dateRange[0].endDate);
                    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                    displayPrice = nights * listing.price_per_night;
                    priceText = `$${Math.round(displayPrice)}`;
                  }
                  
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
                      text: priceText,
                      className: 'rectangular-marker-label',
                      color: '#000000',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }
                  });

                  // Simple marker click handler
                  marker.addListener('click', () => {
                    setSelectedListing(listing);
                    setInfoWindowPosition({ lat, lng });
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
      
      {/* Custom Info Window Overlay */}
      {selectedListing && infoWindowPosition && (
        <div className="absolute inset-0 pointer-events-none">
          <Link 
            href={`/listings/${selectedListing.id}`}
            className="absolute bg-white rounded-xl shadow-lg overflow-hidden pointer-events-auto cursor-pointer hover:shadow-xl transition-shadow"
            style={{
              maxWidth: '280px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              fontFamily: 'Arial, Helvetica, sans-serif'
            }}
          >
            {/* Image Container */}
            <div className="relative">
              <img 
                src={(() => {
                  const currentIndex = currentImageIndices[selectedListing.id] || 0;
                  const imageUrl = selectedListing.images && selectedListing.images.length > 0 
                    ? `http://localhost:4000${selectedListing.images[currentIndex]?.url || selectedListing.images[0].url}` 
                    : "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80";
                  return imageUrl;
                })()}
                alt={selectedListing.title} 
                className="w-full h-48 object-cover" 
              />
              
              {/* Heart Icon */}
              <button 
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                className={`absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform ${wishlistLoading ? 'opacity-50' : ''}`}
                title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {wishlistLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg 
                    className={`w-5 h-5 ${isInWishlist ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
                    fill={isInWishlist ? 'currentColor' : 'none'} 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </button>
              
              {/* Close Button */}
              <button 
                className="absolute top-3 left-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedListing(null);
                  setInfoWindowPosition(null);
                }}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Navigation Arrows */}
              {selectedListing.images && selectedListing.images.length > 1 && (
                <>
                  {/* Left Arrow - only show if not on first image */}
                  {(currentImageIndices[selectedListing.id] || 0) > 0 && (
                    <button 
                      className="absolute top-1/2 left-3 transform -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePrevImage(selectedListing.id);
                      }}
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Right Arrow - only show if not on last image */}
                  {(currentImageIndices[selectedListing.id] || 0) < selectedListing.images.length - 1 && (
                    <button 
                      className="absolute top-1/2 right-3 transform -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNextImage(selectedListing.id);
                      }}
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              
              {/* Image Dots */}
              {selectedListing.images && selectedListing.images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {selectedListing.images.slice(0, 5).map((_: any, index: number) => (
                    <div 
                      key={index}
                      className={`w-2 h-2 bg-white rounded-full ${index === (currentImageIndices[selectedListing.id] || 0) ? 'opacity-100' : 'opacity-60'}`}
                    />
                  ))}
                  {selectedListing.images.length > 5 && (
                    <div className="w-2 h-2 bg-white rounded-full opacity-60 flex items-center justify-center">
                      <span className="text-xs text-gray-800 font-medium">+{selectedListing.images.length - 5}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="p-4">
              {/* Title */}
              <div className="text-black font-semibold text-lg mb-2">
                {selectedListing.title}
              </div>
              
              {/* Profile picture, Name, and University */}
              <div className="flex items-center mb-2">
                {selectedListing.avatar_url ? (
                  <img 
                    src={selectedListing.avatar_url} 
                    alt={selectedListing.name || 'Host'} 
                    className="w-8 h-8 rounded-full mr-3 flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-sm font-medium">
                        {selectedListing.name ? selectedListing.name.charAt(0).toUpperCase() : 'H'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 text-sm font-medium">
                    {selectedListing.name || 'Host'}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {selectedListing.university_name || 'University'}
                  </div>
                </div>
              </div>
              
              {/* Beds • Rating */}
              <div className="text-gray-500 text-sm mb-2">
                {selectedListing.bedrooms || 1} bed{(selectedListing.bedrooms || 1) !== 1 ? 's' : ''} • {selectedListing.averageRating ? (
                  <>
                    <span className="text-black">★</span>
                    <span className="ml-1">{selectedListing.averageRating.toFixed(1)}</span>
                    {selectedListing.totalReviews && (
                      <span className="ml-1">({selectedListing.totalReviews})</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">No reviews</span>
                )}
              </div>
              
              {/* Price for nights */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate ? (
                    <>
                      <span className="font-bold text-black text-lg">
                        ${(() => {
                          const checkIn = new Date(dateRange[0].startDate);
                          const checkOut = new Date(dateRange[0].endDate);
                          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                          const totalPrice = nights * selectedListing.price_per_night;
                          return Math.round(totalPrice);
                        })()}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">
                        for {(() => {
                          const checkIn = new Date(dateRange[0].startDate);
                          const checkOut = new Date(dateRange[0].endDate);
                          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                          return nights;
                        })()} night{(() => {
                          const checkIn = new Date(dateRange[0].startDate);
                          const checkOut = new Date(dateRange[0].endDate);
                          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                          return nights !== 1 ? 's' : '';
                        })()}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-black text-lg">${Math.round(selectedListing.price_per_night)}</span>
                      <span className="text-gray-500 text-sm ml-1">per night</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
});

export default LocationMapPreview; 