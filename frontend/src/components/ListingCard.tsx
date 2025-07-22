import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

interface ListingCardProps {
  id: string;
  title: string;
  images?: Array<{ url: string }>;
  name?: string;
  avatar_url?: string;
  university_name?: string;
  bedrooms?: number;
  bathrooms?: number;
  price_per_night: number;
  dateRange?: Array<{ startDate: Date; endDate: Date; key: string }>;
  href?: string;
  averageRating?: number;
  totalReviews?: number;
  amenities?: any[];
  hideWishlist?: boolean;
  wishlistMode?: boolean;
  shortCard?: boolean;
  onAvatarClick?: () => void;
}

const CARD_HEIGHT = 'h-[420px]';
const SHORT_CARD_HEIGHT = 'h-[220px]';
const IMAGE_HEIGHT = 'h-56'; // About 224px

const ListingCard: React.FC<ListingCardProps> = ({
  id,
  title,
  images = [],
  name,
  avatar_url,
  university_name,
  bedrooms = 1,
  bathrooms = 1,
  price_per_night,
  dateRange,
  href,
  averageRating,
  totalReviews,
  amenities = [],
  hideWishlist = false,
  wishlistMode = false,
  shortCard = false,
  onAvatarClick
}) => {
  const { user } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImageIndex((prev) => prev === 0 ? images.length - 1 : prev - 1);
    }
  };

  const imageUrl = images.length > 0 
    ? `http://localhost:4000${images[currentImageIndex]?.url || images[0].url}` 
    : "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80";

  const totalPrice = dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate ? (() => {
    const checkIn = new Date(dateRange[0].startDate);
    const checkOut = new Date(dateRange[0].endDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights * price_per_night;
  })() : null;

  const nights = dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate ? (() => {
    const checkIn = new Date(dateRange[0].startDate);
    const checkOut = new Date(dateRange[0].endDate);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  })() : null;

  // Check if listing is in wishlist
  useEffect(() => {
    if (!user) return;

    const checkWishlistStatus = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/wishlist/check/${user.id}/${id}`);
        if (response.ok) {
          const data = await response.json();
          setIsInWishlist(data.inWishlist);
        }
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [user, id]);

  // Listen for wishlist changes from other components
  useEffect(() => {
    const handleWishlistChange = (event: CustomEvent) => {
      const { listingId, inWishlist } = event.detail;
      if (listingId === id) {
        setIsInWishlist(inWishlist);
      }
    };

    window.addEventListener('wishlistChanged', handleWishlistChange as EventListener);
    return () => {
      window.removeEventListener('wishlistChanged', handleWishlistChange as EventListener);
    };
  }, [id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Please log in to add items to your wishlist');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(`http://localhost:4000/api/wishlist/${user.id}/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setIsInWishlist(false);
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: id, inWishlist: false }
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
            listing_id: id,
          }),
        });
        if (response.ok) {
          setIsInWishlist(true);
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: id, inWishlist: true }
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

  // Function to get icon for amenity
  const getAmenityIcon = (amenityName: string) => {
    const name = amenityName.toLowerCase();
    
    // WiFi/Internet
    if (name.includes('wifi') || name.includes('internet')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    }
    
    // Parking
    if (name.includes('parking')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    }
    
    // Kitchen
    if (name.includes('kitchen')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a3 3 0 106 0l-3-9zm9 0a3 3 0 11-6 0l3 9a3 3 0 006 0l3-9zm-3 1m0 0l3 9a3 3 0 11-6 0l3-9z" />
        </svg>
      );
    }
    
    // Washer
    if (name.includes('washer')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }
    
    // Dryer
    if (name.includes('dryer')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }
    
    // Air Conditioning
    if (name.includes('ac') || name.includes('air conditioning')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    
    // Heating
    if (name.includes('heating')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
      );
    }
    
    // TV
    if (name.includes('tv') || name.includes('television')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    
    // Gym
    if (name.includes('gym')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
        </svg>
      );
    }
    
    // Fitness
    if (name.includes('fitness')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6v6m0 0v6m0-6h6m-6 0H3" />
        </svg>
      );
    }
    
    // Pool
    if (name.includes('pool')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    }
    
    // Swimming
    if (name.includes('swimming')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    }
    
    // Balcony
    if (name.includes('balcony')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    }
    
    // Terrace
    if (name.includes('terrace')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }
    
    // Patio
    if (name.includes('patio')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      );
    }
    
    // Elevator
    if (name.includes('elevator')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }
    
    // Doorman
    if (name.includes('doorman')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    }
    
    // Security
    if (name.includes('security')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    }
    
    // Workspace
    if (name.includes('workspace') || name.includes('desk')) {
      return (
        <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    
    // Default icon for other amenities
    return (
      <svg className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    );
  };

  return (
    <Link href={href || `/listings/${id}`} className="no-underline">
      <div className={`w-[320px] bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer relative group flex flex-col ${shortCard ? SHORT_CARD_HEIGHT : CARD_HEIGHT}`}>
        {/* Image Container */}
        <div className={`relative w-full bg-gray-200 overflow-hidden ${IMAGE_HEIGHT} group/image-area`}>
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Image Navigation - show only on hover */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-all duration-200 opacity-0 group-hover/image-area:opacity-100"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-all duration-200 opacity-0 group-hover/image-area:opacity-100"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          {/* Image Counter - bottom right */}
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full z-10">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
          
          {/* Wishlist Button */}
          {!hideWishlist && (
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className="absolute top-2 left-2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all duration-200 disabled:opacity-50"
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 justify-between min-h-[100px]">
          {/* Title */}
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 w-full">{title}</h3>
          </div>
          {/* Host Info - only if not shortCard */}
          {!shortCard && name && (
            <div className="flex items-center mb-2">
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt={name}
                  className="w-10 h-10 rounded-full mr-2 cursor-pointer"
                  onClick={e => { e.stopPropagation(); e.preventDefault(); onAvatarClick && onAvatarClick(); }}
                />
              ) : (
                <div
                  className="w-10 h-10 bg-gray-300 rounded-full mr-2 flex items-center justify-center cursor-pointer"
                  onClick={e => { e.stopPropagation(); e.preventDefault(); onAvatarClick && onAvatarClick(); }}
                >
                  <span className="text-lg text-gray-600 font-semibold">{name?.charAt(0)}</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                {university_name && (
                  <span className="text-sm text-gray-500">{university_name}</span>
                )}
              </div>
            </div>
          )}
          {/* Property Details */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <span>{bedrooms} bed{bedrooms !== 1 ? 's' : ''}</span>
            {totalReviews && totalReviews > 0 ? (
              <>
                <span className="mx-1">•</span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 text-black fill-current mr-1" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{averageRating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-500 ml-1">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
                </span>
              </>
            ) : (
              <>
                <span className="mx-1">•</span>
                <span className="text-gray-500">No reviews</span>
              </>
            )}
          </div>
          {/* Price/total price section at the bottom */}
          {!shortCard && (
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-black">
                {(() => {
                  if (dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate) {
                    const checkIn = new Date(dateRange[0].startDate);
                    const checkOut = new Date(dateRange[0].endDate);
                    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                    const totalPrice = nights * price_per_night;
                    return (
                      <>
                        <span className="text-lg font-semibold text-black">${Math.round(price_per_night)}</span>
                        <span className="text-sm font-normal text-gray-500"> per night, </span>
                        <span className="text-lg font-semibold text-black">${Number(totalPrice).toLocaleString()}</span>
                        <span className="text-sm font-normal text-gray-500"> for {nights} night{nights !== 1 ? 's' : ''}</span>
                      </>
                    );
                  } else {
                    return (
                      <>
                        {price_per_night ? `$${Math.round(price_per_night)}` : 'N/A'}
                        <span className="text-sm font-normal text-gray-500 ml-1">per night</span>
                      </>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Amenities Modal */}
        {showAmenitiesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAmenitiesModal(false)}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg merriweather-bold mb-4">Amenities</h3>
              <div className="grid grid-cols-1 gap-2">
                {amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    {getAmenityIcon(amenity.name)}
                    <span className="text-sm merriweather-regular">{amenity.name}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowAmenitiesModal(false)}
                className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-lg merriweather-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ListingCard; 