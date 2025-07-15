"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import SearchBar from '../../components/Searchbar';
import Link from 'next/link';
import ListingCard from '../../components/ListingCard';

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
  // Search in city, state, and neighborhood
  const filteredListings = listings.filter(listing => {
    const searchTerm = appliedWhere.toLowerCase();
    return (
      listing.city?.toLowerCase().includes(searchTerm) ||
      listing.state?.toLowerCase().includes(searchTerm) ||
      listing.neighborhood?.toLowerCase().includes(searchTerm)
    );
  });

  console.log('Filtered listings:', filteredListings);

  const handleSearch = () => {
    setAppliedWhere(where);
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar>
        <div className="flex items-center justify-center w-full px-4 sm:px-12 mt-8">
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
        </div>
      </Navbar>
      <div className="px-4 sm:px-8 mt-12">
        <h2 className="text-xl text-black font-semibold mb-6">{filteredListings.length} places in {appliedWhere || 'your search'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {filteredListings.map(listing => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              image={listing.images?.[0]?.url || 'https://via.placeholder.com/400x300?text=No+Image'}
              title={listing.title}
              city={listing.city}
              state={listing.state}
              neighborhood={listing.neighborhood}
              description={listing.description}
              pricePerNight={listing.price_per_night}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 