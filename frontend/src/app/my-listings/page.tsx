"use client";
import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import PrivacyMap from "../../components/PrivacyMap";
import StripeConnect from "../../components/StripeConnect";
import PaymentHistory from "../../components/PaymentHistory";
import CancellationForm from "../../components/CancellationForm";
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
  const [activeTab, setActiveTab] = useState<'all' | 'bookings' | 'messages' | 'stripe'>('all');
  const [deletingListing, setDeletingListing] = useState<string | null>(null);

  // Messages tab state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<any | null>(null);
  const [guestProfiles, setGuestProfiles] = useState<Record<string, any>>({});
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [bookingConversationId, setBookingConversationId] = useState<string | null>(null);
  const [bookingConversationLoading, setBookingConversationLoading] = useState(false);
  
  // Stripe connection status state
  const [stripeConnected, setStripeConnected] = useState(false);

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

  const renterReviewSteps = [
    { title: 'Punctuality', field: 'punctuality', description: 'Did the renter arrive and leave on time?' },
    { title: 'Communication', field: 'communication', description: 'How well did the renter communicate?' },
    { title: 'Property Care', field: 'property_care', description: 'How well did the renter care for your property?' },
    { title: 'Compliance', field: 'compliance', description: 'Did the renter follow house rules?' }
  ];

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
    // Fetch bookings for listings owned by the user
    fetch(`http://localhost:4000/api/bookings`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Only bookings for listings owned by this user
          setBookings(data.filter((b: Booking) => b.host_id === userId));
        } else {
          setBookings([]);
        }
      })
      .catch(() => setBookings([]));
  }, [userId]);

  // Fetch conversations where user is host for messages tab
  useEffect(() => {
    if (!userId || activeTab !== 'messages') return;
    let isMounted = true;
    async function fetchConversations() {
      setLoadingConvos(true);
      const res = await fetch(`http://localhost:4000/api/conversations/user/${userId}`);
      const data = await res.json();
      // Only conversations where user is host
      const hostConvos = data.filter((c: any) => c.host_id === userId);
      // Only include conversations that have messages
      const convosWithMessages = await Promise.all(
        hostConvos.map(async (conversation: any) => {
          const messagesRes = await fetch(`http://localhost:4000/api/messages/conversation/${conversation.id}`);
          const messages = await messagesRes.json();
          return { ...conversation, hasMessages: messages.length > 0 };
        })
      );
      if (isMounted) {
        setConversations(convosWithMessages.filter(c => c.hasMessages));
        setLoadingConvos(false);
      }
    }
    fetchConversations();
  }, [userId, activeTab]);

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

  // Handle URL parameter for Stripe onboarding return
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'stripe') {
      setActiveTab('stripe');
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col bg-white min-h-screen">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-1 pt-20 relative">
        {activeTab === 'stripe' ? (
          <>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-black">Settings</h2>
              <div className="space-y-2">
                <div
                  className="rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 bg-blue-50 border-blue-400"
                >
                  <div className="font-semibold text-black text-base">Payment Account</div>
                  <div className="text-xs text-gray-500">Manage your payments</div>
                </div>
              </div>
            </div>
            {/* Center: Payment Setup and History */}
            <div className="flex-1">
                              <div className="p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="space-y-8">
                      <div>
                        <StripeConnect onStatusChange={(status) => setStripeConnected(!!status?.connected)} />
                      </div>
                      <div>
                        <PaymentHistory userId={userId || ''} />
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </>
        ) : activeTab === 'messages' ? (
          <>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-black">Inbox</h2>
              {loadingConvos ? (
                <div className="text-gray-400">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="text-gray-400">No messages yet.</div>
              ) : (
                <ul className="flex-1 overflow-y-auto">
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
            <div className="flex-1 flex flex-col border-r border-gray-200">
              {selectedConvo ? (
                <div className="flex-1 flex flex-col">
                  <div className="border-b border-gray-200 px-6 py-4 bg-white">
                    <div className="font-bold text-lg text-black">
                      {guestProfiles[selectedConvo.guest_id]?.name || "Guest"}
                    </div>
                    <div className="text-xs text-gray-500">Listing: {listingTitles[selectedConvo.listing_id] || "Listing"}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
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
            <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col">
              {selectedConvo ? (
                <MessagesReservationPanel 
                  conversation={selectedConvo} 
                  guest={guestProfiles[selectedConvo.guest_id]} 
                  listingId={selectedConvo.listing_id}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a conversation to view reservation details</div>
              )}
            </div>
          </>
        ) : activeTab === 'bookings' ? (
          <>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {/* Requests Section */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4 text-black">Pending</h2>
                  {loading ? (
                    <div className="text-gray-400">Loading...</div>
                  ) : pendingBookings.length === 0 ? (
                    <div className="text-gray-400">No pending requests.</div>
                  ) : (
                    <ul className="space-y-2">
                      {pendingBookings.map((booking: Booking) => (
                        <li
                          key={booking.id}
                          className={`rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                          onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                        >
                          <ApprovedBookingSidebarItem booking={booking} guest={guestProfiles[booking.guest_id]} listing={listings.find(l => l.id === booking.listing_id) || null} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Approved Section */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4 text-black">Approved</h2>
                  {loading ? (
                    <div className="text-gray-400">Loading...</div>
                  ) : approvedBookings.length === 0 ? (
                    <div className="text-gray-400">No approved bookings.</div>
                  ) : (
                    <ul className="space-y-2">
                      {approvedBookings.map((booking: Booking) => (
                        <li
                          key={booking.id}
                          className={`rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                          onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                        >
                          <ApprovedBookingSidebarItem booking={booking} guest={guestProfiles[booking.guest_id]} listing={listings.find(l => l.id === booking.listing_id) || null} />
                          {/* Cancel Booking button for host */}
                          <button
                            className="mt-2 px-4 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow"
                            onClick={e => { e.stopPropagation(); handleCancelBooking(booking); }}
                          >
                            Cancel Booking
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Completed Section */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4 text-black">Completed</h2>
                  {loading ? (
                    <div className="text-gray-400">Loading...</div>
                  ) : completedBookings.length === 0 ? (
                    <div className="text-gray-400">No completed bookings.</div>
                  ) : (
                    <ul className="space-y-2">
                      {completedBookings.map((booking: Booking) => (
                        <li
                          key={booking.id}
                          className={`rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                          onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                        >
                          <ApprovedBookingSidebarItem booking={booking} guest={guestProfiles[booking.guest_id]} listing={listings.find(l => l.id === booking.listing_id) || null} />
                          {/* Write Review button for host-to-renter review */}
                          <button
                            className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow"
                            onClick={e => { e.stopPropagation(); openRenterReviewPopup(booking); }}
                          >
                            {reviewedBookingIds.includes(booking.id) ? 'Edit Review' : 'Write Review'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Cancelled Section */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4 text-black">Cancelled</h2>
                  {loading ? (
                    <div className="text-gray-400">Loading...</div>
                  ) : cancelledBookings.length === 0 ? (
                    <div className="text-gray-400">No cancelled bookings.</div>
                  ) : (
                    <ul className="space-y-2">
                      {cancelledBookings.map((booking: Booking) => (
                        <li
                          key={booking.id}
                          className={`rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                          onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                        >
                          <ApprovedBookingSidebarItem booking={booking} guest={guestProfiles[booking.guest_id]} listing={listings.find(l => l.id === booking.listing_id) || null} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            {/* Center: Chat area */}
            <div className="flex-1 flex flex-col border-r border-gray-200">
              {selectedBooking ? (
                <div className="flex-1 flex flex-col">
                  <div className="border-b border-gray-200 px-6 py-4 bg-white">
                    <div className="font-bold text-lg text-black">
                      {selectedBooking.guest_id && guestProfiles[selectedBooking.guest_id]?.name || "Guest"}
                    </div>
                    <div className="text-xs text-gray-500">Listing: {selectedBooking.listing_id}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
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
            <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col">
              {selectedBooking ? (
                <BookingDetailsPanel 
                  booking={selectedBooking} 
                  guest={guestProfiles[selectedBooking.guest_id]} 
                  listingId={selectedBooking.listing_id}
                  showApproveButton={selectedBooking.status === 'pending'}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a booking to view reservation details</div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-black">Active Listings</h2>
              {/* Add Listings button styled as a card */}
              <div
                className="mb-2 rounded-lg p-3 cursor-pointer transition border border-dashed border-blue-400 hover:bg-blue-50 flex flex-col items-start justify-center text-left bg-white"
                onClick={() => router.push('/add-listings')}
              >
                <div className="font-semibold text-blue-600 text-base flex items-center gap-2">
                  <span className="text-2xl leading-none">+</span> Add Listings
                </div>
                <div className="text-xs text-gray-500 mt-1">Create a new listing</div>
              </div>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : activeListings.length === 0 ? (
                <div className="text-gray-400">No active listings.</div>
              ) : (
                <ul className="space-y-2 mb-6">
                  {activeListings.map((listing) => (
                    <li
                      key={listing.id}
                      className={`rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedListing?.id === listing.id ? "bg-blue-50 border-blue-400" : ""}`}
                      onClick={() => setSelectedListing(listing)}
                    >
                      <div className="font-semibold text-black text-base">{listing.title}</div>
                      <div className="text-xs text-gray-500">{listing.city}, {listing.state}</div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Inactive Listings Section */}
              <div className="mt-6">
                <h2 className="text-xl font-bold mb-4 text-black">Inactive Listings</h2>
                {loading ? (
                  <div className="text-gray-400">Loading...</div>
                ) : inactiveListings.length === 0 ? (
                  <div className="text-gray-400">No inactive listings.</div>
                ) : (
                  <ul className="space-y-2">
                    {inactiveListings.map((listing) => (
                      <li
                        key={listing.id}
                        className={`rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedListing?.id === listing.id ? "bg-blue-50 border-blue-400" : ""}`}
                        onClick={() => setSelectedListing(listing)}
                      >
                        <div className="font-semibold text-black text-base">{listing.title}</div>
                        <div className="text-xs text-gray-500">{listing.city}, {listing.state}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {/* Center: Listing details */}
            <div className="flex-1">
              {selectedListing ? (
                <ListingDetailsView
                  listing={selectedListing}
                  onDelete={handleDeleteListing}
                  isDeleting={deletingListing === selectedListing.id}
                  onEdit={handleEditListing}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-lg">Select a listing to view details</div>
              )}
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
  const [currentImg, setCurrentImg] = React.useState(0);

  React.useEffect(() => {
    async function fetchListing() {
      const res = await fetch(`http://localhost:4000/api/listings/${listingId}`);
      if (res.ok) setListing(await res.json());
    }
    if (listingId) fetchListing();
  }, [listingId]);

  if (!listing) return <div className="text-gray-400">Loading listing...</div>;
  const images = listing.images && listing.images.length > 0 ? listing.images : [{ url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }];
  const showPrev = currentImg > 0;
  const showNext = currentImg < images.length - 1;

  return (
    <div>
      <div className="font-bold text-lg mb-2 text-black">{listing.title}</div>
      {/* Gallery */}
      <div className="relative w-full h-48 mb-4">
        <img
          src={images[currentImg]?.url.startsWith('/uploads/') ? `http://localhost:4000${images[currentImg].url}` : images[currentImg].url}
          alt={listing.title}
          className="w-full h-48 object-cover rounded-xl"
        />
        {showPrev && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100"
            onClick={() => setCurrentImg(currentImg - 1)}
          >
            &#8592;
          </button>
        )}
        {showNext && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100"
            onClick={() => setCurrentImg(currentImg + 1)}
          >
            &#8594;
          </button>
        )}
      </div>
      {/* Reserved by */}
      <div className="flex items-center gap-3 mb-4">
        {guest?.avatar_url ? (
          <img src={guest.avatar_url} alt={guest.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
            {guest?.name ? guest.name[0] : 'G'}
          </div>
        )}
        <div>
          <div className="text-black font-semibold">Reserved by {guest?.name || 'Guest'}</div>
          <div className="text-gray-500 text-sm">{guest?.email}</div>
        </div>
      </div>
      {/* Reservation details (if available) */}
      <div className="mt-4">
        <div className="font-semibold text-gray-800 mb-2">Reservation Details</div>
        {/* You can expand this with more details if you have them */}
        <div className="text-gray-700 text-sm">Listing ID: {listingId}</div>
        {/* Add more reservation details here if available */}
      </div>
    </div>
  );
} 

function BookingDetailsPanel({ booking, guest, listingId, showApproveButton }: { booking: any, guest: any, listingId: string, showApproveButton?: boolean }) {
  const [listing, setListing] = React.useState<any | null>(null);
  const [currentImg, setCurrentImg] = React.useState(0);
  // Use the status from the booking prop directly instead of local state
  const status = booking.status;

  React.useEffect(() => {
    async function fetchListing() {
      const res = await fetch(`http://localhost:4000/api/listings/${listingId}`);
      if (res.ok) setListing(await res.json());
    }
    if (listingId) fetchListing();
  }, [listingId]);

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
  const showPrev = currentImg > 0;
  const showNext = currentImg < images.length - 1;

  return (
    <div>
      <div className="font-bold text-lg mb-2 text-black">{listing.title}</div>
      {/* Gallery */}
      <div className="relative w-full h-48 mb-4">
        <img
          src={images[currentImg]?.url.startsWith('/uploads/') ? `http://localhost:4000${images[currentImg].url}` : images[currentImg].url}
          alt={listing.title}
          className="w-full h-48 object-cover rounded-xl"
        />
        {showPrev && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100"
            onClick={() => setCurrentImg(currentImg - 1)}
          >
            &#8592;
          </button>
        )}
        {showNext && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100"
            onClick={() => setCurrentImg(currentImg + 1)}
          >
            &#8594;
          </button>
        )}
      </div>
      {/* Reserved by */}
      <div className="flex items-center gap-3 mb-4">
        {guest?.avatar_url ? (
          <img src={guest.avatar_url} alt={guest.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
            {guest?.name ? guest.name[0] : 'G'}
          </div>
        )}
        <div>
          <div className="text-black font-semibold">Reserved by {guest?.name || 'Guest'}</div>
          <div className="text-gray-500 text-sm">{guest?.email}</div>
        </div>
      </div>
      {/* Booking details */}
      <div className="mt-4">
        <div className="font-semibold text-gray-800 mb-2">Booking Details</div>
        <div className="text-gray-700 text-sm mb-1">Dates: {booking.start_date} to {booking.end_date}</div>
        <div className="text-gray-700 text-sm">Total price: ${booking.total_price != null ? Number(booking.total_price).toFixed(2) : "N/A"}</div>
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