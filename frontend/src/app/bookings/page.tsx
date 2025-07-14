"use client";
import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";

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

interface Listing {
  id: string;
  title: string;
  city: string;
  state: string;
  description: string;
  images: { url: string }[];
  price_per_night: number;
  user_id: string; // Added for host
}

export default function BookingsPage() {
  const { user } = useAuth();
  const userId = typeof user?.id === 'string' ? user.id : null;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [host, setHost] = useState<any | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`http://localhost:4000/api/bookings/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setBookings([]);
        setLoading(false);
      });
  }, [userId]);

  // Fetch listing and host for selected booking
  useEffect(() => {
    if (!selected) {
      setListing(null);
      setHost(null);
      return;
    }
    fetch(`http://localhost:4000/api/listings/${selected.listing_id}`)
      .then(res => res.json())
      .then(data => {
        setListing(data);
        if (data.user_id) {
          fetch(`http://localhost:4000/api/users/${data.user_id}`)
            .then(res => res.json())
            .then(user => setHost(user))
            .catch(() => setHost(null));
        } else {
          setHost(null);
        }
      })
      .catch(() => {
        setListing(null);
        setHost(null);
      });
  }, [selected]);

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Navbar />
      <div className="flex flex-1 pt-20">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-black">Your Bookings</h2>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : bookings.length === 0 ? (
            <div className="text-gray-400">You have no bookings.</div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selected?.id === booking.id ? "bg-blue-50 border-blue-400" : ""}`}
                  onClick={() => setSelected(booking)}
                >
                  <BookingSidebarItem booking={booking} />
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Center: Chat with host */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          {selected && listing && host ? (
            <div className="flex-1 flex flex-col">
              <div className="border-b border-gray-200 px-6 py-4 bg-white">
                <div className="font-bold text-lg text-black">
                  {host?.name ? `Host: ${host.name}` : "Host"}
                </div>
                <div className="text-xs text-gray-500">Listing: {listing.title}</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChatBox
                  listingId={listing.id}
                  hostId={host.id}
                  allowHostChat={true}
                  fullWidth={true}
                  hideHeader={true}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a booking to view messages</div>
          )}
        </div>
        {/* Right: Listing details with Hosted by */}
        <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col">
          {selected && listing && host ? (
            <div>
              {listing.images && listing.images.length > 0 && (
                <img src={listing.images[0].url.startsWith('/uploads/') ? `http://localhost:4000${listing.images[0].url}` : listing.images[0].url} alt={listing.title} className="rounded-xl w-full h-48 object-cover mb-6" />
              )}
              <div className="font-bold text-2xl text-black mb-1">{listing.title}</div>
              <div className="text-gray-500 mb-2">{listing.city}, {listing.state}</div>
              <div className="text-gray-700 mb-4">{listing.description}</div>
              <div className="flex items-center gap-3 mb-4">
                {host?.avatar_url ? (
                  <img src={host.avatar_url} alt={host.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
                    {host?.name ? host.name[0] : 'H'}
                  </div>
                )}
                <div>
                  <div className="text-black font-semibold">Hosted by {host?.name || 'Host'}</div>
                  <div className="text-gray-500 text-sm">{host?.email}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-1">Booking dates: {formatDate(selected.start_date)} - {formatDate(selected.end_date)}</div>
              <div className="text-sm text-gray-500 mb-1">Total price: ${selected.total_price}</div>
              <div className="text-sm text-gray-500 mb-1">Status: {selected.status}</div>
              <div className="text-sm text-gray-500 mb-1">Payment: {selected.payment_status}</div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a booking to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingSidebarItem({ booking }: { booking: Booking }) {
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

function BookingDetailsView({ booking }: { booking: Booking }) {
  const [listing, setListing] = useState<Listing | null>(null);
  useEffect(() => {
    fetch(`http://localhost:4000/api/listings/${booking.listing_id}`)
      .then(res => res.json())
      .then(data => setListing(data))
      .catch(() => setListing(null));
  }, [booking.listing_id]);
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
        <div className="text-sm text-gray-500 mb-1">Status: {booking.status}</div>
        <div className="text-sm text-gray-500 mb-1">Payment: {booking.payment_status}</div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
} 