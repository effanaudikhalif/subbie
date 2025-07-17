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
  const [where, setWhere] = useState(searchParams?.get('where') || '');
  const [appliedWhere, setAppliedWhere] = useState(searchParams?.get('where') || '');
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState(searchParams?.get('guests') || '');
  const [listings, setListings] = useState<any[]>([]);
  const [averageRatings, setAverageRatings] = useState<Record<string, { average_rating: number; total_reviews: number }>>({});

  useEffect(() => {
    fetch('http://localhost:4000/api/listings')
      .then(res => res.json())
      .then(data => {
        console.log('API listings:', data);
        setListings(Array.isArray(data) ? data : []);
      })
      .catch(() => setListings([]));
  }, []);

  // Fetch average ratings for listings
  useEffect(() => {
    fetch('http://localhost:4000/api/listings/average-ratings')
      .then(res => res.json())
      .then(data => {
        setAverageRatings(data);
      })
      .catch(() => setAverageRatings({}));
  }, []);

  // Update appliedWhere when URL parameters change
  useEffect(() => {
    const whereParam = searchParams?.get('where');
    console.log('URL whereParam:', whereParam);
    if (whereParam) {
      setAppliedWhere(whereParam);
      setWhere(whereParam);
    }
  }, [searchParams, setWhere]);

  // Filter listings based on 'appliedWhere' (case-insensitive, partial match)
  // Search in city, state, and neighborhood
  console.log('AppliedWhere:', appliedWhere);
  const filteredListings = listings.filter(listing => {
    // If no search term, show all listings
    if (!appliedWhere || appliedWhere.trim() === '') {
      return true;
    }
    
    const searchTerm = appliedWhere.toLowerCase();
    
    // Parse Google Maps formatted address (e.g., "Boston, MA, USA")
    let searchParts = [];
    if (searchTerm.includes(',')) {
      searchParts = searchTerm.split(',').map(part => part.trim().toLowerCase());
    } else {
      searchParts = [searchTerm];
    }
    
    // State abbreviation mapping for all 50 US states
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
    
    // Check if any part of the search matches any location field
    const matches = searchParts.some(part => {
      const cityMatch = listing.city?.toLowerCase().includes(part);
      
      // Check state match with abbreviation support
      let stateMatch = listing.state?.toLowerCase().includes(part);
      if (!stateMatch && stateAbbreviations[part]) {
        stateMatch = listing.state?.toLowerCase().includes(stateAbbreviations[part]);
      }
      
      const neighborhoodMatch = listing.neighborhood?.toLowerCase().includes(part);
      return cityMatch || stateMatch || neighborhoodMatch;
    });
    
    console.log('Search debugging:', {
      searchTerm,
      searchParts,
      matches,
      listingCity: listing.city,
      listingState: listing.state,
      listingNeighborhood: listing.neighborhood,
      listingId: listing.id
    });
    
    console.log(`Listing ${listing.id}: ${matches ? 'MATCH' : 'NO MATCH'}`);
    return matches;
  });

  // Add average ratings to filtered listings
  const listingsWithRatings = filteredListings.map(listing => ({
    ...listing,
    averageRating: averageRatings[listing.id]?.average_rating,
    totalReviews: averageRatings[listing.id]?.total_reviews
  }));

  console.log('Filtered listings:', listingsWithRatings);

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
    console.log('handleSearch called with where:', where);
    const params = new URLSearchParams();
    if (where) params.set("where", where);
    if (dateRange[0].startDate) params.set("checkin", dateRange[0].startDate.toISOString().split("T")[0]);
    if (dateRange[0].endDate) params.set("checkout", dateRange[0].endDate.toISOString().split("T")[0]);
    if (guests) params.set("guests", guests);
    const url = `/listings?${params.toString()}`;
    console.log('Navigating to:', url);
    router.push(url);
  };

  return (
    <div className="bg-white min-h-screen pt-12">
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
      <div className="h-[calc(100vh-4rem)] pt-13 pb-6">
        <div className="flex h-full">
          {/* Left side - Listings */}
          <div className="w-1/2 overflow-y-auto px-6 h-full listings-container">
            <h2 className="text-xl text-black font-semibold mb-6">
              {filteredListings.length} places {getSearchTitle(appliedWhere)}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredListings.map(listing => (
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
                  averageRating={averageRatings[listing.id]?.average_rating}
                  totalReviews={averageRatings[listing.id]?.total_reviews}
                />
              ))}
            </div>
          </div>
          
          {/* Right side - Map Preview */}
          <div className="w-1/2 h-full overflow-hidden flex-shrink-0 px-6">
            <LocationMapPreview 
              searchLocation={appliedWhere}
              listings={listingsWithRatings}
              className="h-full w-full"
              dateRange={dateRange}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 