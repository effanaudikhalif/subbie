"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import SearchBar from "../../../components/Searchbar";
import ChatBox from "../../../components/ChatBox";
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useAuth } from "../../../hooks/useAuth";

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
}

interface User {
  id: string;
  name: string;
  university_id: string;
}

interface University {
  id: string;
  name: string;
}

export default function ListingDetails() {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<User | null>(null);
  const [university, setUniversity] = useState<University | null>(null);
  const { user } = useAuth();

  // SearchBar state
  const [where, setWhere] = useState("");
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState("");
  const handleSearch = () => {
    // Implement navigation or search logic if needed
  };

  // Booking card state
  const [bookingDateRange, setBookingDateRange] = useState([
    {
      startDate: undefined,
      endDate: undefined,
      key: 'selection',
    },
  ]);
  const [bookingShowCalendar, setBookingShowCalendar] = useState(false);
  const [bookingGuests, setBookingGuests] = useState('');

  let nights = 0;
  let totalPrice = 0;
  function formatPrice(price: number) {
    const formatted = Number(price).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    // Fallback: if $ is missing, prepend it
    return formatted.startsWith('$') ? formatted : `$${formatted}`;
  }
  if (listing && bookingDateRange[0].startDate && bookingDateRange[0].endDate) {
    const start = new Date(bookingDateRange[0].startDate);
    const end = new Date(bookingDateRange[0].endDate);
    nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    totalPrice = nights * (listing.price_per_night || 0);
  }

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/listings/${id}`);
        const data = await res.json();
        setListing(data);

        // Fetch host user
        if (data.user_id) {
          const userRes = await fetch(`http://localhost:4000/api/users/${data.user_id}`);
          const user = await userRes.json();
          setHost(user);
          // Fetch university
          if (user.university_id) {
            const uniRes = await fetch(`http://localhost:4000/api/universities/${user.university_id}`);
            const uni = await uniRes.json();
            setUniversity(uni);
          }
        }
      } catch (e) {
        setListing(null);
        setHost(null);
        setUniversity(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <Navbar>
          <SearchBar
            where={where}
            setWhere={setWhere}
            dateRange={dateRange}
            setDateRange={setDateRange}
            showCalendar={showCalendar}
            setShowCalendar={setShowCalendar}
            guests={guests}
            setGuests={setGuests}
            onSearch={handleSearch}
          />
        </Navbar>
        <div className="max-w-6xl mx-auto mt-16 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <Navbar fixed={false}>
          <SearchBar
            where={where}
            setWhere={setWhere}
            dateRange={dateRange}
            setDateRange={setDateRange}
            showCalendar={showCalendar}
            setShowCalendar={setShowCalendar}
            guests={guests}
            setGuests={setGuests}
            onSearch={handleSearch}
          />
        </Navbar>
        <div className="max-w-6xl mx-auto mt-16 text-center text-red-500">Listing not found.</div>
      </div>
    );
  }

  // Image grid logic
  let images = listing.images && listing.images.length > 0 ? listing.images : [
    { url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }
  ];
  // Sort by order_index if present
  images = images.slice().sort((a, b) => {
    if (a.order_index !== undefined && b.order_index !== undefined) {
      return a.order_index - b.order_index;
    }
    return 0;
  });
  
  // Convert relative URLs to absolute URLs for uploaded images
  images = images.map(img => ({
    ...img,
    url: img.url.startsWith('/uploads/') ? `http://localhost:4000${img.url}` : img.url
  }));

  return (
    <div className="min-h-screen bg-white pt-16">
      <Navbar fixed={false}>
        <SearchBar
          where={where}
          setWhere={setWhere}
          dateRange={dateRange}
          setDateRange={setDateRange}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          guests={guests}
          setGuests={setGuests}
          onSearch={handleSearch}
        />
      </Navbar>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8">
        <h1 className="text-3xl font-bold mb-6 text-black">{listing.title}</h1>
        <div className="grid grid-cols-1 md:[grid-template-columns:2fr_1fr_1fr] md:grid-rows-2 gap-4 rounded-3xl overflow-hidden" style={{ height: '500px', minHeight: '300px' }}>
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
        {/* Optionally, add more details below */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Listing details */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">{host?.name ? host.name[0] : 'H'}</div>
              <div>
                <div className="text-black font-semibold">Hosted by {host?.name || 'Host'}</div>
                <div className="text-gray-500 text-sm">{university ? `${university.name} student` : ''}</div>
              </div>
            </div>
            <hr className="my-6" />
            <div>
              <h3 className="text-black font-semibold mb-2">About this place</h3>
              <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
            </div>
          </div>
          {/* Right: Booking card placeholder */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow p-6 sticky top-28 border border-gray-200 relative">
              <div className="text-black text-2xl font-bold mb-2">
                {nights > 0 ? (
                  <>
                    {formatPrice(totalPrice)} <span className="text-base font-normal text-gray-600">for {nights} night{nights > 1 ? 's' : ''}</span>
                  </>
                ) : (
                  <>
                    {formatPrice(Number(listing?.price_per_night ?? 0))} <span className="text-base font-normal text-gray-600">per night</span>
                  </>
                )}
              </div>
              {/* Booking form */}
              <div className="mt-4">
                {/* Check-in/out and guests container */}
                <div className="border rounded-xl mb-4 overflow-hidden">
                  <div className="grid grid-cols-2 border-b">
                    <div className="p-3 cursor-pointer" onClick={() => setBookingShowCalendar(!bookingShowCalendar)}>
                      <div className="text-xs font-bold text-gray-700 uppercase mb-1">Check-in</div>
                      <div className="text-gray-900 text-sm">
                        {bookingDateRange[0].startDate ? new Date(bookingDateRange[0].startDate).toLocaleDateString() : 'Add date'}
                      </div>
                    </div>
                    <div className="p-3 cursor-pointer border-l" onClick={() => setBookingShowCalendar(!bookingShowCalendar)}>
                      <div className="text-xs font-bold text-gray-700 uppercase mb-1">Check-out</div>
                      <div className="text-gray-900 text-sm">
                        {bookingDateRange[0].endDate ? new Date(bookingDateRange[0].endDate).toLocaleDateString() : 'Add date'}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col">
                    <div className="text-xs font-bold text-gray-700 uppercase mb-1">Guests</div>
                    <input
                      type="text"
                      value={bookingGuests}
                      onChange={e => setBookingGuests(e.target.value.replace(/\D/g, ''))}
                      placeholder="Add guests"
                      className="w-full bg-transparent outline-none border-none text-gray-900 placeholder-gray-400 text-sm"
                    />
                  </div>
                  {/* Calendar Dropdown */}
                  {bookingShowCalendar && (
                    <div className="absolute left-0 right-0 mx-auto top-24 z-50 bg-white rounded-xl shadow-lg">
                      <DateRange
                        ranges={bookingDateRange}
                        onChange={(item: any) => setBookingDateRange([item.selection])}
                        moveRangeOnFirstSelection={false}
                        editableDateInputs={true}
                        minDate={new Date()}
                        rangeColors={["#2563eb"]}
                      />
                    </div>
                  )}
                </div>
                <button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-xl transition">Reserve</button>
                <div className="text-center text-gray-500 text-sm mt-2">You won't be charged yet</div>
              </div>
            </div>
          </div>
        </div>
        {/* Chat box for messaging the host */}
        {host && user && user.id !== host.id && (
          <ChatBox listingId={listing.id} hostId={host.id} />
        )}
      </div>
    </div>
  );
} 