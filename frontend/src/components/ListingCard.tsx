import React, { useState, useEffect } from 'react';
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
}

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
  totalReviews
}) => {
  const { user } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  return (
    <a
      href={href || `/listings/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="flex flex-col">
        {/* Image Container */}
        <div className="relative">
          <img 
            src={imageUrl}
            alt={title} 
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
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              {/* Left Arrow - only show if not on first image */}
              {currentImageIndex > 0 && (
                <button 
                  className="absolute top-1/2 left-3 transform -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                  onClick={handlePrevImage}
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              
              {/* Right Arrow - only show if not on last image */}
              {currentImageIndex < images.length - 1 && (
                <button 
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                  onClick={handleNextImage}
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </>
          )}
          
          {/* Image Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {images.slice(0, 5).map((_: any, index: number) => (
                <div 
                  key={index}
                  className={`w-2 h-2 bg-white rounded-full ${index === currentImageIndex ? 'opacity-100' : 'opacity-60'}`}
                />
              ))}
              {images.length > 5 && (
                <div className="w-2 h-2 bg-white rounded-full opacity-60 flex items-center justify-center">
                  <span className="text-xs text-gray-800 font-medium">+{images.length - 5}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <div className="text-black font-semibold text-lg mb-2">
            {title}
          </div>
          
          {/* Profile picture, Name, and University */}
          <div className="flex items-center mb-2">
            {avatar_url ? (
              <img 
                src={avatar_url} 
                alt={name || 'Host'} 
                className="w-8 h-8 rounded-full mr-3 flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">
                    {name ? name.charAt(0).toUpperCase() : 'H'}
                  </span>
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 text-sm font-medium">
                {name || 'Host'}
              </div>
              <div className="text-gray-500 text-xs">
                {university_name || 'University'}
              </div>
            </div>
          </div>
          
          {/* Beds • Rating */}
          <div className="text-gray-500 text-sm mb-2">
            {bedrooms} bed{bedrooms !== 1 ? 's' : ''} • {averageRating ? (
              <>
                <span className="text-black">★</span>
                <span className="ml-1">{averageRating.toFixed(1)}</span>
                {totalReviews && (
                  <span className="ml-1">({totalReviews})</span>
                )}
              </>
            ) : (
              <span className="text-gray-400">No reviews</span>
            )}
          </div>
          
          {/* Price for nights */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {totalPrice && nights ? (
                <>
                  <span className="font-bold text-black text-lg">${Math.round(totalPrice)}</span>
                  <span className="text-gray-500 text-sm ml-1">
                    for {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-black text-lg">${Math.round(price_per_night)}</span>
                  <span className="text-gray-500 text-sm ml-1">per night</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
};

export default ListingCard; 