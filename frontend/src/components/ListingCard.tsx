import React, { useState } from 'react';

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
  currentImageIndex?: number;
  onImageChange?: (listingId: string, newIndex: number) => void;
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
  currentImageIndex = 0,
  onImageChange
}) => {
  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 1 && onImageChange) {
      onImageChange(id, (currentImageIndex + 1) % images.length);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 1 && onImageChange) {
      onImageChange(id, currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
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
          <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
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
          
          {/* Beds • Baths */}
          <div className="text-gray-500 text-sm mb-2">
            {bedrooms} bed{bedrooms !== 1 ? 's' : ''} • {bathrooms} bath{bathrooms !== 1 ? 's' : ''}
          </div>
          
          {/* Price per night • Total for nights */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-bold text-black text-lg">${Math.round(price_per_night)}</span>
              <span className="text-gray-500 text-sm ml-1">per night</span>
              {totalPrice && nights && (
                <>
                  <span className="text-gray-500 text-sm mx-1">•</span>
                  <span className="font-bold text-black text-lg">
                    ${Math.round(totalPrice)}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">
                    for {nights} night{nights !== 1 ? 's' : ''}
                  </span>
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