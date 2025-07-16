"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import SearchBar from "../../../components/Searchbar";
import PrivacyMap from "../../../components/PrivacyMap";
import BookingForm from "../../../components/BookingForm";
import ReviewsSection from "../../../components/ReviewsSection";
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
  property_type?: string;
  guest_space?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_occupancy?: number;
  amenities?: any[];
  occupants?: string[];
  latitude?: number;
  longitude?: number;
}

interface User {
  id: string;
  name: string;
  university_id: string;
  avatar_url?: string;
}

interface University {
  id: string;
  name: string;
}

export default function ListingDetails() {
  const { id } = useParams();
  const router = useRouter();
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

  const handleMessageHost = async () => {
    if (!user || !host) return;
    
    try {
      // Create or find conversation
      const response = await fetch('http://localhost:4000/api/conversations/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing?.id,
          guest_id: user.id,
          host_id: host.id,
        }),
      });
      
      if (response.ok) {
        // Navigate to messages page with URL parameters to auto-select the conversation
        router.push(`/messages?listingId=${listing?.id}&hostId=${host.id}`);
      } else {
        alert('Failed to create conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to create conversation. Please try again.');
    }
  };

  function formatPrice(price: number) {
    const formatted = Number(price).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    // Fallback: if $ is missing, prepend it
    return formatted.startsWith('$') ? formatted : `$${formatted}`;
  }

  useEffect(() => {
    // Apply overscroll behavior to prevent bounce
    document.documentElement.style.overscrollBehavior = 'contain';
    document.body.style.overscrollBehavior = 'contain';
    
    // Ensure white background
    document.documentElement.style.backgroundColor = 'white';
    document.body.style.backgroundColor = 'white';
    
    // Cleanup function to reset
    return () => {
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

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
    <div className="min-h-screen bg-white pt-16" style={{ overscrollBehavior: 'contain', backgroundColor: 'white' }}>
      <div className="fixed inset-0 bg-white -z-10"></div>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 pt-8 pb-8">
        <h1 className="text-3xl font-bold mb-2 text-black">{listing.title}</h1>
        <p className="text-gray-600 text-base mb-6">{listing.description}</p>
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {host?.avatar_url ? (
                  <img 
                    src={host.avatar_url} 
                    alt={host.name || 'Host'} 
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
                    {host?.name ? host.name[0] : 'H'}
                  </div>
                )}
                <div>
                  <div className="text-black font-semibold">Hosted by {host?.name || 'Host'}</div>
                  <div className="text-gray-500 text-sm">{university ? `${university.name} student` : ''}</div>
                </div>
              </div>
              {user && user.id !== host?.id && (
                <button
                  onClick={handleMessageHost}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow"
                >
                  Message Host
                </button>
              )}
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
                {/* Amenities */}
                <div>
                  <div className="font-semibold text-gray-800 mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities && listing.amenities.length > 0 ? (
                      listing.amenities.map((a: any) => (
                        <span
                          key={a.code}
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${a.is_premium ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-gray-100 border-gray-200 text-gray-700'}`}
                        >
                          {a.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">No amenities listed</span>
                    )}
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
          </div>
          {/* Right: Booking form */}
          <div className="md:col-span-1">
            <div className="sticky top-28">
              {user && user.id !== listing.user_id ? (
                <BookingForm
                  listing={{
                    id: listing.id,
                    title: listing.title,
                    price_per_night: listing.price_per_night,
                    user_id: listing.user_id
                  }}
                  onSuccess={(booking) => {
                    alert('Booking request submitted successfully! The host has 24 hours to respond.');
                    // Optionally redirect to bookings page
                    // window.location.href = '/bookings';
                  }}
                  onCancel={() => {
                    // Handle cancel if needed
                  }}
                />
              ) : (
                <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
                  <div className="text-black text-2xl font-bold mb-2">
                    {formatPrice(Number(listing?.price_per_night ?? 0))} <span className="text-base font-normal text-gray-600">per night</span>
                  </div>
                  <div className="text-center text-gray-500 py-8">
                    {user ? 'This is your own listing' : 'Please log in to book this listing'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <h3 className="text-black font-semibold text-xl mb-6">Reviews</h3>
          <ReviewsSection listingId={listing.id} />
        </div>
      </div>
    </div>
  );
} 