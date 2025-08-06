"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { buildApiUrl, buildImageUrl } from '../utils/api';

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
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const prevSearchLocationRef = useRef<string | undefined>(undefined);
  const redMarkerRef = useRef<google.maps.Marker | null>(null);
  const searchLocationCoords = useRef<{ lat: number, lng: number } | null>(null);
  const overlayRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 1024;
      console.log('Mobile detection:', mobile, 'Window width:', window.innerWidth);
      setIsMobile(mobile);
      
      // Hide circular controls on mobile using JavaScript
      if (mobile) {
        const style = document.createElement('style');
        style.id = 'mobile-map-controls';
        style.textContent = `
          .gm-style-moc,
          .gm-style-mt,
          .gm-style-ml,
          .gm-control-active,
          .gm-style-moc button,
          .gm-style-mt button,
          .gm-style-ml button,
          [data-control-width="40"],
          [data-control-width="28"],
          .gm-style button[aria-label*="My location"],
          .gm-style button[aria-label*="Location"],
          .gm-style button[aria-label*="Zoom"],
          .gm-style button[aria-label*="Map"] {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
      } else {
        // Remove mobile styles on desktop
        const existingStyle = document.getElementById('mobile-map-controls');
        if (existingStyle) {
          existingStyle.remove();
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      // Clean up mobile styles
      const existingStyle = document.getElementById('mobile-map-controls');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Custom OverlayView class for the listing card - defined inside component
  const createListingCardOverlay = (google: any) => {
    return class ListingCardOverlay extends google.maps.OverlayView {
      private div!: HTMLDivElement;
      private position: google.maps.LatLng;
      private listing: Listing;
      private onClose: () => void;
      private onNextImage: (listingId: string) => void;
      private onPrevImage: (listingId: string) => void;
      private onToggleWishlist: (e: React.MouseEvent) => void;
      private currentImageIndex: number;
      private isInWishlist: boolean;
      private wishlistLoading: boolean;
      private user: any;

      constructor(
        position: google.maps.LatLng,
        listing: Listing,
        onClose: () => void,
        onNextImage: (listingId: string) => void,
        onPrevImage: (listingId: string) => void,
        onToggleWishlist: (e: React.MouseEvent) => void,
        currentImageIndex: number,
        isInWishlist: boolean,
        wishlistLoading: boolean,
        user: any
      ) {
        super();
        this.position = position;
        this.listing = listing;
        this.onClose = onClose;
        this.onNextImage = onNextImage;
        this.onPrevImage = onPrevImage;
        this.onToggleWishlist = onToggleWishlist;
        this.currentImageIndex = currentImageIndex;
        this.isInWishlist = isInWishlist;
        this.wishlistLoading = wishlistLoading;
        this.user = user;
      }

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.zIndex = '1000';
        this.div.style.pointerEvents = 'auto';
        this.div.style.transform = 'translate(-50%, -100%)';
        this.div.style.marginTop = '-10px';
        
        this.renderContent();
        const panes = this.getPanes();
        if (panes && panes.overlayMouseTarget) {
          panes.overlayMouseTarget.appendChild(this.div);
        }
      }

      draw() {
        if (!this.div) return;

        const projection = this.getProjection();
        if (!projection) return;

        const point = projection.fromLatLngToDivPixel(this.position);
        if (point) {
          this.div.style.left = point.x + 'px';
          this.div.style.top = point.y + 'px';
        }
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
        }
      }

      updateContent(
        currentImageIndex: number,
        isInWishlist: boolean,
        wishlistLoading: boolean
      ) {
        this.currentImageIndex = currentImageIndex;
        this.isInWishlist = isInWishlist;
        this.wishlistLoading = wishlistLoading;
        this.renderContent();
      }

      private getUniversityDisplay = (universityName: string | undefined) => {
        if (!universityName) return '';
        
        const fullText = `Hosted by ${universityName} student`;
        
        if (fullText.length <= 25) {
          return universityName;
        }
        
        const words = universityName.split(' ');
        const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
        
        return initials;
      };

      private renderContent() {
        if (!this.div) return;

        this.div.innerHTML = `
          <div class="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300" style="width: 210px; background-color: #ffffff; font-family: var(--font-amaranth), 'Amaranth', sans-serif;">
            <div class="relative overflow-hidden">
              <img 
                src="${(() => {
                  const imageUrl = this.listing.images && this.listing.images.length > 0 
                    ? buildImageUrl(this.listing.images[this.currentImageIndex]?.url || this.listing.images[0].url) 
                    : "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80";
                  return imageUrl;
                })()}"
                alt="${this.listing.title}" 
                class="w-full h-40 object-cover hover:scale-105 transition-transform duration-300" 
              />
              

              
              ${this.user && this.listing.user_id && this.user.id === this.listing.user_id ? `
                <div class="absolute top-2 left-2 bg-white bg-opacity-90 rounded-full px-3 py-1 text-xs font-medium text-gray-700" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">
                  Your Listing
                </div>
              ` : `
                <button 
                  class="absolute top-2 left-2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all duration-200 ${this.wishlistLoading ? 'opacity-50' : ''}"
                  title="${this.isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}"
                  onclick="window.toggleWishlist(event, '${this.listing.id}')"
                >
                  ${this.wishlistLoading ? `
                    <div class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ` : `
                    <svg 
                      class="w-4 h-4 ${this.isInWishlist ? 'text-red-500 fill-current' : 'text-gray-600'}" 
                      fill="${this.isInWishlist ? 'currentColor' : 'none'}" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  `}
                </button>
              `}
              
              <button 
                class="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all duration-200"
                onclick="window.closeListingCard()"
              >
                <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              ${this.listing.images && this.listing.images.length > 1 ? `
                ${this.currentImageIndex > 0 ? `
                  <button
                    onclick="window.prevImage('${this.listing.id}')"
                    class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-all duration-200 opacity-0 hover:opacity-100"
                  >
                    <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                ` : ''}
                ${this.currentImageIndex < this.listing.images.length - 1 ? `
                  <button
                    onclick="window.nextImage('${this.listing.id}')"
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-all duration-200 opacity-0 hover:opacity-100"
                  >
                    <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ` : ''}
              ` : ''}
            </div>
            
            <div class="p-4 flex flex-col flex-1 justify-between min-h-[100px]" style="background-color: #ffffff; font-family: var(--font-amaranth), 'Amaranth', sans-serif;">
              <div class="flex justify-between items-start mb-2">
                <h3 class="text-sm font-semibold text-gray-700 truncate w-full" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">${this.listing.title}</h3>
              </div>
              
              ${this.listing.name ? `
                <div class="flex items-center mb-3">
                  <span class="text-sm font-medium text-gray-700 truncate w-full" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">
                    Hosted by ${this.getUniversityDisplay(this.listing.university_name)} student
                  </span>
                </div>
              ` : ''}
              
              <div class="flex items-center text-sm text-gray-700 mb-3" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">
                <div class="flex items-center space-x-2">
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-700" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">${this.listing.bedrooms}</span>
                    <img src="/icons/bed.png" alt="bed" class="w-4 h-4 ml-1" />
                  </div>
                  <span>•</span>
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-700" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">${this.listing.bathrooms}</span>
                    <img src="/icons/bath-tub.png" alt="bathroom" class="w-4 h-4 ml-1" />
                  </div>
                  ${this.listing.totalReviews && this.listing.totalReviews > 0 ? `
                    <span>•</span>
                    <span class="flex items-center">
                      <svg class="w-4 h-4 text-black fill-current mr-1" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span class="text-sm font-medium text-gray-700" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">${this.listing.averageRating?.toFixed(1) || '0.0'}</span>
                    </span>
                  ` : `
                    <span>•</span>
                    <span class="text-gray-500" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">No reviews</span>
                  `}
                </div>
              </div>
              
              <div class="flex items-center justify-between">
                <div class="text-sm font-semibold text-black" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">
                  ${(() => {
                    // This would need to be calculated based on dateRange prop
                    return `
                      ${this.listing.price_per_night ? `$${Math.round(this.listing.price_per_night)}` : 'N/A'}
                      <span class="text-sm font-normal text-gray-500 ml-1" style="font-family: var(--font-amaranth), 'Amaranth', sans-serif;">per night</span>
                    `;
                  })()}
                </div>
              </div>
            </div>
          </div>
        `;

        // Add click handler for the entire card
        this.div.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target && !target.closest('button')) {
            // Check if user is logged in
            if (!this.user) {
              window.open('/login', '_blank');
              return;
            }
            window.open(`/listings/${this.listing.id}`, '_blank');
          }
        });
      }
    };
  };

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
        const response = await fetch(buildApiUrl(`/api/wishlist/check/${user.id}/${selectedListing.id}`));
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
        const response = await fetch(buildApiUrl(`/api/wishlist/${user.id}/${selectedListing.id}`), {
          method: 'DELETE',
        });
        if (response.ok) {
          setIsInWishlist(false);
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: selectedListing.id, inWishlist: false }
          }));
        }
      } else {
        const response = await fetch(buildApiUrl(`/api/wishlist`), {
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

  const closeListingCard = () => {
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
    setSelectedListing(null);
  };

  // Set up global functions for the overlay
  useEffect(() => {
    (window as any).closeListingCard = closeListingCard;
    (window as any).nextImage = handleNextImage;
    (window as any).prevImage = handlePrevImage;
    (window as any).toggleWishlist = toggleWishlist;

    return () => {
      delete (window as any).closeListingCard;
      delete (window as any).nextImage;
      delete (window as any).prevImage;
      delete (window as any).toggleWishlist;
    };
  }, [selectedListing, currentImageIndices, isInWishlist, wishlistLoading]);

  const addMarkersToMap = (mapInstance: google.maps.Map) => {
    // Clear existing markers first
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (searchLocation) {
      const marker = new google.maps.Marker({
        position: searchLocationCoords.current,
        map: mapInstance,
        title: searchLocation,
        icon: {
          url: '/icons/icons8-google-maps-old-50.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      });
    }

    // Collision detection system to prevent any marker overlap
    const MIN_DISTANCE = 0.0008; // Minimum distance between markers (approximately 35 pixels)
    const markerPositions: Array<{ lat: number; lng: number; listing: any }> = [];
    
    // Process each listing and find a non-overlapping position
    listings.forEach(listing => {
      if (listing.latitude && listing.longitude) {
        const lat = parseFloat(listing.latitude as any);
        const lng = parseFloat(listing.longitude as any);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          let finalPosition = { lat, lng };
          let attempts = 0;
          const maxAttempts = 20;
          
          // Keep trying positions until we find one that doesn't overlap
          while (attempts < maxAttempts) {
            let hasCollision = false;
            
            // Check if this position collides with any existing marker
            for (const existingMarker of markerPositions) {
              const distance = Math.sqrt(
                Math.pow(finalPosition.lat - existingMarker.lat, 2) + 
                Math.pow(finalPosition.lng - existingMarker.lng, 2)
              );
              
              if (distance < MIN_DISTANCE) {
                hasCollision = true;
                break;
              }
            }
            
            if (!hasCollision) {
              // Found a good position!
              break;
            }
            
            // Try a new position - stack vertically with slight horizontal variation
            const stackLevel = Math.floor(attempts / 4); // Every 4 attempts, go up one level
            const horizontalVariation = (attempts % 4) * 0.0002; // Small horizontal spread within each level
            
            finalPosition = {
              lat: lat + (stackLevel * MIN_DISTANCE),
              lng: lng + horizontalVariation - 0.0003 // Center the horizontal spread
            };
            
            attempts++;
          }
          
          markerPositions.push({ lat: finalPosition.lat, lng: finalPosition.lng, listing });
        }
      }
    });

    const newMarkers: google.maps.Marker[] = [];
    
    // Create markers using the collision-free positions
    markerPositions.forEach((markerPos, index) => {
      const listing = markerPos.listing;
      let displayPrice = listing.price_per_night;
      
      if (dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate) {
        const checkIn = new Date(dateRange[0].startDate);
        const checkOut = new Date(dateRange[0].endDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        displayPrice = nights * listing.price_per_night;
      }
      
      const marker = new google.maps.Marker({
        position: { lat: markerPos.lat, lng: markerPos.lng },
        map: mapInstance,
        title: listing.title,
        icon: {
          path: 'M-10,-8 L10,-8 L10,8 L-10,8 Z',
          scale: 1,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
          strokeColor: '#000000',
          strokeWeight: 2
        },
        label: {
          text: `$${Math.round(displayPrice)}`,
          className: 'rectangular-marker-label',
          color: '#000000',
          fontSize: '12px',
          fontWeight: 'bold'
        },
        zIndex: 1000 + index
      });

      marker.addListener('click', () => {
        setSelectedListing(listing);
        
        // Create new overlay
        const position = new google.maps.LatLng(markerPos.lat, markerPos.lng);
        const ListingCardOverlayClass = createListingCardOverlay(google);
        const overlay = new ListingCardOverlayClass(
          position,
          listing,
          closeListingCard,
          handleNextImage,
          handlePrevImage,
          toggleWishlist,
          currentImageIndices[listing.id] || 0,
          isInWishlist,
          wishlistLoading,
          user
        );
        
        overlay.setMap(mapInstance);
        overlayRef.current = overlay;
      });

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
  };

  // Update overlay content when state changes
  useEffect(() => {
    if (overlayRef.current && selectedListing) {
      overlayRef.current.updateContent(
        currentImageIndices[selectedListing.id] || 0,
        isInWishlist,
        wishlistLoading
      );
    }
  }, [currentImageIndices, isInWishlist, wishlistLoading, selectedListing]);

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
            
            console.log('Creating map with zoomControl disabled');
            const mapInstance = new google.maps.Map(mapRef.current!, {
              center,
              zoom: 12,
              minZoom: 10, // Prevent zooming in too close for privacy
              maxZoom: 15, // Prevent zooming in too close for privacy
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              zoomControl: false, // Disable zoom control for both desktop and mobile
              styles: [
                {
                  featureType: 'poi',
                  elementType: 'labels',
                  stylers: [{ visibility: 'off' }]
                }
              ],
              backgroundColor: '#ffffff'
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
      // Add a small delay to ensure mobile detection is complete
      setTimeout(() => {
        initMap();
      }, 100);
    } else if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
    }
  }, [searchLocation, onBoundsChange, isMobile]);

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
    <div className={`relative ${className}`} style={{
      WebkitBorderRadius: className?.includes('rounded-none') ? '0' : '0.5rem',
      borderRadius: className?.includes('rounded-none') ? '0' : '0.5rem',
      overflow: 'hidden',
      WebkitTransform: 'translate3d(0, 0, 0)',
      transform: 'translate3d(0, 0, 0)'
    }}>
      <div 
        ref={mapRef} 
        className={`w-full h-full ${className?.includes('rounded-none') ? 'rounded-none' : 'rounded-lg'}`}
        style={{ 
          minHeight: '400px',
          WebkitBorderRadius: className?.includes('rounded-none') ? '0' : '0.5rem',
          borderRadius: className?.includes('rounded-none') ? '0' : '0.5rem',
          WebkitTransform: 'translate3d(0, 0, 0)',
          transform: 'translate3d(0, 0, 0)',
          backgroundColor: '#ffffff'
        }}
      />
      {/* CSS to hide controls on mobile only */}
      <style jsx>{`
        /* Hide zoom controls specifically */
        .gm-bundled-control {
          display: none !important;
        }
        .gmnoprint {
          display: none !important;
        }
        /* Hide zoom control buttons specifically */
        .gm-control-active {
          display: none !important;
        }
        /* Hide circular controls on mobile only */
        @media (max-width: 1024px) {
          .gm-style-moc,
          .gm-style-mt,
          .gm-style-ml,
          .gm-control-active,
          .gm-style-moc button,
          .gm-style-mt button,
          .gm-style-ml button,
          [data-control-width="40"],
          [data-control-width="28"],
          .gm-style button[aria-label*="My location"],
          .gm-style button[aria-label*="Location"],
          .gm-style button[aria-label*="Zoom"],
          .gm-style button[aria-label*="Map"] {
            display: none !important;
          }
        }
      `}</style>
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
});

export default LocationMapPreview; 