"use client";
import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";

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
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approvedBookings'>('all');

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

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Navbar />
      <div className="flex flex-1 pt-20">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
          <div className="flex mb-4">
            <button
              className={`flex-1 py-2 text-center font-semibold text-base transition border-b-2 ${activeTab === 'all' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
              onClick={() => { setActiveTab('all'); setSelectedListing(null); setSelectedBooking(null); }}
            >
              Listings
            </button>
            <button
              className={`flex-1 py-2 text-center font-semibold text-base transition border-b-2 ${activeTab === 'pending' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
              onClick={() => { setActiveTab('pending'); setSelectedListing(null); setSelectedBooking(null); }}
            >
              Pending
            </button>
            <button
              className={`flex-1 py-2 text-center font-semibold text-base transition border-b-2 ${activeTab === 'approvedBookings' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
              onClick={() => { setActiveTab('approvedBookings'); setSelectedListing(null); setSelectedBooking(null); }}
            >
              Approved
            </button>
          </div>
          <h2 className="text-xl font-bold mb-4 text-black">{activeTab === 'approvedBookings' ? 'Approved' : activeTab === 'pending' ? 'Pending' : 'Listings'}</h2>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : visibleList.length === 0 ? (
            <div className="text-gray-400">No {activeTab === 'all' ? 'listings' : activeTab === 'pending' ? 'pending' : 'approved'}.</div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {activeTab === 'approvedBookings'
                ? visibleList.map((booking: Booking) => (
                    <li
                      key={booking.id}
                      className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                      onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                    >
                      <ApprovedBookingSidebarItem booking={booking} />
                    </li>
                  ))
                : activeTab === 'pending'
                ? visibleList.map((booking: Booking) => (
                    <li
                      key={booking.id}
                      className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selectedBooking?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                      onClick={() => { setSelectedBooking(booking); setSelectedListing(null); }}
                    >
                      <ApprovedBookingSidebarItem booking={booking} />
                    </li>
                  ))
                : visibleList.map((listing: Listing) => (
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
          {(activeTab === 'approvedBookings' || activeTab === 'pending') && selectedBooking ? (
            <ApprovedBookingDetailsView booking={selectedBooking} showApproveButton={activeTab === 'pending'} />
          ) : selectedListing ? (
            <ListingDetailsView listing={selectedListing} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select an item to view details</div>
          )}
        </div>
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

function ApprovedBookingSidebarItem({ booking }: { booking: Booking }) {
  const [listing, setListing] = useState<Listing | null>(null);
  useEffect(() => {
    fetch(`http://localhost:4000/api/listings/${booking.listing_id}`)
      .then(res => res.json())
      .then(data => setListing(data))
      .catch(() => setListing(null));
  }, [booking.listing_id]);
  return (
    <div>
      <div className="font-semibold text-black text-base">{listing?.title || "Listing"}</div>
      <div className="text-xs text-gray-500">{listing?.city}, {listing?.state}</div>
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