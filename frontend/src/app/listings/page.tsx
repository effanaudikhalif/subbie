"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from "next/navigation";
import Navbar from '../../components/Navbar';
import SearchBar from '../../components/Searchbar';
import LocationMapPreview from '../../components/LocationMapPreview';
import ListingCard from '../../components/ListingCard';
import Link from 'next/link';

export default function Results() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Draft state for search bar (user input)
  const [draftWhere, setDraftWhere] = useState(searchParams?.get('where') || '');
  const [draftDateRange, setDraftDateRange] = useState([
    {
      startDate: searchParams?.get('checkin') ? new Date(searchParams.get('checkin')!) : new Date(),
      endDate: searchParams?.get('checkout') ? new Date(searchParams.get('checkout')!) : (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      })(),
      key: 'selection',
    },
  ]);
  const [draftGuests, setDraftGuests] = useState(searchParams?.get('guests') || '');
  const [showCalendar, setShowCalendar] = useState(false);

  // Applied state for filtering and display
  const [where, setWhere] = useState(searchParams?.get('where') || '');
  const [dateRange, setDateRange] = useState([
    {
      startDate: searchParams?.get('checkin') ? new Date(searchParams.get('checkin')!) : new Date(),
      endDate: searchParams?.get('checkout') ? new Date(searchParams.get('checkout')!) : (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      })(),
      key: 'selection',
    },
  ]);
  const [guests, setGuests] = useState(searchParams?.get('guests') || '');
  const [listings, setListings] = useState<any[]>([]);
  const [averageRatings, setAverageRatings] = useState<Record<string, { average_rating: number; total_reviews: number }>>({});
  // State for map bounds
  const [visibleBounds, setVisibleBounds] = useState<{ sw: { lat: number, lng: number }, ne: { lat: number, lng: number } } | null>(null);
  // Add a key to force map refresh
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const listingsPerPage = 15;

  // Applied values from URL/query params (used for filtering)
  const appliedWhere = searchParams?.get('where') || '';
  const appliedGuests = searchParams?.get('guests') || '';
  const appliedCheckin = searchParams?.get('checkin') || '';
  const appliedCheckout = searchParams?.get('checkout') || '';
  const appliedDateRange = [
    {
      startDate: appliedCheckin ? new Date(appliedCheckin) : null,
      endDate: appliedCheckout ? new Date(appliedCheckout) : null,
      key: 'selection',
    },
  ];

  useEffect(() => {
    fetch('http://localhost:4000/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(Array.isArray(data) ? data : []);
      })
      .catch(() => setListings([]));
  }, []);

  useEffect(() => {
    fetch('http://localhost:4000/api/listings/average-ratings')
      .then(res => res.json())
      .then(data => {
        setAverageRatings(data);
      })
      .catch(() => setAverageRatings({}));
  }, []);

  // Update draft state when search params change (e.g. on page load or navigation)
  useEffect(() => {
    setDraftWhere(searchParams?.get('where') || '');
    setDraftDateRange([
      {
        startDate: searchParams?.get('checkin') ? new Date(searchParams.get('checkin')!) : new Date(),
        endDate: searchParams?.get('checkout') ? new Date(searchParams.get('checkout')!) : (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        })(),
        key: 'selection',
      },
    ]);
    setDraftGuests(searchParams?.get('guests') || '');
  }, [searchParams]);

  // Filter listings based on applied values from URL/query params and map bounds
  const filteredListings = listings.filter(listing => {
    // Map bounds filter
    if (visibleBounds && listing.latitude && listing.longitude) {
      const lat = parseFloat(listing.latitude);
      const lng = parseFloat(listing.longitude);
      if (
        lat < visibleBounds.sw.lat || lat > visibleBounds.ne.lat ||
        lng < visibleBounds.sw.lng || lng > visibleBounds.ne.lng
      ) {
        return false;
      }
    }
    // Location filter
    if (where && where.trim() !== '') {
      const searchTerm = where.toLowerCase();
      let searchParts = [];
      if (searchTerm.includes(',')) {
        searchParts = searchTerm.split(',').map(part => part.trim().toLowerCase());
      } else {
        searchParts = [searchTerm];
      }
      const stateAbbreviations: { [key: string]: string } = {
        'alabama': 'al', 'al': 'al',
        'alaska': 'ak', 'ak': 'ak',
        'arizona': 'az', 'az': 'az',
        'arkansas': 'ar', 'ar': 'ar',
        'california': 'ca', 'ca': 'ca',
        'colorado': 'co', 'co': 'co',
        'connecticut': 'ct', 'ct': 'ct',
        'delaware': 'de', 'de': 'de',
        'florida': 'fl', 'fl': 'fl',
        'georgia': 'ga', 'ga': 'ga',
        'hawaii': 'hi', 'hi': 'hi',
        'idaho': 'id', 'id': 'id',
        'illinois': 'il', 'il': 'il',
        'indiana': 'in', 'in': 'in',
        'iowa': 'ia', 'ia': 'ia',
        'kansas': 'ks', 'ks': 'ks',
        'kentucky': 'ky', 'ky': 'ky',
        'louisiana': 'la', 'la': 'la',
        'maine': 'me', 'me': 'me',
        'maryland': 'md', 'md': 'md',
        'massachusetts': 'ma', 'ma': 'ma',
        'michigan': 'mi', 'mi': 'mi',
        'minnesota': 'mn', 'mn': 'mn',
        'mississippi': 'ms', 'ms': 'ms',
        'missouri': 'mo', 'mo': 'mo',
        'montana': 'mt', 'mt': 'mt',
        'nebraska': 'ne', 'ne': 'ne',
        'nevada': 'nv', 'nv': 'nv',
        'new hampshire': 'nh', 'nh': 'nh',
        'new jersey': 'nj', 'nj': 'nj',
        'new mexico': 'nm', 'nm': 'nm',
        'new york': 'ny', 'ny': 'ny',
        'north carolina': 'nc', 'nc': 'nc',
        'north dakota': 'nd', 'nd': 'nd',
        'ohio': 'oh', 'oh': 'oh',
        'oklahoma': 'ok', 'ok': 'ok',
        'oregon': 'or', 'or': 'or',
        'pennsylvania': 'pa', 'pa': 'pa',
        'rhode island': 'ri', 'ri': 'ri',
        'south carolina': 'sc', 'sc': 'sc',
        'south dakota': 'sd', 'sd': 'sd',
        'tennessee': 'tn', 'tn': 'tn',
        'texas': 'tx', 'tx': 'tx',
        'utah': 'ut', 'ut': 'ut',
        'vermont': 'vt', 'vt': 'vt',
        'virginia': 'va', 'va': 'va',
        'washington': 'wa', 'wa': 'wa',
        'west virginia': 'wv', 'wv': 'wv',
        'wisconsin': 'wi', 'wi': 'wi',
        'wyoming': 'wy', 'wy': 'wy'
      };
      const matches = searchParts.some(part => {
        const cityMatch = listing.city?.toLowerCase().includes(part);
        let stateMatch = listing.state?.toLowerCase().includes(part);
        if (!stateMatch && stateAbbreviations[part]) {
          stateMatch = listing.state?.toLowerCase().includes(stateAbbreviations[part]);
        }
        const neighborhoodMatch = listing.neighborhood?.toLowerCase().includes(part);
        return cityMatch || stateMatch || neighborhoodMatch;
      });
      if (!matches) return false;
    }
    // Guests filter
    if (guests && Number(guests) > 0) {
      if (listing.max_occupancy < Number(guests)) return false;
    }
    // Date range filter
    if (dateRange[0]?.startDate && dateRange[0]?.endDate && listing.start_date && listing.end_date) {
      const checkin = new Date(dateRange[0].startDate);
      const checkout = new Date(dateRange[0].endDate);
      const availableStart = new Date(listing.start_date);
      const availableEnd = new Date(listing.end_date);
      // Only include listings where the entire requested range is within the available range
      if (checkin < availableStart || checkout > availableEnd) {
        return false;
      }
    }
    return true;
  });

  // Reset to page 1 when filtered listings change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredListings.length]);

  // Reset visibleBounds whenever the search location changes
  useEffect(() => {
    setVisibleBounds(null);
  }, [where]);

  const listingsWithRatings = filteredListings.map(listing => ({
    ...listing,
    averageRating: averageRatings[listing.id]?.average_rating,
    totalReviews: averageRatings[listing.id]?.total_reviews
  }));

  // Pagination logic
  const totalPages = Math.ceil(listingsWithRatings.length / listingsPerPage);
  const startIndex = (currentPage - 1) * listingsPerPage;
  const endIndex = startIndex + listingsPerPage;
  const paginatedListings = listingsWithRatings.slice(startIndex, endIndex);

  console.log('Filtered listings:', listingsWithRatings);
  console.log('Filtered listings with coords:', listingsWithRatings.filter(l => l.latitude && l.longitude));

  // Function to determine if search is for a specific address or broader location
  const getSearchTitle = (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return 'your search';
    }
    
    const term = searchTerm.toLowerCase();
    
    // Check if it's a specific address (contains street numbers, specific building names, etc.)
    const hasStreetNumber = /\d/.test(searchTerm);
    const hasSpecificBuilding = searchTerm.includes('building') || searchTerm.includes('apartment') || 
                               searchTerm.includes('suite') || searchTerm.includes('unit') ||
                               searchTerm.includes('floor') || searchTerm.includes('room');
    const hasStreetName = searchTerm.includes('street') || searchTerm.includes('avenue') || 
                          searchTerm.includes('road') || searchTerm.includes('drive') ||
                          searchTerm.includes('lane') || searchTerm.includes('way') ||
                          searchTerm.includes('blvd') || searchTerm.includes('st') ||
                          searchTerm.includes('ave') || searchTerm.includes('rd');
    
    // If it looks like a specific address, use "near"
    if (hasStreetNumber || hasSpecificBuilding || (hasStreetName && hasStreetNumber)) {
      return `near ${searchTerm}`;
    }
    
    // Otherwise, use "in" for broader locations (cities, states, neighborhoods)
    return `in ${searchTerm}`;
  };

  const handleSearch = () => {
    setWhere(draftWhere);
    setDateRange(draftDateRange);
    setGuests(draftGuests);
    const params = new URLSearchParams();
    if (draftWhere) params.set("where", draftWhere);
    if (draftDateRange[0].startDate) params.set("checkin", draftDateRange[0].startDate.toISOString().split("T")[0]);
    if (draftDateRange[0].endDate) params.set("checkout", draftDateRange[0].endDate.toISOString().split("T")[0]);
    if (draftGuests) params.set("guests", draftGuests);
    const url = `/listings?${params.toString()}`;
    router.push(url);
    setVisibleBounds(null); // Reset map bounds to ensure consistent filtering
    setMapRefreshKey(prev => prev + 1); // Force map to refresh
  };

  return (
    <div className="bg-white min-h-screen pt-12">
      <Navbar>
        <SearchBar
          where={draftWhere}
          setWhere={setDraftWhere}
          dateRange={draftDateRange}
          setDateRange={setDraftDateRange}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          guests={draftGuests}
          setGuests={setDraftGuests}
          onSearch={handleSearch}
        />
      </Navbar>
      
      {/* Split Layout: Listings on left, Map preview on right */}
      <div className="h-[calc(100vh-4rem)] pt-20 pb-6">
        <div className="flex h-full">
          {/* Left side - Listings */}
          <div className="w-1/2 overflow-y-auto px-8 h-[80vh] listings-container pb-2">
            <h2 className="merriweather-medium text-black font-bold mb-0.5 text-sm mb-6">
              {filteredListings.length} places within map area
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-5">
              {paginatedListings.map(listing => {
                console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                return (
                  <ListingCard
                    key={listing.id}
                    id={listing.id}
                    title={listing.title}
                    images={listing.images || []}
                    name={listing.name}
                    avatar_url={listing.avatar_url}
                    university_name={listing.university_name}
                    bedrooms={listing.bedrooms}
                    bathrooms={listing.bathrooms}
                    price_per_night={listing.price_per_night}
                    dateRange={dateRange}
                    averageRating={listing.averageRating}
                    totalReviews={listing.totalReviews}
                    amenities={listing.amenities || []}
                    cardHeight="h-[300px]"
                  />
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          
          {/* Right side - Map Preview */}
          <div className="w-1/2 h-[80vh] overflow-hidden flex-shrink-0 px-8 map-container">
            <LocationMapPreview 
              key={mapRefreshKey}
              searchLocation={where}
              listings={listingsWithRatings}
              className="h-full w-full"
              dateRange={dateRange}
              onBoundsChange={setVisibleBounds}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 