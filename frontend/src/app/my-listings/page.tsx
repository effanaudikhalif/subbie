"use client";
import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import PrivacyMap from "../../components/PrivacyMap";
import CancellationForm from "../../components/CancellationForm";
import ReviewsSection from "../../components/ReviewsSection";
import ListingCard from "../../components/ListingCard";
import { useRouter, useSearchParams } from 'next/navigation';

interface ListingImage {
  url: string;
  order_index?: number;
}

interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  price_per_night: number;
  images: ListingImage[];
  property_type?: string;
  guest_space?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_occupancy?: number;
  amenities?: any[];
  occupants?: string[];
  status?: string; // Added for filtering
  latitude?: number;
  longitude?: number;
  name?: string;
  avatar_url?: string;
  university_name?: string;
}

interface Booking {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  total_price: number;
  status: string;
  payment_status: string;
}

export default function MyListingsPage() {
  const { user } = useAuth();
  const userId = typeof user?.id === 'string' ? user.id : null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'bookings' | 'messages'>('all');
  const [bookingFilter, setBookingFilter] = useState<'pending' | 'approved' | 'completed'>('pending');
  const [deletingListing, setDeletingListing] = useState<string | null>(null);
  
  // Lazy loading states
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['all']));
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set());

  // Function to fetch complete listing data
  const fetchCompleteListing = async (listingId: string) => {
    try {
      console.log('Fetching complete listing for ID:', listingId);
      const response = await fetch(`http://localhost:4000/api/listings/${listingId}`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const completeListing = await response.json();
        console.log('Complete listing data:', completeListing);
        setSelectedListing(completeListing);
      } else {
        console.error('Failed to fetch listing:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching complete listing:', error);
    }
  };

  // Messages tab state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<any | null>(null);
  const [guestProfiles, setGuestProfiles] = useState<Record<string, any>>({});
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [bookingConversationId, setBookingConversationId] = useState<string | null>(null);
  const [bookingConversationLoading, setBookingConversationLoading] = useState(false);
  
  // Lazy loading function
  const loadTabData = async (tabName: string) => {
    if (loadedTabs.has(tabName) || loadingTabs.has(tabName)) return;
    
    setLoadingTabs(prev => new Set(prev).add(tabName));
    
    try {
      switch (tabName) {
        case 'bookings':
          const bookingsRes = await fetch(`http://localhost:4000/api/bookings`);
          const bookingsData = await bookingsRes.json();
          if (Array.isArray(bookingsData)) {
            setBookings(bookingsData.filter((b: Booking) => b.host_id === userId));
          }
          break;
          
        case 'messages':
          const convosRes = await fetch(`http://localhost:4000/api/conversations/user/${userId}`);
          const convosData = await convosRes.json();
          const convosWithMessages = await Promise.all(
            convosData.map(async (conversation: any) => {
              const messagesRes = await fetch(`http://localhost:4000/api/messages/conversation/${conversation.id}`);
              const messages = await messagesRes.json();
              return { ...conversation, hasMessages: messages.length > 0 };
            })
          );
          setConversations(convosWithMessages.filter(c => c.hasMessages));
          break;
          
        case 'stripe':
          // Stripe data is loaded by the StripeConnect component
          break;
      }
      
      setLoadedTabs(prev => new Set(prev).add(tabName));
    } catch (error) {
      console.error(`Error loading ${tabName} tab:`, error);
    } finally {
      setLoadingTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete(tabName);
        return newSet;
      });
    }
  };
  
  // Review popup state for host reviewing renter
  const [showRenterReviewPopup, setShowRenterReviewPopup] = useState(false);
  const [currentRenterReviewStep, setCurrentRenterReviewStep] = useState(0);
  const [renterReviewData, setRenterReviewData] = useState({
    punctuality: 0,
    communication: 0,
    property_care: 0,
    compliance: 0,
    comment: ''
  });
  const [reviewingRenterBooking, setReviewingRenterBooking] = useState<Booking | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);
  const [existingRenterReview, setExistingRenterReview] = useState<any>(null);
  const [isEditingRenterReview, setIsEditingRenterReview] = useState(false);

  // Cancellation form state
  const [showCancellationForm, setShowCancellationForm] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancellationLoading, setCancellationLoading] = useState(false);

  // Amenities modal state
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);

  // Debug: Monitor selectedListing changes
  useEffect(() => {
    console.log('Selected listing changed:', selectedListing);
  }, [selectedListing]);

  const renterReviewSteps = [
    { title: 'Punctuality', field: 'punctuality', description: 'Did the renter arrive and leave on time?' },
    { title: 'Communication', field: 'communication', description: 'How well did the renter communicate?' },
    { title: 'Property Care', field: 'property_care', description: 'How well did the renter care for your property?' },
    { title: 'Compliance', field: 'compliance', description: 'Did the renter follow house rules?' }
  ];

  // Function to get icon for amenity
  const getAmenityIcon = (amenityName: string) => {
    const name = amenityName.toLowerCase();
    
    // WiFi/Internet
    if (name.includes('wifi') || name.includes('internet')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    }
    
    // Parking
    if (name.includes('parking')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    }
    
    // Kitchen
    if (name.includes('kitchen')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a3 3 0 106 0l-3-9zm9 0a3 3 0 11-6 0l3 9a3 3 0 006 0l3-9zm-3 1m0 0l3 9a3 3 0 11-6 0l3-9z" />
        </svg>
      );
    }
    
    // Washer
    if (name.includes('washer')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }
    
    // Dryer
    if (name.includes('dryer')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }
    
    // Air Conditioning
    if (name.includes('ac') || name.includes('air conditioning')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    
    // Heating
    if (name.includes('heating')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
      );
    }
    
    // TV
    if (name.includes('tv') || name.includes('television')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    
    // Gym
    if (name.includes('gym')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
        </svg>
      );
    }
    
    // Fitness
    if (name.includes('fitness')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6v6m0 0v6m0-6h6m-6 0H3" />
        </svg>
      );
    }
    
    // Pool
    if (name.includes('pool')) {
        return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
      );
    }
    
    // Swimming
    if (name.includes('swimming')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    }
    
    // Balcony
    if (name.includes('balcony')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    }
    
    // Terrace
    if (name.includes('terrace')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }
    
    // Patio
    if (name.includes('patio')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    }
    
    // Default icon for other amenities
    return (
      <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  const handleRenterReviewStep = (rating: number) => {
    const currentField = renterReviewSteps[currentRenterReviewStep].field as keyof typeof renterReviewData;
    setRenterReviewData(prev => ({ ...prev, [currentField]: rating }));
    if (currentRenterReviewStep < renterReviewSteps.length - 1) {
      setCurrentRenterReviewStep(prev => prev + 1);
    } else {
      setCurrentRenterReviewStep(renterReviewSteps.length); // Move to comment step
    }
  };
  const handleRenterBackStep = () => {
    if (currentRenterReviewStep > 0) {
      setCurrentRenterReviewStep(prev => prev - 1);
    }
  };
  const openRenterReviewPopup = async (booking: Booking) => {
    setReviewingRenterBooking(booking);
    setShowRenterReviewPopup(true);
    setCurrentRenterReviewStep(0);
    setIsEditingRenterReview(false);
    setExistingRenterReview(null);

    // Check if user has already written a review for this booking
    if (user) {
      try {
        const response = await fetch(`http://localhost:4000/api/renter-reviews`);
        if (response.ok) {
          const allReviews = await response.json();
          const userReview = allReviews.find((review: any) => 
            review.booking_id === booking.id && 
            review.reviewer_id === user.id &&
            review.reviewed_id === booking.guest_id
          );
          
          if (userReview) {
            setExistingRenterReview(userReview);
            setIsEditingRenterReview(true);
            setRenterReviewData({
              punctuality: userReview.punctuality,
              communication: userReview.communication,
              property_care: userReview.property_care,
              compliance: userReview.compliance,
              comment: userReview.comment || ''
            });
          } else {
            setRenterReviewData({
              punctuality: 0,
              communication: 0,
              property_care: 0,
              compliance: 0,
              comment: ''
            });
          }
        }
      } catch (error) {
        console.error('Error checking existing review:', error);
        setRenterReviewData({
          punctuality: 0,
          communication: 0,
          property_care: 0,
          compliance: 0,
          comment: ''
        });
      }
    }
  };
  const handleSubmitRenterReview = async () => {
    if (!reviewingRenterBooking || !user) return;
    try {
      let response;
      
      if (isEditingRenterReview && existingRenterReview) {
        // Update existing review
        response = await fetch(`http://localhost:4000/api/renter-reviews/${existingRenterReview.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewer_id: user.id,
            ...renterReviewData
          })
        });
      } else {
        // Create new review
        response = await fetch('http://localhost:4000/api/renter-reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: reviewingRenterBooking.id,
            reviewer_id: user.id,
            reviewed_id: reviewingRenterBooking.guest_id,
            ...renterReviewData
          })
        });
      }
      
      if (response.ok) {
        alert(isEditingRenterReview ? 'Review updated successfully!' : 'Review submitted successfully!');
        setShowRenterReviewPopup(false);
        setCurrentRenterReviewStep(0);
        setRenterReviewData({
          punctuality: 0,
          communication: 0,
          property_care: 0,
          compliance: 0,
          comment: ''
        });
        setReviewingRenterBooking(null);
        setExistingRenterReview(null);
        setIsEditingRenterReview(false);
        
        // Update reviewed bookings state
        if (!isEditingRenterReview && reviewingRenterBooking) {
          setReviewedBookingIds(prev => [...prev, reviewingRenterBooking.id]);
        }
      } else {
        const error = await response.json();
        alert(`Failed to ${isEditingRenterReview ? 'update' : 'submit'} review: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(`Failed to ${isEditingRenterReview ? 'update' : 'submit'} review. Please try again.`);
    }
  };
  // Fetch already reviewed bookings for this host (on mount)
  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:4000/api/renter-reviews/reviewer/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReviewedBookingIds(data.map((r: any) => r.booking_id));
        }
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`http://localhost:4000/api/listings?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setListings([]);
        setLoading(false);
      });
  }, [userId]);

  // Load tab data when tab changes
  useEffect(() => {
    if (activeTab && !loadedTabs.has(activeTab)) {
      loadTabData(activeTab);
    }
  }, [activeTab, loadedTabs]);

  // Fetch guest profiles and listing titles for sidebar in messages tab
  useEffect(() => {
    if (activeTab !== 'messages') return;
    async function fetchDetails() {
      const otherUserIds = Array.from(new Set(
        conversations.map(c => c.guest_id)
      ));
      const listingIds = Array.from(new Set(conversations.map(c => c.listing_id)));
      const userProfilesObj: Record<string, any> = {};
      const listingTitlesObj: Record<string, string> = {};
      await Promise.all([
        ...otherUserIds.map(async (id) => {
          const res = await fetch(`http://localhost:4000/api/users/${id}`);
          if (res.ok) userProfilesObj[id] = await res.json();
        }),
        ...listingIds.map(async (id) => {
          const res = await fetch(`http://localhost:4000/api/listings/${id}`);
          if (res.ok) {
            const listing = await res.json();
            listingTitlesObj[id] = listing.title;
          }
        })
      ]);
      setGuestProfiles(userProfilesObj);
      setListingTitles(listingTitlesObj);
    }
    if (conversations.length > 0) fetchDetails();
  }, [conversations, activeTab]);

  // Fetch guest profiles for all bookings (so names show in requests/approved)
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    const guestIds = Array.from(new Set(bookings.map(b => b.guest_id)));
    const userProfilesObj: Record<string, any> = {};
    Promise.all(
      guestIds.map(async (id) => {
        const res = await fetch(`http://localhost:4000/api/users/${id}`);
        if (res.ok) userProfilesObj[id] = await res.json();
      })
    ).then(() => {
      setGuestProfiles(prev => ({ ...prev, ...userProfilesObj }));
    });
  }, [bookings]);

  useEffect(() => {
    function handleStatusChange(e: Event) {
      const { id, status } = (e as CustomEvent).detail;
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, status } : b)
      );
    }
    window.addEventListener('bookingStatusChanged', handleStatusChange);
    return () => window.removeEventListener('bookingStatusChanged', handleStatusChange);
  }, []);

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    setDeletingListing(listingId);
    try {
      const response = await fetch(`http://localhost:4000/api/listings/${listingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setListings(prev => prev.filter(l => l.id !== listingId));
        if (selectedListing?.id === listingId) {
          setSelectedListing(null);
        }
        alert('Listing deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to delete listing: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
    } finally {
      setDeletingListing(null);
    }
  };

  const handleEditListing = (listingId: string) => {
    router.push(`/edit-listing/${listingId}`);
  };

  const handleCancelBooking = (booking: Booking) => {
    setCancellingBooking(booking);
    setShowCancellationForm(true);
  };

  const handleCancellationSubmit = async (reason: string, details: string) => {
    if (!cancellingBooking) return;

    setCancellationLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/bookings/${cancellingBooking.id}/cancel-host`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellation_reason: reason,
          cancellation_details: details
        })
      });

      if (response.ok) {
        alert('Booking cancelled successfully!');
        // Update the booking status in the local state
        setBookings(prev => prev.map(b => 
          b.id === cancellingBooking.id ? { ...b, status: 'cancelled' } : b
        ));
        // Clear the selected booking if it was the cancelled one
        if (selectedBooking?.id === cancellingBooking.id) {
          setSelectedBooking(null);
        }
        setShowCancellationForm(false);
        setCancellingBooking(null);
      } else {
        const error = await response.json();
        alert(`Failed to cancel booking: ${error.error}`);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setCancellationLoading(false);
    }
  };

  const handleCancellationClose = () => {
    setShowCancellationForm(false);
    setCancellingBooking(null);
    setCancellationLoading(false);
  };

  // Filtered lists for tabs
  const pendingListings = listings.filter(l => l.status === 'pending');
  const activeListings = listings.filter(l => l.status === 'active' || l.status === 'approved' || !l.status);
  const inactiveListings = listings.filter(l => l.status === 'inactive' || l.status === 'pending' || l.status === 'cancelled');
  const approvedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'approved');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const completedBookings = bookings.filter(b => b.status === 'ended');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  let visibleList: any[] = [];
  if (activeTab === 'all') visibleList = listings;

  useEffect(() => {
    // Fetch conversationId for selectedBooking in requests/approved
    if (selectedBooking) {
      setBookingConversationId(null);
      setBookingConversationLoading(true);
      fetch('http://localhost:4000/api/conversations/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: selectedBooking.listing_id,
          guest_id: selectedBooking.guest_id,
          host_id: selectedBooking.host_id,
        }),
      })
        .then(res => res.json())
        .then(data => {
          setBookingConversationId(data.id);
          setBookingConversationLoading(false);
        })
        .catch(() => {
          setBookingConversationId(null);
          setBookingConversationLoading(false);
        });
    } else {
      setBookingConversationId(null);
      setBookingConversationLoading(false);
    }
  }, [selectedBooking]);

  // Add a state to track which listings to show
  const [showActive, setShowActive] = useState(true);

  // Add a handler to set a listing to inactive
  const handleSetInactive = async (listingId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/listings/${listingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' })
      });
      if (response.ok) {
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'inactive' } : l));
      } else {
        alert('Failed to set listing as inactive.');
      }
    } catch (error) {
      alert('Failed to set listing as inactive.');
    }
  };

  // Add a handler to toggle listing status
  const handleToggleStatus = async (listingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' || currentStatus === 'approved' || !currentStatus ? 'inactive' : 'active';
    try {
      const response = await fetch(`http://localhost:4000/api/listings/${listingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l));
      } else {
        alert('Failed to update listing status.');
      }
    } catch (error) {
      alert('Failed to update listing status.');
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      <Navbar />
      <div className="flex flex-1 mt-25 overflow-hidden">
        {activeTab === 'messages' ? (
          <>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-6 flex flex-col overflow-hidden">
              <h2 className="text-xl font-bold mb-4 text-black flex-shrink-0">Inbox</h2>
              {loadingTabs.has('messages') ? (
                <div className="text-gray-400">Loading messages...</div>
              ) : conversations.length === 0 ? (
                <div className="text-gray-400">No messages yet.</div>
              ) : (
                <ul className="flex-1 overflow-y-auto scrollbar-hide">
                  {conversations.map((c) => (
                    <li
                      key={c.id}
                      className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedConvo?.id === c.id ? "bg-blue-50 border-blue-400" : ""}`}
                      onClick={() => setSelectedConvo(c)}
                    >
                      <div className="font-semibold text-black">
                        {guestProfiles[c.guest_id]?.name || "Guest"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{listingTitles[c.listing_id] || "Listing"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Center: Chat area */}
            <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
              {selectedConvo ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="border-b border-gray-200 px-6 py-3 bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                      {guestProfiles[selectedConvo.guest_id]?.avatar_url ? (
                        <img src={guestProfiles[selectedConvo.guest_id].avatar_url} alt={guestProfiles[selectedConvo.guest_id].name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700">
                          {guestProfiles[selectedConvo.guest_id]?.name ? guestProfiles[selectedConvo.guest_id].name[0] : 'G'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-lg text-black">
                          {guestProfiles[selectedConvo.guest_id]?.name || "Guest"}
                        </div>
                        <div className="text-xs text-gray-500">Boston University student</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden p-2">
                    <ChatBox
                      listingId={selectedConvo.listing_id}
                      hostId={selectedConvo.host_id}
                      allowHostChat={true}
                      conversationId={selectedConvo.id}
                      disableAutoScroll={true}
                      fullWidth={true}
                      hideHeader={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a conversation to view messages</div>
              )}
            </div>
            {/* Right panel: Reservation/Request details */}
            <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col overflow-hidden">
              {selectedConvo ? (
                <div className="overflow-y-auto scrollbar-hide">
                  <MessagesReservationPanel 
                    conversation={selectedConvo} 
                    guest={guestProfiles[selectedConvo.guest_id]} 
                    listingId={selectedConvo.listing_id}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a conversation to view reservation details</div>
              )}
            </div>
          </>
        ) : activeTab === 'bookings' ? (
          <>
                        {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-6 flex flex-col overflow-hidden">
              {/* Filter Pills */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setBookingFilter('pending')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    bookingFilter === 'pending'
                      ? 'bg-black text-white'
                      : 'bg-white border border-black text-black hover:bg-gray-50'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setBookingFilter('approved')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    bookingFilter === 'approved'
                      ? 'bg-black text-white'
                      : 'bg-white border border-black text-black hover:bg-gray-50'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setBookingFilter('completed')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    bookingFilter === 'completed'
                      ? 'bg-black text-white'
                      : 'bg-white border border-black text-black hover:bg-gray-50'
                  }`}
                >
                  Completed
                </button>
                </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {loadingTabs.has('bookings') ? (
                    <div className="text-gray-400">Loading bookings...</div>
                ) : (() => {
                  // Filter bookings based on selected filter
                  let filteredBookings: Booking[] = [];
                  let sectionTitle = '';
                  
                  switch (bookingFilter) {
                    case 'pending':
                      filteredBookings = pendingBookings;
                      sectionTitle = 'Pending';
                      break;
                    case 'approved':
                      filteredBookings = approvedBookings;
                      sectionTitle = 'Approved';
                      break;
                    case 'completed':
                      filteredBookings = completedBookings;
                      sectionTitle = 'Completed';
                      break;
                  }
                  
                  return (
                    <div>
                      {filteredBookings.length === 0 ? (
                        <div className="text-gray-400">No {sectionTitle.toLowerCase()} bookings.</div>
                      ) : (
                        <ul className="space-y-2">
                          {filteredBookings.map((booking: Booking) => (
                            <li
                              key={booking.id}
                              className={`rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                              onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                            >
                              <ApprovedBookingSidebarItem booking={booking} guest={guestProfiles[booking.guest_id]} listing={listings.find(l => l.id === booking.listing_id) || null} />
                              {/* Action buttons based on booking status */}
                              {booking.status === 'confirmed' && (
                                <button
                                  className="mt-2 px-4 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow"
                                  onClick={e => { e.stopPropagation(); handleCancelBooking(booking); }}
                                >
                                  Cancel Booking
                                </button>
                              )}
                              {booking.status === 'ended' && (
                                <button
                                  className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow"
                                  onClick={e => { e.stopPropagation(); openRenterReviewPopup(booking); }}
                                >
                                  {reviewedBookingIds.includes(booking.id) ? 'Edit Review' : 'Write Review'}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            {/* Center: Chat area */}
            <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
              {selectedBooking ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="border-b border-gray-200 px-6 py-3 bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                      {guestProfiles[selectedBooking.guest_id]?.avatar_url ? (
                        <img src={guestProfiles[selectedBooking.guest_id].avatar_url} alt={guestProfiles[selectedBooking.guest_id].name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700">
                          {guestProfiles[selectedBooking.guest_id]?.name ? guestProfiles[selectedBooking.guest_id].name[0] : 'G'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-lg text-black">
                          {selectedBooking.guest_id && guestProfiles[selectedBooking.guest_id]?.name || "Guest"}
                        </div>
                        <div className="text-xs text-gray-500">Boston University student</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden p-2">
                    {bookingConversationLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-lg">Loading messages...</div>
                    ) : bookingConversationId ? (
                      <ChatBox
                        listingId={selectedBooking.listing_id}
                        hostId={selectedBooking.host_id}
                        allowHostChat={true}
                        conversationId={bookingConversationId}
                        disableAutoScroll={true}
                        fullWidth={true}
                        hideHeader={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-lg">No messages found.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a booking to view messages</div>
              )}
            </div>
            {/* Right panel: Reservation/Request details */}
            <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col overflow-hidden">
              {selectedBooking ? (
                <div className="overflow-y-auto scrollbar-hide">
                  <BookingDetailsPanel 
                    booking={selectedBooking} 
                    guest={guestProfiles[selectedBooking.guest_id]} 
                    listingId={selectedBooking.listing_id}
                    showApproveButton={selectedBooking.status === 'pending'}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a booking to view reservation details</div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Simple grid of listing cards */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-hide pt-8 pb-8 px-4">
                <div className="max-w-7xl mx-auto">
                  {/* Header with Add Listings button and toggle buttons */}
                  <div className="flex justify-between items-center mb-6 mt-6">
                    <div className="flex gap-4 items-center mb-8">
                      <button
                        onClick={() => setShowActive(true)}
                        className={`border rounded-2xl px-4 py-2 font-medium shadow-sm transition-colors ${showActive ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600' : 'bg-white text-black border-gray-200 hover:bg-gray-50'}`}
                      >
                        Active Listings
                      </button>
                      <button
                        onClick={() => setShowActive(false)}
                        className={`border rounded-2xl px-4 py-2 font-medium shadow-sm transition-colors ${!showActive ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600' : 'bg-white text-black border-gray-200 hover:bg-gray-50'}`}
                      >
                        Inactive Listings
                      </button>
                      <button
                        onClick={() => router.push('/add-listings')}
                        className="bg-white border border-gray-200 rounded-2xl px-4 py-2 font-medium shadow-sm hover:bg-gray-50 transition-colors text-black"
                      >
                        Add Listing
                      </button>
                    </div>
                  </div>

                {/* Loading state */}
                {loading ? (
                  <div className="text-center text-gray-500 py-8">Loading your listings...</div>
                ) : listings.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-lg mb-4">You don't have any listings yet.</p>
                    <button
                      onClick={() => router.push('/add-listings')}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Create Your First Listing
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Listings grid based on toggle */}
                    {(showActive ? activeListings : inactiveListings).length > 0 ? (
                      <div className="mb-8">
                        <div className="flex flex-wrap -mx-1">
                          {(showActive ? activeListings : inactiveListings).map((listing) => (
                            <ListingCard 
                              key={listing.id}
                              id={listing.id}
                              title={listing.title}
                              images={listing.images}
                              name={listing.name}
                              avatar_url={listing.avatar_url}
                              university_name={listing.university_name}
                              bedrooms={listing.bedrooms}
                              bathrooms={listing.bathrooms}
                              price_per_night={listing.price_per_night}
                              amenities={listing.amenities}
                              hideWishlist={true}
                              showHostControls={true}
                              listingStatus={listing.status}
                              onToggleStatus={handleToggleStatus}
                              onEditListing={handleEditListing}
                              onDeleteListing={handleDeleteListing}
                              isDeleting={deletingListing === listing.id}
                              cardHeight="h-[350px]"
                              cardMargin="mx-4"
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <p className="text-lg mb-4">No {showActive ? 'active' : 'inactive'} listings found.</p>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {showRenterReviewPopup && (
        <>
          {/* Blur the center and right columns */}
          <div className="absolute inset-0 z-30 flex">
            <div className="w-80" />
            <div className="flex-1 flex">
              <div className="flex-1 backdrop-blur-sm bg-white/40" />
              <div className="w-96 backdrop-blur-sm bg-white/40" />
            </div>
          </div>
          {/* Popup */}
          <div className="absolute left-80 top-0 z-40 flex justify-center items-center w-[calc(100%-20rem)] h-full">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-auto flex flex-col items-center">
              {currentRenterReviewStep < renterReviewSteps.length ? (
                <>
                  <h2 className="text-xl font-bold mb-2">{renterReviewSteps[currentRenterReviewStep].title}</h2>
                  <p className="text-gray-600 mb-4">{renterReviewSteps[currentRenterReviewStep].description}</p>
                  <div className="flex gap-2 mb-6">
                    {[1,2,3,4,5].map(star => (
                      <button
                        key={star}
                        className={`text-3xl ${Number(renterReviewData[renterReviewSteps[currentRenterReviewStep].field as keyof typeof renterReviewData]) >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                        onClick={() => handleRenterReviewStep(star)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-sm text-blue-600 hover:underline mb-2"
                    onClick={handleRenterBackStep}
                    disabled={currentRenterReviewStep === 0}
                  >
                    Back
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-2">Comments</h2>
                  <p className="text-gray-600 mb-4">Anything else you'd like to share about this renter?</p>
                  <textarea
                    className="w-full border rounded-lg p-2 mb-4"
                    rows={4}
                    value={renterReviewData.comment}
                    onChange={e => setRenterReviewData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Write your comments here..."
                  />
                  <div className="flex w-full justify-between">
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={handleRenterBackStep}
                    >
                      Back
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
                      onClick={handleSubmitRenterReview}
                    >
                      {isEditingRenterReview ? 'Update Review' : 'Submit Review'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Cancellation Form Modal */}
      <CancellationForm
        isOpen={showCancellationForm}
        onClose={handleCancellationClose}
        onSubmit={handleCancellationSubmit}
        isLoading={cancellationLoading}
      />

      {/* Amenities Modal */}
      {showAmenitiesModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">All Amenities</h3>
                <button
                  onClick={() => setShowAmenitiesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* All Amenities */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">All Amenities</h4>
                  <div className="space-y-3">
                    {selectedListing?.amenities && selectedListing.amenities.map((amenity: any, index: number) => (
                      <div key={index} className="flex items-center">
                        {getAmenityIcon(amenity.name)}
                        <span className="text-gray-700">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingDetailsView({ 
  listing, 
  onDelete, 
  isDeleting,
  onEdit
}: { 
  listing: Listing;
  onDelete: (listingId: string) => Promise<void>;
  isDeleting: boolean;
  onEdit: (listingId: string) => void;
}) {
  // Image grid logic
  let images = listing.images && listing.images.length > 0 ? listing.images : [
    { url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }
  ];
  images = images.slice().sort((a, b) => {
    if (a.order_index !== undefined && b.order_index !== undefined) {
      return a.order_index - b.order_index;
    }
    return 0;
  });
  images = images.map(img => ({
    ...img,
    url: img.url.startsWith('/uploads/') ? `http://localhost:4000${img.url}` : img.url
  }));

  // Host/university info is not fetched here, so just show placeholders
  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">{listing.title}</h1>
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(listing.id)}
              className="px-4 py-2 rounded-lg font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              Edit Listing
            </button>
            <button
              onClick={() => onDelete(listing.id)}
              disabled={isDeleting}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isDeleting 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Listing'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:[grid-template-columns:2fr_1fr_1fr] md:grid-rows-2 gap-4 rounded-3xl overflow-hidden" style={{ height: '400px', minHeight: '200px' }}>
          {/* First column: one big image spanning two rows */}
          <div className="relative md:row-span-2 h-full w-full">
            <img
              src={images[0]?.url}
              alt={listing.title}
              className="w-full h-full object-cover rounded-2xl"
              style={{ height: '100%', width: '100%', objectFit: 'cover' }}
            />
          </div>
          {/* Second column: two stacked images */}
          {images.slice(1, 3).map((img, i) => (
            <div key={i} className="relative h-full w-full">
              <img
                src={img.url}
                alt={listing.title}
                className="w-full h-full object-cover rounded-2xl"
                style={{ height: '100%', width: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
          {/* Third column: two stacked images */}
          {images.slice(3, 5).map((img, i) => (
            <div key={i} className="relative h-full w-full">
              <img
                src={img.url}
                alt={listing.title}
                className="w-full h-full object-cover rounded-2xl"
                style={{ height: '100%', width: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
        {/* Details below */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Listing details */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">{listing.title ? listing.title[0] : 'H'}</div>
              <div>
                <div className="text-black font-semibold">Hosted by You</div>
                <div className="text-gray-500 text-sm">Your listing</div>
              </div>
            </div>
            <hr className="my-6" />
            <div>
              <h3 className="text-black font-semibold mb-2">About this place</h3>
              <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
              {/* Listing Details */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-4 text-gray-700 text-sm">
                    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 font-medium">
                      <span className="font-semibold">Type:</span> {listing.property_type?.replace('_', ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 font-medium">
                      <span className="font-semibold">Space:</span> {listing.guest_space?.replace('_', ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 font-medium">
                      <span className="font-semibold">Bedrooms:</span> {listing.bedrooms}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 font-medium">
                      <span className="font-semibold">Bathrooms:</span> {listing.bathrooms}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 font-medium">
                      <span className="font-semibold">Max Guests:</span> {listing.max_occupancy}
                    </span>
                  </div>
                  {listing.occupants && listing.occupants.length > 0 && (
                    <div className="mt-4">
                      <span className="font-semibold text-gray-800">Who else lives here:</span>
                      <span className="ml-2 text-gray-700">{listing.occupants.map((o: string) => o.replace('_', ' ')).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Right: Amenities */}
          <div className="md:col-span-1">
            <div className="font-semibold text-gray-800 mb-2">Amenities</div>
            <div className="flex flex-wrap gap-2">
              {listing.amenities && listing.amenities.length > 0 ? (
                listing.amenities.map((a: any, idx: number) => (
                  <span
                    key={a.code || a.name || idx}
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium border bg-gray-100 border-gray-200 text-gray-700`}
                  >
                    {a.name || a}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">No amenities listed</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Location Map */}
        <div className="mt-8">
          <h3 className="text-black font-semibold mb-4">Location</h3>
          {listing.latitude && listing.longitude ? (
            <PrivacyMap
              latitude={listing.latitude}
              longitude={listing.longitude}
              city={listing.city}
              state={listing.state}
              address={listing.address}
              showFullAddress={true}
              height="250px"
            />
          ) : (
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="text-gray-500">
                {listing.city && listing.state 
                  ? `Location in ${listing.city}, ${listing.state}` 
                  : 'Location not available'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Map coordinates not available for this listing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovedBookingSidebarItem({ booking, guest, listing }: { booking: Booking, guest: any, listing: Listing | null }) {
  return (
    <div>
      <div className="font-semibold text-black text-base">{guest?.name || "Guest"}</div>
      <div className="text-xs text-gray-500">{listing?.title || "Listing"}</div>
      <div className="text-xs text-gray-500">{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</div>
    </div>
  );
}

function ApprovedBookingDetailsView({ booking, showApproveButton }: { booking: Booking, showApproveButton?: boolean }) {
  const [listing, setListing] = useState<Listing | null>(null);
  // Use the status from the booking prop directly instead of local state
  const status = booking.status;
  useEffect(() => {
    fetch(`http://localhost:4000/api/listings/${booking.listing_id}`)
      .then(res => res.json())
      .then(data => setListing(data))
      .catch(() => setListing(null));
  }, [booking.listing_id]);

  const handleApprove = async () => {
    const res = await fetch(`http://localhost:4000/api/bookings/${booking.id}/accept`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('bookingStatusChanged', { detail: { id: booking.id, status: 'confirmed' } }));
      }
      alert('Booking confirmed! Payment has been captured.');
    } else {
      const error = await res.json();
      alert(`Failed to confirm booking: ${error.error}`);
    }
  };

  const handleEndBooking = async () => {
    if (!confirm('Are you sure you want to end this booking? This action cannot be undone.')) {
      return;
    }
    
    const res = await fetch(`http://localhost:4000/api/bookings/${booking.id}/end`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('bookingStatusChanged', { detail: { id: booking.id, status: 'ended' } }));
      }
      alert('Booking ended successfully!');
    } else {
      const error = await res.json();
      alert(`Failed to end booking: ${error.error}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 mt-8">
        {listing && listing.images && listing.images.length > 0 && (
          <img src={listing.images[0].url.startsWith('/uploads/') ? `http://localhost:4000${listing.images[0].url}` : listing.images[0].url} alt={listing.title} className="rounded-xl w-full h-64 object-cover mb-6" />
        )}
        <div className="font-bold text-2xl text-black mb-1">{listing?.title || "Listing"}</div>
        <div className="text-gray-500 mb-2">{listing?.city}, {listing?.state}</div>
        <div className="text-gray-700 mb-4">{listing?.description}</div>
        <div className="flex items-center text-lg mb-2">
          <span className="font-bold text-black mr-1">${booking.price_per_night}</span>
          <span className="text-gray-500">per night</span>
        </div>
        <div className="text-sm text-gray-500 mb-1">Booking dates: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}</div>
        <div className="text-sm text-gray-500 mb-1">Total price: ${booking.total_price}</div>
        <div className="text-sm text-gray-500 mb-1">Status: {status}</div>
        <div className="text-sm text-gray-500 mb-1">Payment: {booking.payment_status}</div>
        {showApproveButton && status === 'pending' && (
          <button
            className="mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow"
            onClick={handleApprove}
          >
            Approve
          </button>
        )}
        {status === 'confirmed' && (
          <button
            className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow"
            onClick={handleEndBooking}
          >
            End Booking
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
} 

function MessagesReservationPanel({ conversation, guest, listingId }: { conversation: any, guest: any, listingId: string }) {
  const [listing, setListing] = React.useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const router = useRouter();

  React.useEffect(() => {
    async function fetchListing() {
      const res = await fetch(`http://localhost:4000/api/listings/${listingId}`);
      if (res.ok) setListing(await res.json());
    }
    if (listingId) fetchListing();
  }, [listingId]);

  // Reset image index when listing changes
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [listing]);

  if (!listing) return <div className="text-gray-400">Loading listing...</div>;
  const images = listing.images && listing.images.length > 0 ? listing.images : [{ url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }];
  const showPrev = currentImageIndex > 0;
  const showNext = currentImageIndex < images.length - 1;

  return (
    <div className="overflow-y-auto scrollbar-hide">
      <button 
        className="bg-white border border-black text-black px-3 py-1 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm mb-4 w-fit"
        onClick={() => router.push(`/listings/${listingId}`)}
      >
        Listing Page
      </button>
      <div className="font-bold text-lg text-black mb-4">{listing.title}</div>
      {/* Gallery */}
      <div className="relative w-full h-48 mb-6">
        <img
          src={images[currentImageIndex]?.url.startsWith('/uploads/') ? `http://localhost:4000${images[currentImageIndex].url}` : images[currentImageIndex].url}
          alt={listing.title}
          className="w-full h-48 object-cover rounded-xl"
        />
        {showPrev && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all"
            onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
          >
            <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {showNext && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all"
            onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
          >
            <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            {currentImageIndex + 1} / {images.length}
          </div>
        )}
      </div>
      <div className="font-semibold text-black mb-2">About this place</div>
      <div className="text-gray-700 mb-4">{listing.description}</div>
      <div className="font-semibold text-black mb-2">Location</div>
      <div className="mb-4">
        <PrivacyMap
          latitude={listing.latitude}
          longitude={listing.longitude}
          city={listing.city}
          state={listing.state}
          neighborhood={listing.neighborhood}
          height="200px"
        />
      </div>
    </div>
  );
} 

function BookingDetailsPanel({ booking, guest, listingId, showApproveButton }: { booking: any, guest: any, listingId: string, showApproveButton?: boolean }) {
  const [listing, setListing] = React.useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const router = useRouter();
  // Use the status from the booking prop directly instead of local state
  const status = booking.status;

  React.useEffect(() => {
    async function fetchListing() {
      const res = await fetch(`http://localhost:4000/api/listings/${listingId}`);
      if (res.ok) setListing(await res.json());
    }
    if (listingId) fetchListing();
  }, [listingId]);

  // Reset image index when listing changes
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [listing]);

  const handleApprove = async () => {
    const res = await fetch(`http://localhost:4000/api/bookings/${booking.id}/accept`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('bookingStatusChanged', { detail: { id: booking.id, status: 'confirmed' } }));
      }
      alert('Booking confirmed!');
    } else {
      const error = await res.json();
      alert(`Failed to confirm booking: ${error.error}`);
    }
  };

  const handleEndBooking = async () => {
    if (!confirm('Are you sure you want to end this booking? This action cannot be undone.')) {
      return;
    }
    
    const res = await fetch(`http://localhost:4000/api/bookings/${booking.id}/end`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('bookingStatusChanged', { detail: { id: booking.id, status: 'ended' } }));
      }
      alert('Booking ended successfully!');
    } else {
      const error = await res.json();
      alert(`Failed to end booking: ${error.error}`);
    }
  };

  if (!listing) return <div className="text-gray-400">Loading listing...</div>;
  const images = listing.images && listing.images.length > 0 ? listing.images : [{ url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }];
  const showPrev = currentImageIndex > 0;
  const showNext = currentImageIndex < images.length - 1;

  return (
    <div className="overflow-y-auto scrollbar-hide">
      <button 
        className="bg-white border border-black text-black px-3 py-1 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm mb-4 w-fit"
        onClick={() => router.push(`/listings/${listingId}`)}
      >
        Listing Page
      </button>
      <div className="font-bold text-lg text-black mb-4">{listing.title}</div>
      {/* Gallery */}
      <div className="relative w-full h-48 mb-6">
        <img
          src={images[currentImageIndex]?.url.startsWith('/uploads/') ? `http://localhost:4000${images[currentImageIndex].url}` : images[currentImageIndex].url}
          alt={listing.title}
          className="w-full h-48 object-cover rounded-xl"
        />
        {showPrev && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all"
            onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
          >
            <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {showNext && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all"
            onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
          >
            <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            {currentImageIndex + 1} / {images.length}
          </div>
        )}
      </div>
      {/* Booking details */}
      <div className="mb-4">
        <div className="font-semibold text-black mb-2">Booking Details</div>
        <div className="text-gray-700 text-sm mb-1">Dates: {booking.start_date} to {booking.end_date}</div>
        <div className="text-gray-700 text-sm">Total price: ${booking.total_price != null ? Number(booking.total_price).toFixed(2) : "N/A"}</div>
        {showApproveButton && status === 'pending' && (
          <button
            className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow"
            onClick={handleApprove}
          >
            Approve
          </button>
        )}
        {status === 'confirmed' && (
          <button
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow"
            onClick={handleEndBooking}
          >
            End Booking
          </button>
        )}
      </div>
      <div className="font-semibold text-black mb-2">About this place</div>
      <div className="text-gray-700 mb-4">{listing.description}</div>
      <div className="font-semibold text-black mb-2">Location</div>
      <div className="mb-4">
        <PrivacyMap
          latitude={listing.latitude}
          longitude={listing.longitude}
          city={listing.city}
          state={listing.state}
          neighborhood={listing.neighborhood}
          height="200px"
        />
      </div>
    </div>
  );
} 