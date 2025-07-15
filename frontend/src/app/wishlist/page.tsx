"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import ListingCard from '../../components/ListingCard';

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
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchWishlist = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/wishlist/user/${user.id}`);
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
        <Navbar />
        <div className="pt-32 pb-8 px-4">
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
      <Navbar />
      <div className="pt-32 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Wishlist</h1>
          </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  currentImageIndex={currentImageIndex[item.listing_id] || 0}
                  onImageChange={(listingId, newIndex) => {
                    setCurrentImageIndex(prev => ({
                      ...prev,
                      [listingId]: newIndex
                    }));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 