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
  user_id?: string;
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
  onBoundsChange?: (bounds: { sw: { lat: number, lng: number }, ne: { lat: number, lng: number } }) => void;
}

const LocationMapPreview: React.FC<LocationMapPreviewProps> = React.memo(({
  searchLocation,
  listings = [],
  className = "",
  dateRange,
  onBoundsChange
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
  const prevSearchLocationRef = useRef<string | undefined>(undefined);
  const redMarkerRef = useRef<google.maps.Marker | null>(null);
  const searchLocationCoords = useRef<{ lat: number, lng: number } | null>(null);

  const getUniversityDisplay = (universityName: string | undefined) => {
    if (!universityName) return '';
    
    const fullText = `Hosted by ${universityName} student`;
    
    if (fullText.length <= 25) {
      return universityName;
    }
    
    const words = universityName.split(' ');
    const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
    
    return initials;
  };

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
        const response = await fetch(`http://localhost:4000/api/wishlist/${user.id}/${selectedListing.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setIsInWishlist(false);
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: selectedListing.id, inWishlist: false }
          }));
        }
      } else {
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

  const addMarkersToMap = (mapInstance: google.maps.Map) => {
    markers.forEach(marker => marker.setMap(null));

    if (redMarkerRef.current) {
      redMarkerRef.current.setMap(null);
      redMarkerRef.current = null;
    }

    if (searchLocation && searchLocationCoords.current) {
      redMarkerRef.current = new google.maps.Marker({
        position: searchLocationCoords.current,
        map: mapInstance,
        title: searchLocation,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      });
    }

    const newMarkers: google.maps.Marker[] = [];
    listings.forEach(listing => {
      if (listing.latitude && listing.longitude) {
        const lat = parseFloat(listing.latitude as any);
        const lng = parseFloat(listing.longitude as any);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          let displayPrice = listing.price_per_night;
          
          if (dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate) {
            const checkIn = new Date(dateRange[0].startDate);
            const checkOut = new Date(dateRange[0].endDate);
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            displayPrice = nights * listing.price_per_night;
          }
          
          const marker = new google.maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            title: listing.title,
            icon: {
              path: 'M-10,-8 L10,-8 L10,8 L-10,8 Z',
              scale: 1,
              fillColor: '#FFFFFF',
              fillOpacity: 1,
              strokeColor: '#000000',
              strokeWeight: 2,
            },
            label: {
              text: `$${Math.round(displayPrice)}`,
              className: 'rectangular-marker-label',
              color: '#000000',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          });

          marker.addListener('click', () => {
            setSelectedListing(listing);
            setInfoWindowPosition({ lat, lng });
          });

          newMarkers.push(marker);
        }
      }
    });

    setMarkers(newMarkers);
  };

  useEffect(() => {
    if (prevSearchLocationRef.current === searchLocation) {
      return;
    }
    
    prevSearchLocationRef.current = searchLocation;
    
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

        let center = { lat: 42.3601, lng: -71.0589 };

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: searchLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            center = { lat: location.lat(), lng: location.lng() };
            searchLocationCoords.current = center;
            
            const mapInstance = new google.maps.Map(mapRef.current!, {
              center,
              zoom: 12,
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

            if (results[0].geometry.viewport) {
              mapInstance.fitBounds(results[0].geometry.viewport);
            } else {
              mapInstance.setCenter(center);
              mapInstance.setZoom(12);
            }

            if (onBoundsChange) {
              google.maps.event.addListener(mapInstance, 'idle', () => {
                const bounds = mapInstance.getBounds();
                if (bounds) {
                  const sw = bounds.getSouthWest();
                  const ne = bounds.getNorthEast();
                  onBoundsChange({
                    sw: { lat: sw.lat(), lng: sw.lng() },
                    ne: { lat: ne.lat(), lng: ne.lng() }
                  });
                }
              });
            }

            setMap(mapInstance);
            addMarkersToMap(mapInstance);

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
  }, [searchLocation, onBoundsChange]);

  useEffect(() => {
    if (map && listings.length > 0) {
      addMarkersToMap(map);
    }
  }, [listings, map]);

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
      
      {selectedListing && infoWindowPosition && (
        <div className="absolute inset-0 pointer-events-none">
          <Link 
            href={`/listings/${selectedListing.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bg-white rounded-lg shadow-md overflow-hidden pointer-events-auto cursor-pointer hover:shadow-lg transition-shadow duration-300"
            style={{
              width: '210px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000
            }}
          >
            <div className="relative overflow-hidden">
              <img 
                src={(() => {
                  const currentIndex = currentImageIndices[selectedListing.id] || 0;
                  const imageUrl = selectedListing.images && selectedListing.images.length > 0 
                    ? `http://localhost:4000${selectedListing.images[currentImageIndices[selectedListing.id] || 0]?.url || selectedListing.images[0].url}` 
                    : "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80";
                  return imageUrl;
                })()}
                alt={selectedListing.title} 
                className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300" 
              />
              
              {selectedListing.images && selectedListing.images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full z-10">
                  {(currentImageIndices[selectedListing.id] || 0) + 1} / {selectedListing.images.length}
                </div>
              )}
              
              {user && selectedListing.user_id && user.id === selectedListing.user_id ? (
                <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                  Your Listing
                </div>
              ) : (
                <button 
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={`absolute top-2 left-2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all duration-200 disabled:opacity-50`}
                  title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  {wishlistLoading ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg 
                      className={`w-4 h-4 ${isInWishlist ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
                      fill={isInWishlist ? 'currentColor' : 'none'} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                </button>
              )}
              
              <button 
                className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedListing(null);
                  setInfoWindowPosition(null);
                }}
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {selectedListing.images && selectedListing.images.length > 1 && (
                <>
                  {/* Left arrow - only show if not on first image */}
                  {(currentImageIndices[selectedListing.id] || 0) > 0 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePrevImage(selectedListing.id);
                      }}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-all duration-200 opacity-0 hover:opacity-100"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {/* Right arrow - only show if not on last image */}
                  {(currentImageIndices[selectedListing.id] || 0) < selectedListing.images.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNextImage(selectedListing.id);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-all duration-200 opacity-0 hover:opacity-100"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
            
            <div className="p-4 flex flex-col flex-1 justify-between min-h-[100px]">
              {/* Title */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-gray-700 truncate w-full">{selectedListing.title}</h3>
              </div>
              
              {/* Host Info */}
              {selectedListing.name && (
                <div className="flex items-center mb-3">
                  <span className="text-sm font-medium text-gray-700 truncate w-full">
                    Hosted by {getUniversityDisplay(selectedListing.university_name)} student
                  </span>
                </div>
              )}
              
              {/* Property Details */}
              <div className="flex items-center text-sm text-gray-700 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">{selectedListing.bedrooms}</span>
                    <img src="/icons/bed.png" alt="bed" className="w-4 h-4 ml-1" />
                  </div>
                  <span>•</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">{selectedListing.bathrooms}</span>
                    <img src="/icons/bath-tub.png" alt="bathroom" className="w-4 h-4 ml-1" />
                  </div>
                  {selectedListing.totalReviews && selectedListing.totalReviews > 0 ? (
                    <>
                      <span>•</span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 text-black fill-current mr-1" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">{selectedListing.averageRating?.toFixed(1) || '0.0'}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>•</span>
                      <span className="text-gray-500">No reviews</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Price section at the bottom */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-black">
                  {(() => {
                    if (dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate) {
                      const checkIn = new Date(dateRange[0].startDate);
                      const checkOut = new Date(dateRange[0].endDate);
                      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                      const totalPrice = nights * selectedListing.price_per_night;
                      return (
                        <>
                          <span className="text-sm font-semibold text-black-600">${Number(totalPrice).toLocaleString()}</span>
                          <span className="text-sm font-normal text-gray-600"> for {nights} night{nights !== 1 ? 's' : ''}</span>
                        </>
                      );
                    } else {
                      return (
                        <>
                          {selectedListing.price_per_night ? `$${Math.round(selectedListing.price_per_night)}` : 'N/A'}
                          <span className="text-sm font-normal text-gray-500 ml-1">per night</span>
                        </>
                      );
                    }
                  })()}
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