"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from "next/navigation";
import Navbar from '../../components/Navbar';
import SearchBar from '../../components/Searchbar';
import LocationMapPreview from '../../components/LocationMapPreview';
import Link from 'next/link';

export default function Results() {
  const searchParams = useSearchParams();
  const router = useRouter();
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

  // Update appliedWhere when URL parameters change
  useEffect(() => {
    const whereParam = searchParams?.get('where');
    if (whereParam) {
      setAppliedWhere(whereParam);
      setWhere(whereParam);
    }
  }, [searchParams, setWhere]);

  // Filter listings based on 'appliedWhere' (case-insensitive, partial match)
  // Search in city, state, and neighborhood
  const filteredListings = listings.filter(listing => {
    const searchTerm = appliedWhere.toLowerCase();
    
    // Extract parts from Google Maps formatted addresses (e.g., "Allston, Boston, MA, USA")
    let citySearchTerm = searchTerm;
    let neighborhoodSearchTerm = '';
    
    if (searchTerm.includes(',')) {
      const parts = searchTerm.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        // First part is usually neighborhood, second part is city
        neighborhoodSearchTerm = parts[0].toLowerCase();
        citySearchTerm = parts[1].toLowerCase();
      } else {
        citySearchTerm = parts[0].toLowerCase();
      }
    }
    
    console.log('Search debugging:', {
      searchTerm,
      citySearchTerm,
      neighborhoodSearchTerm,
      listingCity: listing.city,
      listingState: listing.state,
      listingNeighborhood: listing.neighborhood
    });
    
    return (
      // Check if neighborhood matches
      listing.neighborhood?.toLowerCase().includes(neighborhoodSearchTerm) ||
      // Check if city matches
      listing.city?.toLowerCase().includes(citySearchTerm) ||
      // Check if state matches
      listing.state?.toLowerCase().includes(searchTerm) ||
      // Also check if the full search term matches any part of the address
      listing.city?.toLowerCase().includes(searchTerm) ||
      listing.state?.toLowerCase().includes(searchTerm) ||
      listing.neighborhood?.toLowerCase().includes(searchTerm)
    );
  });

  console.log('Filtered listings:', filteredListings);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (where) params.set("where", where);
    if (dateRange[0].startDate) params.set("checkin", dateRange[0].startDate.toISOString().split("T")[0]);
    if (dateRange[0].endDate) params.set("checkout", dateRange[0].endDate.toISOString().split("T")[0]);
    if (guests) params.set("guests", guests);
    router.push(`/listings?${params.toString()}`);
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
      
      {/* Split Layout: Listings on left, Map preview on right */}
      <div className="flex h-screen pt-16">
        {/* Left side - Listings */}
        <div className="w-1/2 overflow-y-auto p-6">
          <h2 className="text-xl text-black font-semibold mb-6">
            {filteredListings.length} places in {appliedWhere || 'your search'}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredListings.map(listing => (
              <Link 
                key={listing.id} 
                href={`/listings/${listing.id}`} 
                className="block bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="flex flex-col">
                  {/* Image Container */}
                  <div className="relative">
                    <img 
                      src={listing.images && listing.images.length > 0 
                        ? `http://localhost:4000${listing.images[0].url}` 
                        : "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80"
                      } 
                      alt={listing.title} 
                      className="w-full h-48 object-cover" 
                    />
                    
                    {/* Heart Icon */}
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    
                    {/* Navigation Arrow */}
                    <button className="absolute top-1/2 right-3 transform -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Image Dots */}
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full opacity-100"></div>
                      <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                      <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                      <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                      <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-black font-semibold text-lg truncate flex-1">
                        {listing.title}
                      </div>
                      <div className="flex items-center ml-2">
                      </div>
                    </div>
                    
                    <div className="text-gray-500 text-sm mb-1">
                      {listing.neighborhood && `${listing.neighborhood}, `}{listing.city}, {listing.state}
                    </div>
                    
                    <div className="text-gray-500 text-sm mb-2 line-clamp-1">
                      {listing.description}
                    </div>
                    
                    <div className="text-gray-500 text-sm mb-2">
                      3 beds
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-bold text-black text-lg">${listing.price_per_night}</span>
                        <span className="text-gray-500 text-sm ml-1">night</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Right side - Map Preview */}
        <div className="w-1/2 h-full p-6">
          <LocationMapPreview 
            searchLocation={appliedWhere}
            listings={filteredListings}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
} 