"use client";
import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import { useRouter } from 'next/navigation';

interface ListingImage {
  url: string;
  order_index?: number;
}

interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approvedBookings' | 'messages'>('all');

  // Messages tab state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<any | null>(null);
  const [guestProfiles, setGuestProfiles] = useState<Record<string, any>>({});
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [bookingConversationId, setBookingConversationId] = useState<string | null>(null);
  const [bookingConversationLoading, setBookingConversationLoading] = useState(false);

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

  // Filtered lists for tabs
  const pendingListings = listings.filter(l => l.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  let visibleList: any[] = [];
  if (activeTab === 'all') visibleList = listings;
  else if (activeTab === 'pending') visibleList = pendingBookings;
  else if (activeTab === 'approvedBookings') visibleList = approvedBookings;

  useEffect(() => {
    // Fetch conversationId for selectedBooking in requests/approved
    if ((activeTab === 'pending' || activeTab === 'approvedBookings') && selectedBooking) {
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
  }, [selectedBooking, activeTab]);

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-1 pt-20">
        {activeTab === 'messages' || activeTab === 'pending' || activeTab === 'approvedBookings' ? (
          <>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-black">
                {activeTab === 'messages' ? 'Inbox' : activeTab === 'pending' ? 'Requests' : 'Approved'}
              </h2>
              {activeTab === 'messages' ? (
                loadingConvos ? (
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
                )
              ) : (
                loading ? (
                  <div className="text-gray-400">Loading...</div>
                ) : visibleList.length === 0 ? (
                  <div className="text-gray-400">No bookings.</div>
                ) : (
                  <ul className="flex-1 overflow-y-auto">
                    {visibleList.map((booking: Booking) => (
                      <li
                        key={booking.id}
                        className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                        onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                      >
                        <ApprovedBookingSidebarItem booking={booking} guest={guestProfiles[booking.guest_id]} listing={listings.find(l => l.id === booking.listing_id) || null} />
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
            {/* Center: Chat area */}
            <div className="flex-1 flex flex-col border-r border-gray-200">
              {activeTab === 'messages' ? (
                selectedConvo ? (
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
                )
              ) : (
                selectedBooking ? (
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
                )
              )}
            </div>
            {/* Right panel: Reservation/Request details */}
            <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col">
              {activeTab === 'messages' ? (
                selectedConvo ? (
                  <MessagesReservationPanel 
                    conversation={selectedConvo} 
                    guest={guestProfiles[selectedConvo.guest_id]} 
                    listingId={selectedConvo.listing_id}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a conversation to view reservation details</div>
                )
              ) : (
                selectedBooking ? (
                  <BookingDetailsPanel 
                    booking={selectedBooking} 
                    guest={guestProfiles[selectedBooking.guest_id]} 
                    listingId={selectedBooking.listing_id}
                    showApproveButton={activeTab === 'pending'}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a booking to view reservation details</div>
                )
              )}
            </div>
          </>
        ) : (
          <>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-black">Listings</h2>
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
              ) : visibleList.length === 0 ? (
                <div className="text-gray-400">No listings.</div>
              ) : (
                <ul className="flex-1 overflow-y-auto">
                  {visibleList.map((listing: Listing) => (
                    <li
                      key={listing.id}
                      className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedListing?.id === listing.id ? "bg-blue-50 border-blue-400" : ""}`}
                      onClick={() => { setSelectedListing(listing); setSelectedBooking(null); }}
                    >
                      <div className="font-semibold text-black">{listing.title}</div>
                      <div className="text-xs text-gray-500 truncate">{listing.city}, {listing.state}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Details area */}
            <div className="flex-1 flex flex-col">
              {selectedBooking ? (
                <ApprovedBookingDetailsView booking={selectedBooking} showApproveButton={false} />
              ) : selectedListing ? (
                <ListingDetailsView listing={selectedListing} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select an item to view details</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ListingDetailsView({ listing }: { listing: Listing }) {
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
        <h1 className="text-3xl font-bold mb-6 text-black">{listing.title}</h1>
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
  const [status, setStatus] = useState(booking.status);
  useEffect(() => {
    fetch(`http://localhost:4000/api/listings/${booking.listing_id}`)
      .then(res => res.json())
      .then(data => setListing(data))
      .catch(() => setListing(null));
  }, [booking.listing_id]);

  const handleApprove = async () => {
    const res = await fetch(`http://localhost:4000/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: booking.start_date,
        end_date: booking.end_date,
        price_per_night: booking.price_per_night,
        total_price: booking.total_price,
        status: 'approved',
        payment_status: booking.payment_status
      })
    });
    if (res.ok) {
      setStatus('approved');
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('bookingStatusChanged', { detail: { id: booking.id, status: 'approved' } }));
      }
      alert('Booking approved!');
    } else {
      alert('Failed to approve booking.');
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
  const [status, setStatus] = React.useState(booking.status);

  React.useEffect(() => {
    async function fetchListing() {
      const res = await fetch(`http://localhost:4000/api/listings/${listingId}`);
      if (res.ok) setListing(await res.json());
    }
    if (listingId) fetchListing();
  }, [listingId]);

  const handleApprove = async () => {
    const res = await fetch(`http://localhost:4000/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: booking.start_date,
        end_date: booking.end_date,
        price_per_night: booking.price_per_night,
        total_price: booking.total_price,
        status: 'approved',
        payment_status: booking.payment_status
      })
    });
    if (res.ok) {
      setStatus('approved');
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('bookingStatusChanged', { detail: { id: booking.id, status: 'approved' } }));
      }
      alert('Booking approved!');
    } else {
      alert('Failed to approve booking.');
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
      </div>
    </div>
  );
} 