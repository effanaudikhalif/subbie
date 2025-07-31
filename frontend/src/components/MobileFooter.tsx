"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileFooterProps {
  isVisible?: boolean;
  isListingPage?: boolean;
  onAvailableDatesClick?: () => void;
  onMessageClick?: () => void;
  price?: string;
  priceLabel?: string;
  availableDatesLabel?: string;
}

export default function MobileFooter({ 
  isVisible = true, 
  isListingPage = false,
  onAvailableDatesClick,
  onMessageClick,
  price,
  priceLabel,
  availableDatesLabel
}: MobileFooterProps) {
  const pathname = usePathname();
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const footerRef = useRef<HTMLDivElement>(null);

  // Handle scroll detection for footer visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Determine scroll direction
      if (currentScrollY > lastScrollY) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      
      // Show footer when scrolling down, hide when scrolling up
      if (scrollDirection === 'down') {
        setIsFooterVisible(true);
      } else if (scrollDirection === 'up' && currentScrollY > 100) {
        setIsFooterVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY, scrollDirection]);

  if (!isVisible) return null;

  // If it's a listing page, show the custom footer
  if (isListingPage) {
    return (
      <div 
        ref={footerRef}
        className={`fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-50 shadow-lg transition-transform duration-300 ${
          isFooterVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Available Dates Button */}
        <button
          onClick={onAvailableDatesClick}
          className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors pl-2"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
                      <span className="text-xs">{availableDatesLabel || "Available dates"}</span>
        </button>

        {/* Price Display */}
        <div className="flex flex-col items-center">
          <div className="text-lg font-bold text-black">{price}</div>
          <div className="text-xs text-gray-500">{priceLabel}</div>
        </div>

        {/* Message Button */}
        <button
          onClick={onMessageClick}
          className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors pr-2"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
                      <span className="text-xs">Message</span>
        </button>
      </div>
    );
  }

  // Default footer for other pages
  return (
    <div 
      ref={footerRef}
      className={`fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-around z-50 shadow-lg transition-transform duration-300 ${
        isFooterVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <Link 
        href="/my-listings" 
        className={`flex flex-col items-center transition-colors ${
          pathname === '/my-listings' 
            ? 'text-[#368a98]' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
                    <span className="text-xs">Host</span>
      </Link>
      
      <Link 
        href="/messages" 
        className={`flex flex-col items-center transition-colors ${
          pathname === '/messages' 
            ? 'text-[#368a98]' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
                    <span className="text-xs">Messages</span>
      </Link>
      
      <Link 
        href="/listings?where=Boston" 
        className={`flex flex-col items-center transition-colors ${
          pathname === '/listings' 
            ? 'text-[#368a98]' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
                    <span className="text-xs">Search</span>
      </Link>
      
      <Link 
        href="/wishlist" 
        className={`flex flex-col items-center transition-colors ${
          pathname === '/wishlist' 
            ? 'text-[#368a98]' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
                    <span className="text-xs">Wishlist</span>
      </Link>
      
      <Link 
        href="/profile" 
        className={`flex flex-col items-center transition-colors ${
          pathname === '/profile' 
            ? 'text-[#368a98]' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
                    <span className="text-xs">Profile</span>
      </Link>
    </div>
  );
} 