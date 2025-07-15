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
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});

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

  console.log('Filtered listings:', filteredListings);

  const handleNextImage = (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const listing = listings.find(l => l.id === listingId);
    const imageCount = listing?.images?.length || 0;
    console.log('Next image clicked for listing:', listingId, 'Current index:', currentImageIndex[listingId] || 0, 'Total images:', imageCount);
    
    if (imageCount > 1) {
      setCurrentImageIndex(prev => ({
        ...prev,
        [listingId]: ((prev[listingId] || 0) + 1) % imageCount
      }));
    }
  };

  const handlePrevImage = (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const listing = listings.find(l => l.id === listingId);
    const imageCount = listing?.images?.length || 0;
    console.log('Prev image clicked for listing:', listingId, 'Current index:', currentImageIndex[listingId] || 0, 'Total images:', imageCount);
    
    if (imageCount > 1) {
      setCurrentImageIndex(prev => ({
        ...prev,
        [listingId]: prev[listingId] === 0 
          ? imageCount - 1
          : (prev[listingId] || 0) - 1
      }));
    }
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
      <div className="flex h-[calc(100vh-4rem)] pt-8">
        {/* Left side - Listings */}
        <div className="w-1/2 overflow-y-auto p-6 h-full listings-container">
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
                      src={(() => {
                        const currentIndex = currentImageIndex[listing.id] || 0;
                        const imageUrl = listing.images && listing.images.length > 0 
                          ? `http://localhost:4000${listing.images[currentIndex]?.url || listing.images[0].url}` 
                          : "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80";
                        
                        console.log('Displaying image for listing:', listing.id, 'Index:', currentIndex, 'URL:', imageUrl, 'Total images:', listing.images?.length || 0);
                        return imageUrl;
                      })()}
                      alt={listing.title} 
                      className="w-full h-48 object-cover" 
                    />
                    
                    {/* Heart Icon */}
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    
                    {/* Navigation Arrows */}
                    {listing.images && listing.images.length > 1 && (
                      <>
                        {/* Left Arrow - only show if not on first image */}
                        {(currentImageIndex[listing.id] || 0) > 0 && (
                          <button 
                            className="absolute top-1/2 left-3 transform -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handlePrevImage(listing.id, e);
                            }}
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Right Arrow - only show if not on last image */}
                        {(currentImageIndex[listing.id] || 0) < listing.images.length - 1 && (
                          <button 
                            className="absolute top-1/2 right-3 transform -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleNextImage(listing.id, e);
                            }}
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                    
                    {/* Image Dots */}
                    {listing.images && listing.images.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                        {listing.images.slice(0, 5).map((_: any, index: number) => (
                          <div 
                            key={index}
                            className={`w-2 h-2 bg-white rounded-full ${index === (currentImageIndex[listing.id] || 0) ? 'opacity-100' : 'opacity-60'}`}
                          />
                        ))}
                        {listing.images.length > 5 && (
                          <div className="w-2 h-2 bg-white rounded-full opacity-60 flex items-center justify-center">
                            <span className="text-xs text-gray-800 font-medium">+{listing.images.length - 5}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    {/* Title */}
                    <div className="text-black font-semibold text-lg mb-2">
                      {listing.title}
                    </div>
                    
                    {/* Profile picture, Name, and University */}
                    <div className="flex items-center mb-2">
                      {listing.avatar_url ? (
                        <img 
                          src={listing.avatar_url} 
                          alt={listing.name || 'Host'} 
                          className="w-8 h-8 rounded-full mr-3 flex-shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex-shrink-0">
                          <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-sm font-medium">
                              {listing.name ? listing.name.charAt(0).toUpperCase() : 'H'}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 text-sm font-medium">
                          {listing.name || 'Host'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {listing.university_name || 'University'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Beds • Baths */}
                    <div className="text-gray-500 text-sm mb-2">
                      {listing.bedrooms || 1} bed{(listing.bedrooms || 1) !== 1 ? 's' : ''} • {listing.bathrooms || 1} bath{(listing.bathrooms || 1) !== 1 ? 's' : ''}
                    </div>
                    
                    {/* Price per night • Total for nights */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-bold text-black text-lg">${Math.round(listing.price_per_night)}</span>
                        <span className="text-gray-500 text-sm ml-1">per night</span>
                        {dateRange[0].startDate && dateRange[0].endDate && (
                          <>
                            <span className="text-gray-500 text-sm mx-1">•</span>
                            <span className="font-bold text-black text-lg">
                              ${(() => {
                                const checkIn = new Date(dateRange[0].startDate);
                                const checkOut = new Date(dateRange[0].endDate);
                                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                                const totalPrice = nights * listing.price_per_night;
                                return Math.round(totalPrice);
                              })()}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">
                              for {(() => {
                                const checkIn = new Date(dateRange[0].startDate);
                                const checkOut = new Date(dateRange[0].endDate);
                                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                                return nights;
                              })()} night{(() => {
                                const checkIn = new Date(dateRange[0].startDate);
                                const checkOut = new Date(dateRange[0].endDate);
                                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                                return nights !== 1 ? 's' : '';
                              })()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Right side - Map Preview */}
        <div className="w-1/2 h-[calc(100vh-6rem)] p-6 flex-shrink-0">
          <LocationMapPreview 
            searchLocation={appliedWhere}
            listings={filteredListings}
            className="h-full"
            dateRange={dateRange}
          />
        </div>
      </div>
    </div>
  );
} 