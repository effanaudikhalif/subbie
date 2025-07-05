"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import SearchBar from '../../components/Searchbar';
import Link from 'next/link';

export default function Results() {
  const searchParams = useSearchParams();
  const [where, setWhere] = useState(searchParams?.get('where') || '');
  const [appliedWhere, setAppliedWhere] = useState(searchParams?.get('where') || '');
  const [dateRange, setDateRange] = useState([
    {
      startDate: searchParams?.get('checkin') ? new Date(searchParams.get('checkin')!) : new Date(),
      endDate: searchParams?.get('checkout') ? new Date(searchParams.get('checkout')!) : new Date(),
      key: 'selection',
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState(searchParams?.get('guests') || '');
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/listings')
      .then(res => res.json())
      .then(data => {
        console.log('API listings:', data);
        setListings(Array.isArray(data) ? data : []);
      })
      .catch(() => setListings([]));
  }, []);

  // Filter listings based on 'appliedWhere' (case-insensitive, partial match)
  const filteredListings = listings.filter(listing =>
    listing.city?.toLowerCase().includes(appliedWhere.toLowerCase())
  );

  console.log('Filtered listings:', filteredListings);

  const handleSearch = () => {
    setAppliedWhere(where);
  };

  return (
    <div className="bg-white min-h-screen pt-16">
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
      <div className="max-w-6xl mx-4 px-12 sm:px-8 mt-12">
        <h2 className="text-xl text-black font-semibold mb-6">{filteredListings.length} places in {appliedWhere || 'your search'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {filteredListings.map(listing => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="bg-white rounded-2xl shadow p-4 flex flex-col hover:shadow-lg transition-shadow">
              <div className="relative mb-3">
                <img 
                  src={listing.images && listing.images.length > 0 
                    ? `http://localhost:4000${listing.images[0].url}` 
                    : "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80"
                  } 
                  alt={listing.title} 
                  className="rounded-xl w-full h-48 object-cover" 
                />
              </div>
              <div className="text-black font-semibold text-lg mb-1">{listing.title}</div>
              <div className="text-gray-500 text-sm mb-1">{listing.city}, {listing.state}</div>
              <div className="text-gray-500 text-sm mb-2">{listing.description}</div>
              <div className="flex items-center text-sm mb-2">
                <span className="font-bold text-black mr-1">${listing.price_per_night}</span>
                <span className="text-gray-500">for 1 night</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 