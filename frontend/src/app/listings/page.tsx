"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildApiUrl } from '../../utils/api';
import { useRouter } from "next/navigation";
import Navbar from '../../components/Navbar';
import MobileNavbar from '../../components/MobileNavbar';
import SearchBar from '../../components/Searchbar';
import LocationMapPreview from '../../components/LocationMapPreview';
import DraggableMapContainer from '../../components/DraggableMapContainer';
import ListingCard from '../../components/ListingCard';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import MobileFooter from '../../components/MobileFooter';
import LoadingPage from '../../components/LoadingPage';

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Draft state for search bar (user input)
  const [draftWhere, setDraftWhere] = useState(searchParams?.get('where') || '');
  const [draftDateRange, setDraftDateRange] = useState<any[]>([
    {
      startDate: searchParams?.get('checkin') ? (() => {
        const dateStr = searchParams.get('checkin')!;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
      })() : null,
      endDate: searchParams?.get('checkout') ? (() => {
        const dateStr = searchParams.get('checkout')!;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
      })() : null,
      key: 'selection',
    },
  ]);
  const [draftGuests, setDraftGuests] = useState(searchParams?.get('guests') || '');
  const [showCalendar, setShowCalendar] = useState(false);

  // Applied state for filtering and display
  const [where, setWhere] = useState(searchParams?.get('where') || '');
  const [dateRange, setDateRange] = useState<any[]>([
    {
      startDate: searchParams?.get('checkin') ? (() => {
        const dateStr = searchParams.get('checkin')!;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
      })() : null,
      endDate: searchParams?.get('checkout') ? (() => {
        const dateStr = searchParams.get('checkout')!;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
      })() : null,
      key: 'selection',
    },
  ]);
  const [guests, setGuests] = useState(searchParams?.get('guests') || '');
  const [listings, setListings] = useState<any[]>([]);
  const [averageRatings, setAverageRatings] = useState<Record<string, { average_rating: number; total_reviews: number }>>({});
  const [loading, setLoading] = useState(true);
  // State for map bounds
  const [visibleBounds, setVisibleBounds] = useState<{ sw: { lat: number, lng: number }, ne: { lat: number, lng: number } } | null>(null);
  // Add a key to force map refresh
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [gridColumns, setGridColumns] = useState('repeat(3, 1fr)');
  const [mobileGridColumns, setMobileGridColumns] = useState('repeat(4, 1fr)');
  const [isMobileLarge, setIsMobileLarge] = useState(false);
  const [mapHeight, setMapHeight] = useState(300); // Default map height for mobile

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
      const mobile = width <= 1024;
      console.log('Screen width:', width, 'isMobile:', mobile);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(buildApiUrl('/api/listings'))
      .then(res => res.json())
      .then(data => {
        setListings(Array.isArray(data) ? data : []);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    console.log('Fetching average ratings...');
    fetch(buildApiUrl('/api/listings/average-ratings'))
      .then(res => {
        console.log('Average ratings response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Average ratings data:', data);
        setAverageRatings(data);
      })
      .catch((error) => {
        console.error('Error fetching average ratings:', error);
        setAverageRatings({});
      });
  }, []);

  // Update draft state when search params change (e.g. on page load or navigation)
  useEffect(() => {
    setDraftWhere(searchParams?.get('where') || '');
    setDraftDateRange([
      {
        startDate: searchParams?.get('checkin') ? (() => {
          const dateStr = searchParams.get('checkin')!;
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day); // month is 0-indexed
        })() : null,
        endDate: searchParams?.get('checkout') ? (() => {
          const dateStr = searchParams.get('checkout')!;
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day); // month is 0-indexed
        })() : null,
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

  // Handle responsive grid columns for desktop
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      console.log('Screen width:', width);
      
      // Desktop grid adjustments (only for non-mobile)
      if (!isMobile) {
        if (width >= 1600) {
          setGridColumns('repeat(4, 1fr)');
        } else if (width >= 1200) {
          setGridColumns('repeat(3, 1fr)');
        } else if (width >= 800) {
          setGridColumns('repeat(2, 1fr)');
        } else {
          setGridColumns('repeat(1, 1fr)');
        }
      }
      
      // Mobile size detection (1024px and below)
      if (width <= 1024) {
        setIsMobileLarge(true);
        // Mobile grid adjustments
        if (width >= 900) {
          setMobileGridColumns('repeat(4, 1fr)');
        } else if (width >= 700) {
          setMobileGridColumns('repeat(3, 1fr)');
        } else if (width >= 500) {
          setMobileGridColumns('repeat(2, 1fr)');
        } else {
          setMobileGridColumns('repeat(1, 1fr)');
        }
      } else {
        setIsMobileLarge(false);
      }
    };

    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const listingsWithRatings = filteredListings.map(listing => ({
    ...listing,
    averageRating: averageRatings[listing.id]?.average_rating,
    totalReviews: averageRatings[listing.id]?.total_reviews
  }));

  console.log('Average ratings state:', averageRatings);
  console.log('Listings with ratings:', listingsWithRatings.map(l => ({
    id: l.id,
    averageRating: l.averageRating,
    totalReviews: l.totalReviews
  })));

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

  // Show loading state while fetching listings
  if (loading) {
    return <LoadingPage />;
  }

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
      <div className={`${!isMobile ? 'h-[calc(100vh-5rem)] pt-17.5 pb-20' : isMobileLarge ? 'pt-0 pb-20' : 'pt-12 pb-20'}`}>
        {!isMobile ? (
          /* Desktop Layout: Side-by-side */
          <div className="flex h-full">
            {/* Left side - Listings */}
            <div className="w-[55%] overflow-y-auto px-8 pt-0 pb-0 h-[calc(100vh-8.5rem)] listings-container">
              <h2 className="merriweather-medium text-black font-bold text-sm pl-2 mb-4">
                {filteredListings.length} places within map area
              </h2>
              
              <div className="grid gap-6 listings-grid" style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                columnGap: '5px',
                rowGap: '20px',
                paddingLeft: '3px',
                paddingRight: '16px',
                paddingTop: '16px',
                paddingBottom: '64px',
              }}>
                {paginatedListings.map(listing => {
                  console.log(`Listing ${listing.id} amenities:`, listing.amenities);
                  return (
                    <div key={listing.id} onClick={(e) => {
                      console.log('Parent div clicked for listing:', listing.id);
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
          /* Mobile Layout: Top-bottom */
          <>
            {/* Top half - Map */}
            {!isMobileLarge && (
              <div className={`w-full px-4`} style={{ height: '50vh' }}>
                <DraggableMapContainer 
                  key={mapRefreshKey}
                  searchLocation={where}
                  listings={listingsWithRatings}
                  className="h-full w-full rounded-lg"
                  dateRange={dateRange}
                  onBoundsChange={setVisibleBounds}
                  isMobileSmall={false}
                  isMobileMedium={false}
                  isMobileLarge={isMobileLarge}
                  onMapHeightChange={setMapHeight}
                />
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

            {/* Mobile Large Layout with fixed spacing */}
            {isMobileLarge && (
              <div className="flex flex-col h-full" style={{ marginTop: '-16px' }}>
                {/* Map container with draggable height */}
                <div style={{ height: `${mapHeight}px`, marginTop: '-16px' }}>
                  <DraggableMapContainer 
                    key={mapRefreshKey}
                    searchLocation={where}
                    listings={listingsWithRatings}
                    className="h-full w-full rounded-none"
                    dateRange={dateRange}
                    onBoundsChange={setVisibleBounds}
                    isMobileSmall={false}
                    isMobileMedium={false}
                    isMobileLarge={isMobileLarge}
                    onMapHeightChange={setMapHeight}
                  />
                </div>
                
                {/* Fixed spacing and text */}
                <div className="px-4 py-3 pb-6">
                  <h2 className="merriweather-medium text-black font-bold text-sm text-center">
                    {filteredListings.length} places within map area
                  </h2>
                </div>
                
                {/* Listings container with fixed spacing */}
                <div className="px-4 flex-1">
                  <div className="grid gap-6 listings-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: mobileGridColumns,
                    columnGap: '5px',
                    rowGap: '20px',
                    paddingLeft: '11px',
                    paddingRight: '11px',
                    paddingTop: '16px',
                    paddingBottom: '64px',
                    justifyItems: 'center',
                  }}>
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
                            cardHeight="h-[300px]"
                            cardMargin=""
                            isOwnListing={user?.id === listing.user_id}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom half - Listings for other mobile sizes */}
            {!isMobileLarge && (
              <div className="px-4 mt-4">
                {/* Standard mobile layout */}
                <div className="grid gap-6 listings-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(1, 1fr)',
                  columnGap: '5px',
                  rowGap: '20px',
                  paddingLeft: '3px',
                  paddingRight: '16px',
                  paddingTop: '16px',
                  paddingBottom: '64px',
                  justifyItems: 'center',
                }}>
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
            )}
          </>
        )}
      </div>

      {/* Mobile Footer - Only show on mobile and when user is logged in */}
      {user && isMobile && <MobileFooter />}
    </div>
  );
}

export default function Results() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
} 