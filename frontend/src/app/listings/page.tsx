"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from "next/navigation";
import Navbar from '../../components/Navbar';
import MobileNavbar from '../../components/MobileNavbar';
import SearchBar from '../../components/Searchbar';
import LocationMapPreview from '../../components/LocationMapPreview';
import ListingCard from '../../components/ListingCard';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

export default function Results() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

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
  const [gridColumns, setGridColumns] = useState('repeat(3, 1fr)');
  const [isLargeSize, setIsLargeSize] = useState(false);
  const [isMediumSize, setIsMediumSize] = useState(false);
  const [isSmallSize, setIsSmallSize] = useState(false);
  const [isExtraSmallSize, setIsExtraSmallSize] = useState(false);
  const [isExtraExtraSmallSize, setIsExtraExtraSmallSize] = useState(false);
  const [isMobileLarge, setIsMobileLarge] = useState(false);
  const [isMobileMedium, setIsMobileMedium] = useState(false);
  const [isMobileSmall, setIsMobileSmall] = useState(false);

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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const mobile = width < 750;
      console.log('Screen width:', width, 'isMobile:', mobile);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Handle responsive grid columns
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      console.log('Screen width:', width);
      
      if (width >= 1390) {
        setGridColumns('repeat(3, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(false);
        setIsSmallSize(false);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(false);
        setIsMobileMedium(false);
        setIsMobileSmall(false);
        console.log('Large size');
      } else if (width >= 1315) {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(true);
        setIsMediumSize(false);
        setIsSmallSize(false);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(false);
        setIsMobileMedium(false);
        setIsMobileSmall(false);
        console.log('Large size (2 cols)');
      } else if (width >= 1180) {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(true);
        setIsSmallSize(false);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(false);
        setIsMobileMedium(false);
        setIsMobileSmall(false);
        console.log('Medium size');
      } else if (width >= 1030) {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(false);
        setIsSmallSize(true);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(false);
        setIsMobileMedium(false);
        setIsMobileSmall(false);
        console.log('Small size');
      } else if (width >= 925) {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(false);
        setIsSmallSize(false);
        setIsExtraSmallSize(true);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(false);
        setIsMobileMedium(false);
        setIsMobileSmall(false);
        console.log('Extra Small size');
      } else if (width >= 750) {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(false);
        setIsSmallSize(false);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(true);
        setIsMobileLarge(false);
        setIsMobileMedium(false);
        setIsMobileSmall(false);
        console.log('Extra Extra Small size');
      } else if (width >= 670) {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(false);
        setIsSmallSize(false);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(true);
        setIsMobileMedium(false);
        console.log('Mobile Large size');
      } else if (width >= 580) {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(false);
        setIsSmallSize(false);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(false);
        setIsMobileMedium(true);
        setIsMobileSmall(false);
        console.log('Mobile Medium size');
      } else {
        setGridColumns('repeat(2, 1fr)');
        setIsLargeSize(false);
        setIsMediumSize(false);
        setIsSmallSize(false);
        setIsExtraSmallSize(false);
        setIsExtraExtraSmallSize(false);
        setIsMobileLarge(false);
        setIsMobileMedium(false);
        setIsMobileSmall(true);
        console.log('Mobile Small size');
      }
    };

    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      {/* Desktop Navbar */}
      {!isMobile && (
        <Navbar>
          <SearchBar
            where={draftWhere}
            setWhere={setDraftWhere}
            dateRange={draftDateRange}
            setDateRange={setDraftDateRange}
            showCalendar={showCalendar}
            setShowCalendar={setShowCalendar}
            onSearch={handleSearch}
          />
        </Navbar>
      )}

      {/* Mobile Navbar */}
      {isMobile && (
        <MobileNavbar
          where={draftWhere}
          setWhere={setDraftWhere}
          dateRange={draftDateRange}
          setDateRange={setDraftDateRange}
          onSearch={handleSearch}
        />
      )}
      
      {/* Responsive Layout: Side-by-side on desktop, top-bottom on mobile */}
              <div className={`${!isMobile && !isExtraSmallSize && !isExtraExtraSmallSize ? 'h-[calc(100vh-5rem)] pt-17.5 pb-20' : isMobileLarge || isMobileMedium || isMobileSmall ? 'pt-0 pb-20' : 'pt-12 pb-20'}`}>
        {!isMobile && !isExtraSmallSize && !isExtraExtraSmallSize ? (
          /* Desktop Layout: Side-by-side */
          <div className="flex h-full">
                    {/* Left side - Listings */}
        <div className="w-[55%] overflow-y-auto px-8 pt-0 pb-0 h-[calc(100vh-8.5rem)] listings-container">
        <h2 className={`merriweather-medium text-black font-bold text-sm pl-2 ${
          isLargeSize ? 'mb-13' : isMediumSize ? 'mb-8' : isSmallSize ? 'mb-3' : isExtraSmallSize ? 'mb-2' : 'mb-4'
        }`}>
            {filteredListings.length} places within map area
          </h2>
              
              <div className="grid grid-cols-3 gap-6 listings-grid" style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                columnGap: isLargeSize ? '100px' : isMediumSize ? '40px' : isSmallSize ? '20px' : isExtraSmallSize ? '16px' : '0.25rem',
                rowGap: isLargeSize ? '150px' : isMediumSize ? '120px' : isSmallSize ? '60px' : isExtraSmallSize ? '48px' : '1rem',
                paddingLeft: isLargeSize ? '45px' : isMediumSize ? '25px' : isSmallSize ? '10px' : isExtraSmallSize ? '8px' : '0',
                paddingRight: isLargeSize ? '30px' : isMediumSize ? '20px' : isSmallSize ? '15px' : isExtraSmallSize ? '8px' : '0',
                paddingTop: isLargeSize ? '24px' : isMediumSize ? '20px' : isSmallSize ? '16px' : isExtraSmallSize ? '12px' : '0',
                paddingBottom: isLargeSize ? '96px' : isMediumSize ? '64px' : isSmallSize ? '48px' : isExtraSmallSize ? '32px' : '0',
              }}>
                {paginatedListings.map(listing => {
                  console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                  return (
                    <div style={{
                      transform: isLargeSize ? 'scale(1.4)' : isMediumSize ? 'scale(1.3)' : isSmallSize ? 'scale(1.1)' : isExtraSmallSize ? 'scale(1.3)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'transform 0.3s ease',
                      WebkitTransform: isLargeSize ? 'scale(1.4)' : isMediumSize ? 'scale(1.3)' : isSmallSize ? 'scale(1.1)' : isExtraSmallSize ? 'scale(1)' : 'scale(1)',
                      WebkitTransformOrigin: 'center',
                      WebkitTransition: 'transform 0.3s ease',
                      WebkitBoxSizing: 'border-box',
                      boxSizing: 'border-box'
                    }}
                    onClick={() => {
                      console.log('Card clicked - isLargeSize:', isLargeSize, 'isMediumSize:', isMediumSize, 'isSmallSize:', isSmallSize, 'isExtraSmallSize:', isExtraSmallSize);
                      console.log('Applied transform:', isLargeSize ? 'scale(1.4)' : isMediumSize ? 'scale(1.3)' : isSmallSize ? 'scale(1.1)' : isExtraSmallSize ? 'scale(1.3)' : 'scale(1)');
                    }}>
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
                        cardMargin=""
                        isOwnListing={user?.id === listing.user_id}
                      />
                    </div>
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
        <div className="w-[45%] h-[calc(100vh-8.5rem)] overflow-hidden flex-shrink-0 map-container" style={{ marginRight: '2.25rem' }}>
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
        ) : (
          /* Mobile/Extra Small Layout: Top-bottom */
          <>
            {/* Top half - Map */}
            {!isExtraSmallSize && !isExtraExtraSmallSize && (
              <div className={`h-[50vh] w-full ${isMobileLarge || isMobileMedium || isMobileSmall ? 'px-0' : 'px-4'}`}>
                <LocationMapPreview 
                  key={mapRefreshKey}
                  searchLocation={where}
                  listings={listingsWithRatings}
                  className={`h-full w-full ${isMobileLarge || isMobileMedium || isMobileSmall ? 'rounded-none' : 'rounded-lg'}`}
                  dateRange={dateRange}
                  onBoundsChange={setVisibleBounds}
                />
              </div>
            )}

            {/* Places count underneath map for Extra Small */}
            {isExtraSmallSize && (
              <div className="px-4 mb-10 pt-6 pb-7 pl-10">
                <h2 className="merriweather-medium text-black font-bold text-sm">
                  {filteredListings.length} places within map area
                </h2>
              </div>
            )}

            {/* Places count for Extra Extra Small */}
            {isExtraExtraSmallSize && (
              <div className="px-4 mb-2 pt-6 pb-7 pl-10">
                <h2 className="merriweather-medium text-black font-bold text-sm">
                  {filteredListings.length} places within map area
                </h2>
              </div>
            )}

            {/* Places count above map for Mobile Large */}
            {isMobileLarge && (
              <div className="px-4 mb-2">
                <h2 className="merriweather-medium text-black font-bold text-sm pt-4">
                  {filteredListings.length} places within map area
                </h2>
              </div>
            )}

            {/* Places count above map for Mobile Medium */}
            {isMobileMedium && (
              <div className="px-4 mb-2">
                <h2 className="merriweather-medium text-black font-bold text-sm pt-4">
                  {filteredListings.length} places within map area
                </h2>
              </div>
            )}

            {/* Places count above map for Mobile Small */}
            {isMobileSmall && (
              <div className="px-4 mb-0 text-center">
                <h2 className="merriweather-medium text-black font-bold text-sm pt-4 pb-3">
                  {filteredListings.length} places within map area
                </h2>
              </div>
            )}

            {/* Bottom half - Listings */}
            <div className={`${isMobileLarge ? 'px-2' : 'px-4'} ${isExtraExtraSmallSize ? '-mt-2' : isExtraSmallSize ? '-mt-2' : 'mt-4'}`}>
              {/* Three listing cards per row for extra small */}
              {isExtraSmallSize && (
                <div className="grid grid-cols-3 gap-4 w-full justify-items-center" style={{ gridAutoRows: 'minmax(300px, auto)' }}>
                  {paginatedListings.map(listing => {
                    console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                    return (
                      <div key={listing.id} style={{
                        transform: 'scale(1.2)',
                        transformOrigin: 'center',
                        transition: 'transform 0.3s ease',
                        WebkitTransform: 'scale(1.2)',
                        WebkitTransformOrigin: 'center',
                        WebkitTransition: 'transform 0.3s ease',
                        WebkitBoxSizing: 'border-box',
                        boxSizing: 'border-box',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingBottom: '75px'
                      }}>
                        <ListingCard
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
                          cardMargin=""
                          isOwnListing={user?.id === listing.user_id}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Three listing cards per row for extra extra small */}
              {isExtraExtraSmallSize && (
                <div className="grid grid-cols-3 gap-4 w-full justify-items-center" style={{ gridAutoRows: 'minmax(280px, auto)' }}>
                  {paginatedListings.map(listing => {
                    console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                    return (
                      <div key={listing.id} style={{
                        transform: 'scale(1.0)',
                        transformOrigin: 'center',
                        transition: 'transform 0.3s ease',
                        WebkitTransform: 'scale(1.0)',
                        WebkitTransformOrigin: 'center',
                        WebkitTransition: 'transform 0.3s ease',
                        WebkitBoxSizing: 'border-box',
                        boxSizing: 'border-box',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingBottom: '15px'
                      }}>
                        <ListingCard
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
                          cardHeight="h-[280px]"
                          cardMargin=""
                          isOwnListing={user?.id === listing.user_id}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Three listing cards per row for Mobile Large */}
              {isMobileLarge && (
                <div className="grid grid-cols-3 gap-4 w-full justify-items-center">
                  {paginatedListings.map(listing => {
                    console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                    return (
                      <div key={listing.id}>
                        <ListingCard
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
                          cardHeight="h-[320px]"
                          cardMargin=""
                          isOwnListing={user?.id === listing.user_id}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Two listing cards per row for Mobile Medium */}
              {isMobileMedium && (
                <div className="grid grid-cols-2 gap-y-30 gap-x-4 w-full justify-items-center pt-10">
                  {paginatedListings.map(listing => {
                    console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                    return (
                      <div key={listing.id} style={{
                        transform: 'scale(1.3)',
                        transformOrigin: 'center',
                        transition: 'transform 0.3s ease',
                        WebkitTransform: 'scale(1.3)',
                        WebkitTransformOrigin: 'center',
                        WebkitTransition: 'transform 0.3s ease',
                        WebkitBoxSizing: 'border-box',
                        boxSizing: 'border-box'
                      }}>
                        <ListingCard
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
                          cardMargin=""
                          isOwnListing={user?.id === listing.user_id}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* One listing card per row for Mobile Small */}
              {isMobileSmall && (
                <div className="grid grid-cols-1 w-full justify-items-center" style={{ gridAutoRows: 'minmax(300px, auto)', gap: '30px' }}>
                  {paginatedListings.map(listing => {
                    console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                    return (
                      <div key={listing.id} style={{
                        width: '95%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ListingCard
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
                          cardHeight="h-[325px]"
                          cardWidth="w-[90vw]"
                          cardMargin=""
                          textSize="text-lg"
                          isOwnListing={user?.id === listing.user_id}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

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
          </>
        )}
      </div>

      {/* Mobile Footer - Only show on mobile and when user is logged in */}
      {user && isMobile && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-around z-50 shadow-lg">
          <Link 
            href="/my-listings" 
            className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs">Listings</span>
          </Link>
          
          <Link 
            href="/messages" 
            className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">Messages</span>
          </Link>
          
          <Link 
            href="/wishlist" 
            className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">Wishlist</span>
          </Link>
          
          <Link 
            href="/profile" 
            className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
} 