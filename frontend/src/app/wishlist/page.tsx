"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import MobileNavbar from '../../components/MobileNavbar';
import ListingCard from '../../components/ListingCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '../../utils/api';

interface WishlistItem {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  price_per_night: number;
  images: Array<{ url: string }>;
  name?: string;
  avatar_url?: string;
  university_name?: string;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  guest_space?: string;
}

export default function WishlistPage() {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRatings, setAverageRatings] = useState<Record<string, { average_rating: number; total_reviews: number }>>({});
  const [isMobile, setIsMobile] = useState(false);
  
  // MobileNavbar state
  const [where, setWhere] = useState('');
  const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]);
  const router = useRouter();
  
  // Search handler for MobileNavbar
  const handleSearch = () => {
    const checkin = dateRange[0].startDate ? new Date(dateRange[0].startDate).toISOString().slice(0,10) : '';
    const checkout = dateRange[0].endDate ? new Date(dateRange[0].endDate).toISOString().slice(0,10) : '';
    router.push(
      `/listings?where=${encodeURIComponent(where)}&checkin=${checkin}&checkout=${checkout}`
    );
  };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchWishlist = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/wishlist/user/${user.id}`));
        if (!response.ok) {
          throw new Error('Failed to fetch wishlist');
        }
        const data = await response.json();
        setWishlistItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch wishlist');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user]);

  // Fetch average ratings for listings
  useEffect(() => {
    fetch(buildApiUrl('/api/listings/average-ratings'))
      .then(res => res.json())
      .then(data => {
        setAverageRatings(data);
      })
      .catch(() => setAverageRatings({}));
  }, []);

  // Handle removing item from wishlist
  const handleRemoveFromWishlist = (listingId: string) => {
    setWishlistItems(prev => prev.filter(item => item.listing_id !== listingId));
  };

  // Listen for wishlist changes from ListingCard components
  useEffect(() => {
    const handleWishlistChange = (event: CustomEvent) => {
      const { listingId, inWishlist } = event.detail;
      if (!inWishlist) {
        // Remove from wishlist when heart is unclicked
        handleRemoveFromWishlist(listingId);
      }
    };

    window.addEventListener('wishlistChanged', handleWishlistChange as EventListener);
    return () => {
      window.removeEventListener('wishlistChanged', handleWishlistChange as EventListener);
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isMobile ? (
          <MobileNavbar
            where={where}
            setWhere={setWhere}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onSearch={handleSearch}
            isWishlistPage={true}
          />
        ) : (
          <Navbar />
        )}
        <div className={`${isMobile ? 'pt-20' : 'pt-32'} pb-8 px-4`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Wishlist</h1>
              <p className="text-gray-600">Please log in to view your wishlist.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? (
        <MobileNavbar
          where={where}
          setWhere={setWhere}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onSearch={handleSearch}
          isWishlistPage={true}
        />
      ) : (
        <Navbar />
      )}
              <div className={`${isMobile ? 'pt-32' : 'pt-32'} pb-8 px-4`}>
        {!isMobile && (
          <div className="mb-8 pl-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Wishlist</h1>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your wishlist...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No wishlist items</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start exploring listings and add them to your wishlist to see them here.
              </p>
            </div>
          </div>
        ) : (
          <div className={`${isMobile ? 'mb-8 flex justify-center' : 'mb-8 pl-8'}`}>
            <div className={`${isMobile ? 'flex flex-wrap -mx-1 -my-2 justify-center' : 'flex flex-wrap -mx-1 -my-2'}`}>
              {wishlistItems.map((item) => (
                <ListingCard
                  key={item.id}
                  id={item.listing_id}
                  title={item.title}
                  images={item.images}
                  name={item.name}
                  avatar_url={item.avatar_url}
                  university_name={item.university_name}
                  bedrooms={item.bedrooms}
                  bathrooms={item.bathrooms}
                  price_per_night={item.price_per_night}
                  averageRating={averageRatings[item.listing_id]?.average_rating}
                  totalReviews={averageRatings[item.listing_id]?.total_reviews}
                  wishlistMode={true}
                  cardMargin={isMobile ? "mx-4 my-4" : "mx-4 my-4"}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Footer - Only show on mobile */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-around z-50 shadow-lg">
          <Link 
            href="/my-listings" 
            className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs">Listings</span>
          </Link>
          
          <Link 
            href="/messages" 
            className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">Messages</span>
          </Link>
          
          <Link 
            href="/wishlist" 
            className="flex flex-col items-center text-teal-600 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">Wishlist</span>
          </Link>
          
          <Link 
            href="/profile" 
            className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
} 