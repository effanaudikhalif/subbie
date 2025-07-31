"use client";
import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { Loader } from '@googlemaps/js-api-loader';
import Link from 'next/link';
import Logo from './Logo';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';

interface MobileNavbarProps {
  where: string;
  setWhere: (v: string) => void;
  dateRange: any[];
  setDateRange: (v: any[]) => void;
  onSearch: () => void;
  isMessagesPage?: boolean;
  isMyListingsPage?: boolean;
  isWishlistPage?: boolean;
  isListingDetailsPage?: boolean;
  isAddListingPage?: boolean;
  isEditListingPage?: boolean;
  isProfilePage?: boolean;
  isHomePage?: boolean;
  listingId?: string;
  isOwner?: boolean;
  isMessagesChatView?: boolean;
}

export default function MobileNavbar({ where, setWhere, dateRange, setDateRange, onSearch, isMessagesPage = false, isMyListingsPage = false, isWishlistPage = false, isListingDetailsPage = false, isAddListingPage = false, isEditListingPage = false, isProfilePage = false, isHomePage = false, listingId, isOwner, isMessagesChatView = false }: MobileNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Initialize Google Maps autocomplete
  useEffect(() => {
    const initAutocomplete = async () => {
      if (!inputRef.current || !isExpanded) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();
        
        // Add Safari-specific check
        if (!inputRef.current || !(inputRef.current instanceof HTMLInputElement)) {
          console.log('Input element not available for autocomplete');
          return;
        }
        
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          componentRestrictions: { country: ['us', 'ca'] },
          fields: ['address_components', 'formatted_address', 'name', 'place_id'],
          strictBounds: false
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (place.formatted_address) {
            if (inputRef.current) {
              inputRef.current.value = '';
            }
            setWhere(place.formatted_address);
          }
        });

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load location autocomplete');
      } finally {
        setIsLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && isExpanded) {
      // Add a longer delay for Safari to ensure the input is rendered
      setTimeout(() => {
        initAutocomplete();
      }, 300);
    } else if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
    }
  }, [setWhere, isExpanded]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Close expanded form when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const formElement = document.querySelector('.mobile-search-form');
      
      // Don't close if clicking on autocomplete dropdown or calendar
      const isAutocompleteDropdown = target.closest('.pac-container');
      const isCalendar = target.closest('.mobile-search-form') && target.closest('[data-day]');
      const isCalendarContainer = calendarRef.current && calendarRef.current.contains(target);
      
      if (isExpanded && formElement && !formElement.contains(target) && !isAutocompleteDropdown && !isCalendar && !isCalendarContainer) {
        handleCollapse();
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const checkIn = dateRange[0].startDate
    ? dateRange[0].startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Add dates';
  const checkOut = dateRange[0].endDate
    ? dateRange[0].endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Add dates';

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setShowCalendar(false);
  };

  const handleSearchClick = () => {
    onSearch();
    handleCollapse();
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-sm" style={{ height: '80px' }}>
      {/* Logo and Search Bar Row */}
      <div className="px-4 py-1 flex items-center gap-0 h-full">
        {/* Logo - Hide for listings page (when no specific page is active) */}
        {isHomePage || isAddListingPage || isEditListingPage || isListingDetailsPage || isMessagesPage || isMyListingsPage || isWishlistPage || isProfilePage ? (
          <div className="flex-shrink-0" style={{ marginLeft: '-10px' }}>
            <Logo className="hover:opacity-80 transition-opacity" />
          </div>
        ) : null}
        
        {/* Expandable Search Cylinder or Inbox Title */}
        <div className={`flex justify-center ${isHomePage || isAddListingPage || isEditListingPage || isListingDetailsPage || isMessagesPage || isMyListingsPage || isWishlistPage || isProfilePage ? 'flex-1' : 'w-full'}`}>
          {isHomePage ? (
            /* Home Page - Show Login/Signup or nothing if logged in */
            <div className="flex-1 flex justify-end items-center gap-3 pr-4">
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-600 hover:text-gray-800 font-medium rounded-full border border-gray-600 transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                /* Show nothing when logged in on home page */
                <div></div>
              )}
            </div>
          ) : isAddListingPage || isEditListingPage ? (
            /* Add/Edit Listing Page - Show X Button */
            <div className="flex-1 flex justify-end pr-4">
              <button
                onClick={() => router.push('/my-listings')}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
                title="Exit to My Listings"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : isListingDetailsPage ? (
            /* Listing Details Page - Show Search Bar */
            !isExpanded ? (
              /* Collapsed State - Cylinder */
              <div 
                className="w-full bg-gray-100 rounded-full pl-6 pr-2 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-all duration-300"
                onClick={handleExpand}
              >
                <span className="text-gray-500 text-base">Search</span>
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <FaSearch className="text-white text-sm" />
                </div>
              </div>
            ) : (
              /* Expanded State - Full Search Form */
              <div className="mobile-search-form border border-gray-200 rounded-2xl p-4 shadow-lg transition-all duration-300 absolute top-0 left-0 w-full z-50" style={{ backgroundColor: '#ffffff' }}>
                {/* Location Input with Google Autocomplete */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Where</label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={where}
                      onChange={e => setWhere(e.target.value)}
                      onFocus={() => setShowCalendar(false)}
                      placeholder="Search destination"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-gray-900"
                      disabled={isLoading}
                    />
                    {isLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                      </div>
                    )}
                  </div>
                  {error && (
                    <div className="text-red-500 text-xs mt-1">{error}</div>
                  )}
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-3 mb-4 relative">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check in</label>
                    <div
                      className="px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      <span className={checkIn === 'Add dates' ? 'text-gray-500' : 'text-gray-900'}>
                        {checkIn}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check out</label>
                    <div
                      className="px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      <span className={checkOut === 'Add dates' ? 'text-gray-500' : 'text-gray-900'}>
                        {checkOut}
                      </span>
                    </div>
                  </div>

                  {/* Calendar Dropdown */}
                  {showCalendar && (
                    <div ref={calendarRef} className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 z-50">
                      <CompactCalendar
                        value={{
                          startDate: dateRange[0]?.startDate ? new Date(dateRange[0].startDate) : null,
                          endDate: dateRange[0]?.endDate ? new Date(dateRange[0].endDate) : null
                        }}
                        onChange={({ startDate, endDate }) => {
                          if (startDate && endDate) {
                            const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                            const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                            setDateRange([{ startDate: localStartDate, endDate: localEndDate, key: 'selection' }]);
                            // Close calendar when both dates are selected
                            setShowCalendar(false);
                          } else {
                            setDateRange([{ startDate, endDate, key: 'selection' }]);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Search Button */}
                <button 
                  onClick={handleSearchClick}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  <span>Search</span>
                </button>
              </div>
            )
          ) : isMessagesPage ? (
            /* Messages Page - Show Listing Info or Messages */
            listingId ? (
              <div className="flex-1 flex justify-end pr-6">
                <div 
                  className="bg-gray-100 rounded-full pl-6 pr-6 py-2 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                  style={{ marginRight: '-10px' }}
                  onClick={() => {
                    router.push(`/listings/${listingId}`);
                  }}
                >
                  <span className="text-gray-700 text-base font-medium">
                    Listing
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full"></div>
            )
          ) : isWishlistPage ? (
            /* Wishlist Page - Show nothing (no search bar) */
            <div className="w-full"></div>
          ) : isProfilePage ? (
            /* Profile Page - Show nothing (no search bar) */
            <div className="w-full"></div>
          ) : isMyListingsPage ? (
            /* My Listings Page - Show nothing (no search bar) */
            <div className="w-full"></div>
          ) : !isExpanded ? (
            /* Collapsed State - Cylinder */
            <div 
              className="w-full bg-gray-100 rounded-full pl-6 pr-2 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-all duration-300"
              onClick={handleExpand}
            >
              <span className="text-gray-500 text-base">Search</span>
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                <FaSearch className="text-white text-sm" />
              </div>
            </div>
          ) : (
          /* Expanded State - Full Search Form */
          <div className="mobile-search-form border border-gray-200 rounded-2xl p-4 shadow-lg transition-all duration-300 absolute top-0 left-0 w-full z-50" style={{ backgroundColor: '#ffffff' }}>
            {/* Location Input with Google Autocomplete */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Where</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={where}
                  onChange={e => setWhere(e.target.value)}
                  onFocus={() => setShowCalendar(false)}
                  placeholder="Search destination"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-gray-900"
                  disabled={isLoading}
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                  </div>
                )}
              </div>
              {error && (
                <div className="text-red-500 text-xs mt-1">{error}</div>
              )}
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-3 mb-4 relative">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check in</label>
                <div
                  className="px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <span className={checkIn === 'Add dates' ? 'text-gray-500' : 'text-gray-900'}>
                    {checkIn}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check out</label>
                <div
                  className="px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <span className={checkOut === 'Add dates' ? 'text-gray-500' : 'text-gray-900'}>
                    {checkOut}
                  </span>
                </div>
              </div>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div ref={calendarRef} className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 z-50">
                  <CompactCalendar
                    value={{
                      startDate: dateRange[0]?.startDate ? new Date(dateRange[0].startDate) : null,
                      endDate: dateRange[0]?.endDate ? new Date(dateRange[0].endDate) : null
                    }}
                    onChange={({ startDate, endDate }) => {
                      if (startDate && endDate) {
                        const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                        const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                        setDateRange([{ startDate: localStartDate, endDate: localEndDate, key: 'selection' }]);
                        // Close calendar when both dates are selected
                        setShowCalendar(false);
                      } else {
                        setDateRange([{ startDate, endDate, key: 'selection' }]);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Search Button */}
            <button 
              onClick={handleSearchClick}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <span>Search</span>
            </button>
          </div>
        )}
        </div>
      </div>
      
      {/* Mobile dropdown menu - removed for home page when logged in */}
    </header>
  );
}

// CompactCalendar component (same as in Searchbar.tsx)
function CompactCalendar({ value, onChange }: {
  value: { startDate: Date | null, endDate: Date | null },
  onChange: (range: { startDate: Date | null, endDate: Date | null }) => void
}) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  
  const initialDate = value.startDate || today;
  const [month, setMonth] = React.useState(initialDate.getMonth());
  const [year, setYear] = React.useState(initialDate.getFullYear());

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayWeekday = firstDayOfMonth.getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayWeekday; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isAvailable = date >= today;
    let isSelected = false;
    let isStartDate = false;
    let isEndDate = false;

    if (value.startDate && date.getTime() === value.startDate.getTime()) {
      isStartDate = true;
    }
    if (value.endDate && date.getTime() === value.endDate.getTime()) {
      isEndDate = true;
    }

    if (value.startDate && value.endDate) {
      isSelected = date >= value.startDate && date <= value.endDate;
    }
    if (value.startDate && !value.endDate && hoverDate && date > value.startDate && date <= hoverDate) {
      isSelected = true;
    }
    calendarDays.push({
      day,
      isAvailable,
      isSelected,
      isStartDate,
      isEndDate,
      date
    });
  }

  function handleDateClick(dayData: any) {
    if (!dayData.isAvailable) return;
    
    if (!value.startDate) {
      onChange({ startDate: dayData.date, endDate: null });
    }
    else if (value.startDate && !value.endDate) {
      if (dayData.date >= value.startDate) {
        onChange({ startDate: value.startDate, endDate: dayData.date });
      } else {
        onChange({ startDate: dayData.date, endDate: null });
      }
    }
    else {
      onChange({ startDate: dayData.date, endDate: null });
    }
  }

  function handleMouseEnter(dayData: any) {
    if (!dayData.isAvailable) return;
    
    if (value.startDate && !value.endDate && dayData.date > value.startDate) {
      setHoverDate(dayData.date);
    }
  }

  function handleMouseLeave() {
    setHoverDate(null);
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 select-none w-72" onMouseLeave={handleMouseLeave}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-gray-400 hover:text-black px-2 py-1 text-sm" disabled={month === today.getMonth() && year === today.getFullYear()}>&lt;</button>
        <div className="text-center text-sm font-medium text-gray-900">{new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <button onClick={nextMonth} className="text-gray-400 hover:text-black px-2 py-1 text-sm">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-gray-500 py-1 text-sm">{day}</div>
        ))}
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className="text-center py-1"
            data-day={dayData?.day}
            onClick={dayData && dayData.isAvailable ? () => handleDateClick(dayData) : undefined}
            onMouseEnter={dayData && dayData.isAvailable ? () => handleMouseEnter(dayData) : undefined}
            style={{ cursor: dayData && dayData.isAvailable ? 'pointer' : 'default' }}
          >
            {dayData ? (
              <div className={
                `w-7 h-7 rounded-full flex items-center justify-center mx-auto text-sm
                ${dayData.isStartDate
                  ? 'text-white font-semibold'
                  : dayData.isEndDate
                    ? 'text-white font-semibold'
                    : dayData.isSelected
                      ? 'text-[#368a98] border border-[#368a98]'
                      : dayData.isAvailable
                        ? 'hover:bg-gray-100 text-gray-800 border border-transparent'
                        : 'text-gray-400'}
                ${dayData.isStartDate || dayData.isEndDate ? 'bg-[#368a98] border-[#368a98]' : dayData.isSelected ? 'bg-[#368a98]/20' : ''}`
              }>
                {dayData.day}
              </div>
            ) : (
              <div className="w-7 h-7"></div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-600 text-center">
        <span className="inline-block w-3 h-3 bg-[#368a98] border border-[#368a98] rounded-full ml-3 mr-1"></span>
        Selected
      </div>
    </div>
  );
} 