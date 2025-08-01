"use client";
import React, { useEffect, useState } from "react";
import type { User } from '../../../types/User';
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl, buildImageUrl, buildAvatarUrl } from '../../../utils/api';
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import MobileNavbar from "../../../components/MobileNavbar";
import SearchBar from "../../../components/Searchbar";
import PrivacyMap from "../../../components/PrivacyMap";
import BookingForm from "../../../components/BookingForm";
import ReviewsSection from "../../../components/ReviewsSection";
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useAuth } from "../../../hooks/useAuth";
import GoogleMapsAutocomplete from '../../../components/GoogleMapsAutocomplete';
import { getCommuteTimes, CommuteTimes } from '../../../utils/getCommuteTimes';
import ListingCard from '../../../components/ListingCard';
import MobileFooter from '../../../components/MobileFooter';
import LoadingPage from '../../../components/LoadingPage';

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
  neighborhood?: string;
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
  start_date?: string;
  end_date?: string;
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
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { user } = useAuth();

  // SearchBar state
  const [where, setWhere] = useState("");
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState("");
  const handleSearch = () => {
    const checkin = dateRange[0].startDate ? new Date(dateRange[0].startDate).toISOString().slice(0,10) : '';
    const checkout = dateRange[0].endDate ? new Date(dateRange[0].endDate).toISOString().slice(0,10) : '';
    router.push(
      `/listings?where=${encodeURIComponent(where)}&checkin=${checkin}&checkout=${checkout}`
    );
  };

  const handleMessageHost = async () => {
    if (!user || !host) return;
    
    try {
      // Create or find conversation
      const response = await fetch(buildApiUrl('/api/conversations/find-or-create'), {
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

  function formatPropertyText(text: string) {
    return text
      .split('_')
      .join(' ')
      .charAt(0).toUpperCase() + text.split('_').join(' ').slice(1).toLowerCase();
  }

  function formatDateString(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // State for selected range
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

  // Compact Calendar Component
  function CompactCalendar({ startDate, endDate, selectedRange, setSelectedRange }: {
    startDate: string,
    endDate: string,
    selectedRange: { start: Date | null, end: Date | null },
    setSelectedRange: (range: { start: Date | null, end: Date | null }) => void
  }) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const rawStart = new Date(startDate);
    const start = rawStart < today ? today : rawStart;
    const end = new Date(endDate);
    const currentDate = new Date();
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    // Generate all months between start and end
    function getMonthsInRange(start: Date, end: Date) {
      const months = [];
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (current <= last) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    }
    const months = getMonthsInRange(start, end);
    const [currentMonthIdx, setCurrentMonthIdx] = useState(0);
    const monthDate = months[currentMonthIdx];

    // Render the current month only
    if (!monthDate) return null;
    const month = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const firstDayWeekday = firstDayOfMonth.getDay();
    const calendarDays = [];
    for (let i = 0; i < firstDayWeekday; i++) {
      calendarDays.push(null); // Empty cells for days before the month starts
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const isAvailable = date >= start && date <= end && date >= today;
      const isToday = date.toDateString() === currentDate.toDateString();
      let isSelected = false;
      let isStartDate = false;
      let isEndDate = false;
      // Always mark isStartDate if the date matches selectedRange.start
      if (selectedRange.start && date.getTime() === selectedRange.start.getTime()) {
        isStartDate = true;
      }
      // Always mark isEndDate if the date matches selectedRange.end
      if (selectedRange.end && date.getTime() === selectedRange.end.getTime()) {
        isEndDate = true;
      }
      // Range selection logic
      if (selectedRange.start && selectedRange.end) {
        isSelected = date >= selectedRange.start && date <= selectedRange.end;
      }
      // Show hover range when we have a start date but no end date yet
      if (selectedRange.start && !selectedRange.end && hoverDate && date > selectedRange.start && date <= hoverDate) {
        isSelected = true;
      }
      calendarDays.push({
        day,
        isAvailable,
        isToday,
        isSelected,
        isStartDate,
        isEndDate,
        date,
        month: monthDate.getMonth(),
        year: monthDate.getFullYear(),
      });
    }

    // CLICK/HOVER HANDLERS
    function handleDateClick(dayData: any) {
      if (!dayData.isAvailable) return;
      // If no start date is selected, set it as check-in
      if (!selectedRange.start) {
        setSelectedRange({ start: dayData.date, end: null });
      }
      // If start date is selected but no end date, set end date (check-out)
      else if (selectedRange.start && !selectedRange.end) {
        if (dayData.date > selectedRange.start) {
          setSelectedRange({ start: selectedRange.start, end: dayData.date });
        } else {
          // If selected date is before start date, make it the new start date
          setSelectedRange({ start: dayData.date, end: null });
        }
      }
      // If both dates are selected, start a new selection
      else {
        setSelectedRange({ start: dayData.date, end: null });
      }
    }
    function handleMouseEnter(dayData: any) {
      if (!dayData.isAvailable) return;
      // If we have a start date but no end date, show hover preview for future dates
      if (selectedRange.start && !selectedRange.end && dayData.date > selectedRange.start) {
        setHoverDate(dayData.date);
      }
    }
    function handleMouseLeave() {
      setHoverDate(null);
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 select-none" onMouseLeave={handleMouseLeave}>
        <div className="flex items-center justify-between mb-2">
          <button
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setCurrentMonthIdx(idx => Math.max(0, idx - 1))}
            disabled={currentMonthIdx === 0}
            aria-label="Previous month"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center text-sm font-medium text-gray-900">{month}</div>
          <button
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setCurrentMonthIdx(idx => Math.min(months.length - 1, idx + 1))}
            disabled={currentMonthIdx === months.length - 1}
            aria-label="Next month"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-gray-500 py-1">{day}</div>
          ))}
          {calendarDays.map((dayData, index) => (
            <div
              key={index}
              className="text-center py-1"
              data-day={dayData?.day}
              data-month={dayData?.month}
              data-year={dayData?.year}
              onClick={dayData && dayData.isAvailable ? () => handleDateClick(dayData) : undefined}
              onMouseEnter={dayData && dayData.isAvailable ? () => handleMouseEnter(dayData) : undefined}
              style={{ cursor: dayData && dayData.isAvailable ? 'pointer' : 'default' }}
            >
              {dayData ? (
                <div className={
                  `w-6 h-6 rounded-full flex items-center justify-center mx-auto
                  ${dayData.isStartDate
                    ? 'text-white font-semibold'
                    : dayData.isEndDate
                      ? 'text-white font-semibold'
                      : dayData.isSelected
                        ? 'text-[#368a98] border border-[#368a98]'
                        : dayData.isAvailable
                          ? 'hover:bg-gray-100 text-gray-800 border border-transparent'
                          : 'text-gray-400'}
                  ${dayData.isStartDate || dayData.isEndDate ? 'bg-[#368a98] border-[#368a98]' : dayData.isSelected ? 'bg-[#368a98]/20' : ''} ${dayData.isToday && !dayData.isSelected ? 'ring-2 ring-[#368a98]' : ''}`
                }>
                  {dayData.day}
                </div>
              ) : (
                <div className="w-6 h-6"></div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-600 text-center">
          <span className="inline-block w-3 h-3 bg-[#368a98] border border-[#368a98] rounded-full ml-4 mr-1"></span>
          Selected
        </div>
      </div>
    );
  }

  // Function to get icon for amenity
  const getAmenityIcon = (amenityName: string) => {
    const name = amenityName.toLowerCase();
    console.log('Amenity name:', amenityName, 'Lowercase:', name); // Debug log
    
    // Living Essentials
    if (name.includes('wi-fi') || name.includes('wifi') || name.includes('wi fi')) {
      return <img src="/icons/icons8-wifi-30.png" alt="Wi-Fi" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('heating')) {
      return <img src="/icons/icons8-heater-30.png" alt="Heating" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('air conditioning')) {
      return <img src="/icons/icons8-air-conditioner-30.png" alt="Air Conditioning" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('kitchen')) {
      return <img src="/icons/icons8-kitchen-30.png" alt="Kitchen" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('cutlery')) {
      return <img src="/icons/icons8-cutlery-30.png" alt="Cutlery" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('washer')) {
      return <img src="/icons/icons8-washer-50.png" alt="Washer" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('dryer')) {
      return <img src="/icons/icons8-dryer-50.png" alt="Dryer" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('cleaning supplies')) {
      return <img src="/icons/icons8-cleaning-supplies-64.png" alt="Cleaning Supplies" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('safe locks')) {
      return <img src="/icons/icons8-safe-50.png" alt="Safe Locks" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    
    // College Essentials
    if (name.includes('dedicated workspace')) {
      return <img src="/icons/icons8-workspace-50.png" alt="Dedicated Workspace" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('printer')) {
      return <img src="/icons/icons8-printer-50.png" alt="Printer" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('outlets')) {
      return <img src="/icons/icons8-outlets-30.png" alt="Outlets" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('storage')) {
      return <img src="/icons/icons8-storage-50.png" alt="Storage" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('whiteboard')) {
      return <img src="/icons/icons8-whiteboard-50.png" alt="Whiteboard" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('bike storage')) {
      return <img src="/icons/icons8-bike-50.png" alt="Bike Storage" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('coffee maker')) {
      return <img src="/icons/icons8-coffee-maker-50.png" alt="Coffee Maker" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('monitor')) {
      return <img src="/icons/icons8-monitor-50.png" alt="Monitor" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    
    // Extra
    if (name.includes('tv')) {
      return <img src="/icons/icons8-tv-50.png" alt="TV" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('outdoor space')) {
      return <img src="/icons/icons8-outdoor-50.png" alt="Outdoor Space" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('parking')) {
      return <img src="/icons/icons8-parking-50.png" alt="Parking" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('gym')) {
      return <img src="/icons/icons8-gym-50.png" alt="Gym" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('games')) {
      return <img src="/icons/icons8-games-50.png" alt="Games" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('dishwasher')) {
      return <img src="/icons/icons8-dishwasher-50.png" alt="Dishwasher" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    if (name.includes('speaker')) {
      return <img src="/icons/icons8-speaker-30.png" alt="Speaker" className="w-5 h-5 mr-3 flex-shrink-0" />;
    }
    
    // Default icon for any unmatched amenities
    return (
      <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const mobile = width <= 1024;
      const smallScreen = width < 700;
      console.log('Screen width:', width, 'isMobile:', mobile, 'isSmallScreen:', smallScreen);
      setIsMobile(mobile);
      setIsSmallScreen(smallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Apply overscroll behavior to prevent bounce
    document.documentElement.style.overscrollBehavior = 'contain';
    document.body.style.overscrollBehavior = 'contain';
    
    // Ensure white background
    document.documentElement.style.backgroundColor = 'white';
    document.body.style.backgroundColor = 'white';
    
    // Add custom CSS for hiding scrollbars
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup function to reset
    return () => {
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl(`/api/listings/${id}`));
        const data = await res.json();
        setListing(data);

        // Fetch host user
        if (data.user_id) {
          const userRes = await fetch(buildApiUrl(`/api/users/${data.user_id}`));
          const user = await userRes.json();
          setHost(user);
          // Fetch university
          if (user.university_id) {
            const uniRes = await fetch(buildApiUrl(`/api/universities/${user.university_id}`));
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

  // Host reviews state
  const [hostReviewStats, setHostReviewStats] = useState<{ avg: number; count: number } | null>(null);

  // Fetch host reviews for Meet your host section
  useEffect(() => {
    async function fetchHostReviews() {
      if (!host?.id) return;
      try {
        const res = await fetch(buildApiUrl(`/api/host-reviews/user/${host.id}`));
        if (!res.ok) return;
        const reviews = await res.json();
        if (!Array.isArray(reviews) || reviews.length === 0) {
          setHostReviewStats({ avg: 0, count: 0 });
          return;
        }
        const avg = reviews.reduce((sum, r) => sum + ((r.cleanliness_rating + r.accuracy_rating + r.communication_rating + r.location_rating + r.value_rating) / 5), 0) / reviews.length;
        setHostReviewStats({ avg, count: reviews.length });
      } catch {}
    }
    fetchHostReviews();
  }, [host?.id]);

  // Commute time state
  const [commuteAddress, setCommuteAddress] = useState<string>("");
  const [commuteCoords, setCommuteCoords] = useState<{lat: number, lng: number} | null>(null);
  const [commuteTimes, setCommuteTimes] = useState<CommuteTimes | null>(null);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteError, setCommuteError] = useState<string | null>(null);

  // State for other listings
  const [otherListings, setOtherListings] = useState<any[]>([]);
  const [otherListingsLoading, setOtherListingsLoading] = useState(false);

  // State for listing ratings
  const [listingRatings, setListingRatings] = useState<{
    averageRating: number;
    totalReviews: number;
    categoryRatings: {
      cleanliness: number;
      accuracy: number;
      communication: number;
      location: number;
      value: number;
    };
  } | null>(null);





  // Handler for address selection from autocomplete
  const handleCommuteAddressSelect = (addressData: any) => {
    console.log('Commute address selected:', addressData);
    setCommuteAddress(
      [addressData.street, addressData.neighborhood, addressData.city, addressData.state, addressData.zip]
        .filter(Boolean).join(', ')
    );
    if (addressData.latitude && addressData.longitude) {
      console.log('Setting commute coords:', { lat: addressData.latitude, lng: addressData.longitude });
      setCommuteCoords({ lat: addressData.latitude, lng: addressData.longitude });
    } else {
      console.log('No coordinates available, setting commute coords to null');
      setCommuteCoords(null);
    }
  };

  // Fetch commute times when both coordinates are available
  useEffect(() => {
    const fetchCommute = async () => {
      console.log('fetchCommute called with:', {
        listingLat: listing?.latitude,
        listingLng: listing?.longitude,
        commuteCoords
      });
      
      if (!listing?.latitude || !listing?.longitude || !commuteCoords) {
        console.log('Missing required coordinates, returning early');
        return;
      }
      
      setCommuteLoading(true);
      setCommuteError(null);
      setCommuteTimes(null);
      
      try {
        console.log('Calling getCommuteTimes with:', {
          origin: commuteCoords,
          destination: { lat: Number(listing.latitude), lng: Number(listing.longitude) }
        });
        
        const times = await getCommuteTimes(
          commuteCoords,
          { lat: Number(listing.latitude), lng: Number(listing.longitude) }
        );
        console.log('Commute times received:', times);
        setCommuteTimes(times);
      } catch (e: any) {
        console.error('Error fetching commute times:', e);
        setCommuteError(e.message || 'Failed to fetch commute times');
      } finally {
        setCommuteLoading(false);
      }
    };
    
    if (commuteCoords && listing?.latitude && listing?.longitude) {
      console.log('All coordinates available, calling fetchCommute');
      fetchCommute();
    } else {
      console.log('Not all coordinates available:', {
        commuteCoords: !!commuteCoords,
        listingLat: !!listing?.latitude,
        listingLng: !!listing?.longitude
      });
    }
  }, [commuteCoords, listing?.latitude, listing?.longitude]);

  // Function to fetch and update listing ratings
  const fetchListingRatings = async () => {
    if (!listing?.id) return;
    try {
              const response = await fetch(buildApiUrl(`/api/host-reviews`));
      if (response.ok) {
        const allReviews = await response.json();
        // Filter reviews for this listing
        const listingReviews = allReviews.filter((review: any) => review.listing_id === listing.id);
        
        if (listingReviews.length > 0) {
          // Calculate average ratings
          const totals = listingReviews.reduce((acc: any, review: any) => ({
            cleanliness: acc.cleanliness + review.cleanliness_rating,
            accuracy: acc.accuracy + review.accuracy_rating,
            communication: acc.communication + review.communication_rating,
            location: acc.location + review.location_rating,
            value: acc.value + review.value_rating,
          }), { cleanliness: 0, accuracy: 0, communication: 0, location: 0, value: 0 });
          
          const count = listingReviews.length;
          const categoryRatings = {
            cleanliness: totals.cleanliness / count,
            accuracy: totals.accuracy / count,
            communication: totals.communication / count,
            location: totals.location / count,
            value: totals.value / count,
          };
          
          const averageRating = (totals.cleanliness + totals.accuracy + totals.communication + totals.location + totals.value) / (count * 5);
          
          setListingRatings({
            averageRating,
            totalReviews: count,
            categoryRatings
          });
        } else {
          setListingRatings({
            averageRating: 0,
            totalReviews: 0,
            categoryRatings: {
              cleanliness: 0,
              accuracy: 0,
              communication: 0,
              location: 0,
              value: 0,
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching listing ratings:', error);
    }
  };

  // Fetch listing ratings on component mount
  useEffect(() => {
    if (listing?.id) {
      fetchListingRatings();
    }
  }, [listing?.id]);

  // Fetch other listings (excluding current user's listings)
  useEffect(() => {
    const fetchOtherListings = async () => {
      if (!user?.id || !listing?.city) return;
      setOtherListingsLoading(true);
      try {
        const response = await fetch(buildApiUrl(`/api/listings?exclude_user_id=${user.id}&city=${encodeURIComponent(listing.city)}`));
        if (response.ok) {
          const data = await response.json();
          // Filter out the current listing
          const filteredListings = data.filter((l: any) => l.id !== listing?.id);
          
          // Fetch ratings for the other listings
          const ratingsResponse = await fetch(buildApiUrl('/api/listings/average-ratings'));
          if (ratingsResponse.ok) {
            const ratingsData = await ratingsResponse.json();
            
            // Add rating data to the listings
            const listingsWithRatings = filteredListings.map((listing: any) => ({
              ...listing,
              averageRating: ratingsData[listing.id]?.average_rating,
              totalReviews: ratingsData[listing.id]?.total_reviews
            }));
            
            setOtherListings(listingsWithRatings.slice(0, 3));
          } else {
            setOtherListings(filteredListings.slice(0, 3));
          }
        }
      } catch (error) {
        console.error('Error fetching other listings:', error);
      } finally {
        setOtherListingsLoading(false);
      }
    };
    
    if (user?.id && listing?.id && listing?.city) {
      fetchOtherListings();
    }
  }, [user?.id, listing?.id, listing?.city]);

  // Add state for photo modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Add state for swipe functionality
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Add state for calendar modal
  const [showCalendarInline, setShowCalendarInline] = useState(false);
  
  // Wishlist state
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Check if listing is in wishlist
  useEffect(() => {
    if (!user || !listing?.id) return;

    const checkWishlistStatus = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/wishlist/check/${user.id}/${listing.id}`));
        if (response.ok) {
          const data = await response.json();
          setIsInWishlist(data.inWishlist);
        }
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [user, listing?.id]);

  // Listen for wishlist changes from other components
  useEffect(() => {
    const handleWishlistChange = (event: CustomEvent) => {
      const { listingId, inWishlist } = event.detail;
      if (listingId === listing?.id) {
        setIsInWishlist(inWishlist);
      }
    };

    window.addEventListener('wishlistChanged', handleWishlistChange as EventListener);
    return () => {
      window.removeEventListener('wishlistChanged', handleWishlistChange as EventListener);
    };
  }, [listing?.id]);

  // Swipe handlers for photo modal
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentPhotoIndex < images.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      alert('Please log in to add items to your wishlist');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(buildApiUrl(`/api/wishlist/${user.id}/${listing?.id}`), {
          method: 'DELETE',
        });
        if (response.ok) {
          setIsInWishlist(false);
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: listing?.id, inWishlist: false }
          }));
        }
      } else {
        // Add to wishlist
        const response = await fetch(buildApiUrl(`/api/wishlist`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            listing_id: listing?.id,
          }),
        });
        if (response.ok) {
          setIsInWishlist(true);
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('wishlistChanged', {
            detail: { listingId: listing?.id, inWishlist: true }
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      alert('Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <Navbar fixed={false} />
        <div className="max-w-6xl mx-auto mt-16 text-center text-red-500">Listing not found.</div>
      </div>
    );
  }

  // Image grid logic
  let images = listing.images && listing.images.length > 0 ? listing.images : [
    { url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }
  ];
  
  console.log('Original images from listing:', listing.images);
  console.log('Processed images:', images);
  
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
                url: img.url.startsWith('/uploads/') ? buildImageUrl(img.url) : img.url
  }));

  // Ensure we have at least 5 images for the grid layout
  const placeholderImages = [
    "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-5c9c0b0b0b0b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-6c9c0b0b0b0b?auto=format&fit=crop&w=800&q=80"
  ];

  // Fill up to 5 images with placeholders if needed
  while (images.length < 5) {
    images.push({ url: placeholderImages[images.length] });
  }

  console.log('Final images array:', images);

        return (
          <div className="min-h-screen bg-white pt-16" style={{ overscrollBehavior: 'contain', backgroundColor: 'white' }}>
            <div className="fixed inset-0 bg-white -z-10"></div>
            {!isMobile ? (
              <Navbar fixed={false} />
            ) : (
              <MobileNavbar
                where={where}
                setWhere={setWhere}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onSearch={handleSearch}
                isListingDetailsPage={true}
              />
            )}
            <div className={`max-w-6xl mx-auto ${!isMobile ? 'mt-8 pt-8' : 'mt-2 pt-2'} pb-8 mb-8`}>
              <h1 className="text-3xl font-bold mb-6 text-black px-4 sm:px-8">{listing.title}</h1>
              {isSmallScreen ? (
                // Full-width single image for small screens
                <div className="w-full mb-8 relative" style={{ height: '70vh', minHeight: '400px' }}>
                  <img
                    src={images[0]?.url}
                    alt={listing.title}
                    className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
                    style={{ 
                      height: '100%', 
                      width: '100%', 
                      objectFit: 'cover',
                      objectPosition: 'center',
                      transform: 'translateZ(0)'
                    }}
                    onClick={() => { setShowPhotoModal(true); setCurrentPhotoIndex(0); }}
                  />
                  {/* Wishlist heart icon - only show if user is not the host */}
                  {user && user.id !== listing.user_id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(); }}
                      disabled={wishlistLoading}
                      className="absolute top-4 left-4 bg-white border border-gray-200 rounded-full p-2 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 shadow-sm"
                    >
                      {wishlistLoading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg
                          className={`w-4 h-4 ${isInWishlist ? 'text-red-500 fill-current' : 'text-gray-600'}`}
                          fill={isInWishlist ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                // Centered and wider grid layout for larger screens
                <div className="flex justify-center mb-8">
                  <div className="w-full max-w-7xl px-4 sm:px-8">
                    <div className="grid grid-cols-1 md:[grid-template-columns:2fr_1fr_1fr] gap-4 rounded-3xl overflow-hidden" style={{ 
                      height: '600px', 
                      minHeight: '400px',
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr',
                      gridTemplateRows: 'repeat(2, 1fr)'
                    } as React.CSSProperties & {
                      WebkitDisplay?: string;
                      WebkitGridTemplateColumns?: string;
                      WebkitGridTemplateRows?: string;
                    }}>
                   {/* First column: one big image spanning two rows */}
                   <div className="relative col-span-1 row-span-2 h-full w-full group overflow-hidden rounded-2xl" style={{
                     gridRow: 'span 2',
                     aspectRatio: '1/1'
                   } as React.CSSProperties & {
                     WebkitGridRow?: string;
                   }}>
                                            <img
                         src={images[0]?.url}
                         alt={listing.title}
                         className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                         style={{ 
                           height: '100%', 
                           width: '100%', 
                           objectFit: 'cover',
                           objectPosition: 'center',
                           transform: 'translateZ(0)',
                           borderRadius: '16px',
                           WebkitBorderRadius: '16px'
                         }}
                         onClick={() => { setShowPhotoModal(true); setCurrentPhotoIndex(0); }}
                       />
                     {/* Wishlist heart icon - only show if user is not the host */}
                     {user && user.id !== listing.user_id && (
                       <button
                         onClick={(e) => { e.stopPropagation(); toggleWishlist(); }}
                         disabled={wishlistLoading}
                         className="absolute top-4 left-4 bg-white border border-gray-200 rounded-full p-2 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 shadow-sm"
                       >
                         {wishlistLoading ? (
                           <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                         ) : (
                           <svg
                             className={`w-4 h-4 ${isInWishlist ? 'text-red-500 fill-current' : 'text-gray-600'}`}
                             fill={isInWishlist ? 'currentColor' : 'none'}
                             stroke="currentColor"
                             viewBox="0 0 24 24"
                           >
                             <path
                               strokeLinecap="round"
                               strokeLinejoin="round"
                               strokeWidth={2}
                               d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                             />
                           </svg>
                         )}
                       </button>
                     )}
                   </div>
                   {/* Second column: two stacked images */}
                   {images.slice(1, 3).map((img, i) => (
                     <div key={i} className="relative col-span-1 h-full w-full group overflow-hidden rounded-2xl" style={{
                       aspectRatio: '1/1'
                     }}>
                       <img
                         src={img.url}
                         alt={listing.title}
                         className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                         style={{ 
                           height: '100%', 
                           width: '100%', 
                           objectFit: 'cover',
                           objectPosition: 'center',
                           transform: 'translateZ(0)',
                           borderRadius: '16px',
                           WebkitBorderRadius: '16px'
                         }}
                         onClick={() => { setShowPhotoModal(true); setCurrentPhotoIndex(i + 1); }}
                       />
                     </div>
                   ))}
                   {/* Third column: two stacked images */}
                   {images.slice(3, 5).map((img, i) => (
                     <div key={i} className="relative col-span-1 h-full w-full group overflow-hidden rounded-2xl" style={{
                       aspectRatio: '1/1'
                     }}>
                       <img
                         src={img.url}
                         alt={listing.title}
                         className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                         style={{ 
                           height: '100%', 
                           width: '100%', 
                           objectFit: 'cover',
                           objectPosition: 'center',
                           transform: 'translateZ(0)',
                           borderRadius: '16px',
                           WebkitBorderRadius: '16px'
                         }}
                         onClick={() => { setShowPhotoModal(true); setCurrentPhotoIndex(i + 3); }}
                       />
                     </div>
                   ))}
                   </div>
                 </div>
               </div>
             )}
             
             {/* Optionally, add more details below */}
             <div className="max-w-6xl mx-auto px-4 sm:px-8">
               <div className="mt-12 relative">
                <div className={`${!isMobile ? 'lg:grid lg:grid-cols-3 lg:gap-8' : 'flex flex-col'} ${!isMobile ? '' : 'gap-6'}`} style={{
                  display: !isMobile ? 'grid' : 'flex',
                  gridTemplateColumns: !isMobile ? '2fr 1fr' : 'auto',
                  gap: !isMobile ? '2rem' : '1.5rem'
                }}>
                  {/* Left: Listing details */}
                  <div className={`${!isMobile ? 'lg:col-span-1' : 'order-1'}`}>
                    {/* Meet your host Section (moved above About this place) */}
                    <div className="mb-8">
                      <h3 className="text-black font-semibold text-xl mb-6">Meet your host</h3>
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm w-fit">
                        <div className="flex flex-row items-center gap-4">
                          <div className="flex-shrink-0">
                            {host?.avatar_url ? (
                              <img 
                                src={buildAvatarUrl(host.avatar_url) || ''} 
                                alt={host.name || 'Host'} 
                                className="w-20 h-20 sm:w-24 sm:h-24 md:w-20 lg:w-24 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  if (host) {
                                    // If current user is the host, go to main profile page
                                    if (user?.id === host.id) {
                                      router.push('/profile');
                                    } else {
                                      // If viewing someone else's listing, go to their profile page
                                      router.push(`/profile/${host.id}`);
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <div 
                                className="w-20 h-20 sm:w-24 sm:h-24 md:w-20 lg:w-24 rounded-2xl bg-gray-300 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  if (host) {
                                    // If current user is the host, go to main profile page
                                    if (user?.id === host.id) {
                                      router.push('/profile');
                                    } else {
                                      // If viewing someone else's listing, go to their profile page
                                      router.push(`/profile/${host.id}`);
                                    }
                                  }
                                }}
                              >
                                <span className="text-gray-600 text-4xl sm:text-5xl md:text-3xl lg:text-4xl font-medium">
                                  {host?.name ? host.name.charAt(0).toUpperCase() : 'H'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-black font-semibold text-lg md:text-base lg:text-lg">
                                  {host?.name ? host.name.split(' ')[0] : 'Host'}
                                </p>
                                {hostReviewStats && (
                                  <div className="flex items-center">
                                    <span className="text-black mr-1 md:text-sm">★</span>
                                    <span className="text-black font-semibold text-base md:text-sm lg:text-base mr-1">{hostReviewStats.avg.toFixed(1)}</span>
                                    <span className="text-gray-700 text-sm md:text-xs lg:text-sm">({hostReviewStats.count})</span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-gray-700 text-sm sm:text-base md:text-sm lg:text-base">
                                  {university?.name || 'University'}
                                </p>
                                <p className="text-gray-700 text-sm sm:text-base md:text-sm lg:text-base">
                                  {host?.major || 'Student'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    
                    
                    {/* About this place Section */}
                    <div className="mb-8">
                      <h3 className="text-black font-semibold text-xl mb-2">About this place</h3>
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">{listing.description}</p>
                    </div>
                    {/* Property details */}
                    <div className="mt-8">
                      <h3 className="text-black font-semibold mb-2 text-xl">Property details</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {listing.property_type && (
                          <div className="flex items-center">
                            {(() => {
                              const propertyType = listing.property_type.toLowerCase();
                              if (propertyType === 'apartment') {
                                return <img src="/icons/icons8-apartment-50.png" alt="Apartment" className="w-5 h-5 mr-3 flex-shrink-0" />;
                              } else if (propertyType === 'house') {
                                return <img src="/icons/icons8-house-30.png" alt="House" className="w-5 h-5 mr-3 flex-shrink-0" />;
                              } else {
                                return <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>;
                              }
                            })()}
                            <span className="text-gray-700">{formatPropertyText(listing.property_type)}</span>
                          </div>
                        )}
                        {listing.bedrooms && (
                          <div className="flex items-center">
                            <img src="/icons/bed.png" alt="Bedroom" className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {listing.bathrooms && (
                          <div className="flex items-center">
                            <img src="/icons/bath-tub.png" alt="Bathroom" className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">{listing.bathrooms} bathroom{listing.bathrooms !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {listing.max_occupancy && (
                          <div className="flex items-center">
                            <img src="/icons/icons8-group-30.png" alt="Guests" className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">{listing.max_occupancy} guest{listing.max_occupancy !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {listing.guest_space && (
                          <div className="flex items-center">
                            {(() => {
                              const guestSpace = listing.guest_space.toLowerCase();
                              if (guestSpace === 'entire_place') {
                                return <img src="/icons/icons8-home-50.png" alt="Entire Place" className="w-5 h-5 mr-3 flex-shrink-0" />;
                              } else if (guestSpace === 'room') {
                                return <img src="/icons/icons8-room-64.png" alt="Room" className="w-5 h-5 mr-3 flex-shrink-0" />;
                              } else if (guestSpace === 'shared_room') {
                                return <img src="/icons/icons8-group-30.png" alt="Shared Room" className="w-5 h-5 mr-3 flex-shrink-0" />;
                              } else {
                                return <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>;
                              }
                            })()}
                            <span className="text-gray-700">{formatPropertyText(listing.guest_space)}</span>
                          </div>
                        )}
                        {listing.occupants && listing.occupants.includes('me') && (
                          <div className="flex items-center">
                            <img src="/icons/icons8-host-50.png" alt="Host present" className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">Host present</span>
                          </div>
                        )}
                        {listing.occupants && listing.occupants.includes('family') && (
                          <div className="flex items-center">
                            <img src="/icons/icons8-host-50.png" alt="Family present" className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">Family present</span>
                          </div>
                        )}
                        {listing.occupants && listing.occupants.includes('other_guests') && (
                          <div className="flex items-center">
                            <img src="/icons/icons8-host-50.png" alt="Guests present" className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">Guests present</span>
                          </div>
                        )}
                        {listing.occupants && listing.occupants.includes('roommate') && (
                          <div className="flex items-center">
                            <img src="/icons/icons8-host-50.png" alt="Roommate present" className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">Roommate present</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Amenities */}
                    <div className="mt-8">
                      <h3 className="text-black font-semibold mb-2 text-xl">Amenities</h3>
                      {listing.amenities && listing.amenities.length > 0 ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {(() => {
                            // Sort amenities in order: Living Essentials, College Essentials, Extra
                            const livingEssentials = listing.amenities.filter((a: any) => 
                              ['Wi-Fi', 'TV', 'Kitchen', 'Washer', 'Air conditioning', 'Free parking', 'Paid parking']
                              .includes(a.name)
                            );
                            const collegeEssentials = listing.amenities.filter((a: any) => 
                              ['Dedicated workspace', 'Quiet study area', 'High-speed Wi-Fi', 'Printer access', 'Coffee station', 'Whiteboard', 'Group study area']
                              .includes(a.name)
                            );
                            const extra = listing.amenities.filter((a: any) => 
                              !['Wi-Fi', 'TV', 'Kitchen', 'Washer', 'Air conditioning', 'Free parking', 'Paid parking', 'Dedicated workspace', 'Quiet study area', 'High-speed Wi-Fi', 'Printer access', 'Coffee station', 'Whiteboard', 'Group study area']
                              .includes(a.name)
                            );
                            
                            const sortedAmenities = [...livingEssentials, ...collegeEssentials, ...extra];
                            
                            // Show only first 10 amenities
                            const displayedAmenities = sortedAmenities.slice(0, 10);
                            
                            return displayedAmenities.map((a: any) => (
                              <div key={a.code || a.name} className="flex items-center">
                                {getAmenityIcon(a.name)}
                                <span className="text-gray-700">{a.name}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <span className="text-gray-400">No amenities listed</span>
                      )}
                      
                      {/* Show all amenities button */}
                      {listing.amenities && listing.amenities.length > 0 && (
                        <button 
                          onClick={() => setShowAmenitiesModal(true)}
                          className="mt-8 bg-white border border-gray-200 rounded-2xl px-4 py-2 font-medium shadow-sm hover:bg-gray-50 transition-colors text-black"
                          style={{ marginTop: '22px' }}
                        >
                          Show all {listing.amenities.length} amenities
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Price and Booking Container - Now positioned to scroll from Meet your host to Show all amenities */}
                  <div className={`${!isMobile ? 'lg:col-span-1' : 'order-2'} ${isMobile ? 'hidden' : ''}`}>
                    <div className="lg:sticky lg:top-28" style={{ 
                      position: 'sticky',
                      top: '7rem',
                      transform: 'translateZ(0)'
                    }}>
                      {/* Price and Booking Container */}
                      {user && user.id !== listing.user_id ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full">
                          <div className="text-black text-2xl font-bold mb-2">
                            <div className="text-2xl font-bold text-black">
                              {(() => {
                                const { start, end } = selectedRange;
                                let nights = 1;
                                if (start && end) {
                                  const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                  nights = diff === 0 ? 1 : diff;
                                }
                                if (!selectedRange.start || !selectedRange.end) {
                                  return `${formatPrice(Number(listing?.price_per_night ?? 0))}`;
                                }
                                if (nights === 1) {
                                  return `${formatPrice(Number(listing?.price_per_night ?? 0))}`;
                                }
                                return `${formatPrice(Math.round(Number(listing?.price_per_night ?? 0) * nights))}`;
                              })()}
                              <span className="text-sm font-normal text-gray-500">
                                {(() => {
                                  const { start, end } = selectedRange;
                                  if (!start || !end) return '/night';
                                  const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                  const nights = diff === 0 ? 1 : diff;
                                  return nights === 1 ? '/night' : ` for ${nights} nights`;
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 mb-4">
                            {listing.start_date && listing.end_date ? (
                              <CompactCalendar 
                                startDate={listing.start_date} 
                                endDate={listing.end_date} 
                                selectedRange={selectedRange}
                                setSelectedRange={setSelectedRange}
                              />
                            ) : (
                              <div className="text-black text-base font-medium">Availability not specified</div>
                            )}
                          </div>
                          <button
                            onClick={handleMessageHost}
                            className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
                          >
                            Message host
                          </button>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
                          <div className="text-black text-2xl font-bold mb-2">
                            <div className="text-2xl font-bold text-black">
                              {(() => {
                                const { start, end } = selectedRange;
                                let nights = 1;
                                if (start && end) {
                                  const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                  nights = diff === 0 ? 1 : diff;
                                }
                                if (!selectedRange.start || !selectedRange.end) {
                                  return `${formatPrice(Number(listing?.price_per_night ?? 0))}`;
                                }
                                if (nights === 1) {
                                  return `${formatPrice(Number(listing?.price_per_night ?? 0))}`;
                                }
                                return `${formatPrice(Math.round(Number(listing?.price_per_night ?? 0) * nights))}`;
                              })()}
                              <span className="text-sm font-normal text-gray-500">
                                {(() => {
                                  const { start, end } = selectedRange;
                                  if (!start || !end) return '/night';
                                  const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                  const nights = diff === 0 ? 1 : diff;
                                  return nights === 1 ? '/night' : ` for ${nights} nights`;
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 mb-4">
                            {listing.start_date && listing.end_date ? (
                              <CompactCalendar 
                                startDate={listing.start_date} 
                                endDate={listing.end_date} 
                                selectedRange={selectedRange}
                                setSelectedRange={setSelectedRange}
                              />
                            ) : (
                              <div className="text-black text-base font-medium">Availability not specified</div>
                            )}
                          </div>
                          <div className="text-center text-gray-500">
                            {user ? 'This is your own listing' : 'Please log in to book this listing'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Map */}
              <h3 className="mt-8 text-black font-semibold mb-2 text-xl">Location</h3>
              <div className={`${!isMobile ? 'lg:grid lg:grid-cols-3 lg:gap-6' : 'flex flex-col'} ${!isMobile ? '' : 'gap-6'}`} style={{
                display: !isMobile ? 'grid' : 'flex',
                gridTemplateColumns: !isMobile ? '2fr 1fr' : 'auto',
                gap: !isMobile ? '1.5rem' : '1.5rem'
              }}>
                {/* Left: Map and location info */}
                <div className={`${!isMobile ? 'lg:col-span-1' : 'order-1'} relative`}>
                  <PrivacyMap
                    latitude={listing.latitude}
                    longitude={listing.longitude}
                    city={listing.city}
                    state={listing.state}
                    neighborhood={listing.neighborhood}
                    height="500px"
                  />
                </div>
                {/* Right: Commute Time, sticky */}
                <div className={`${!isMobile ? 'lg:col-span-1' : 'order-2'}`}>
                  <div className="lg:sticky lg:top-28" style={{ 
                    position: 'sticky',
                    top: '7rem',
                    transform: 'translateZ(0)'
                  }}>
                    {/* Commute Time Container */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-sm">
                      <div className="text-black text-lg font-semibold mb-2">
                        Estimate Commute Time
                      </div>
                      <div className="mb-3">
                        <GoogleMapsAutocomplete
                          onAddressSelect={handleCommuteAddressSelect}
                          placeholder="Enter your address or destination"
                        />
                        {commuteAddress && (
                          <div className="text-xs text-gray-600 mt-1 truncate"><span className="font-medium">Selected:</span> {commuteAddress}</div>
                        )}
                      </div>
                      {/* Commute results UI */}
                      <div className="space-y-2 min-h-[100px]">
                        {commuteLoading && (
                          <div className="text-sm text-black flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span> Calculating commute times...</div>
                        )}
                        {commuteError && (
                          <div className="text-sm text-red-600">{commuteError}</div>
                        )}
                        {commuteTimes && !commuteLoading && !commuteError && (
                          <>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              {/* Car icon */}
                              <img src="/icons/icons8-car.gif" alt="Car" className="w-5 h-5" />
                              <span>Car: <span className="font-medium">{commuteTimes.car || '--'}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              {/* Transit icon (train) */}
                              <img src="/icons/icons8-train-50.png" alt="Transit" className="w-5 h-5" />
                              <span>Transit: <span className="font-medium">{commuteTimes.transit || '--'}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              {/* Bike icon */}
                              <img src="/icons/icons8-bike-50.png" alt="Bike" className="w-5 h-5" />
                              <span>Bike: <span className="font-medium">{commuteTimes.bike || '--'}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              {/* Walk icon */}
                              <img src="/icons/icons8-walk-50.png" alt="Walk" className="w-5 h-5" />
                              <span>Walk: <span className="font-medium">{commuteTimes.walk || '--'}</span></span>
                            </div>
                          </>
                        )}
                        {!commuteLoading && !commuteError && !commuteTimes && (
                          <div className="text-xs text-gray-400">Enter an address to see commute times.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews Section with Rating Card */}
              <div className={`mt-8 ${isMobile && otherListings.length === 0 ? 'pb-20' : ''}`}>
                <h3 className="text-black font-semibold text-xl mb-6">Reviews</h3>
                {listingRatings && listingRatings.totalReviews === 0 ? (
                  /* No Reviews Layout - Rating Card on Left */
                  <div className={`${!isMobile ? 'flex gap-6 items-start' : 'flex flex-col gap-6'}`} style={!isMobile ? { display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' } : {}}>
                    {/* Rating Card - Left Side */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-md lg:max-w-none">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <span className="text-2xl font-bold text-black mr-2">★</span>
                          <span className="text-2xl font-bold text-black">{listingRatings.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: 'Cleanliness', rating: listingRatings.categoryRatings.cleanliness },
                          { name: 'Accuracy', rating: listingRatings.categoryRatings.accuracy },
                          { name: 'Communication', rating: listingRatings.categoryRatings.communication },
                          { name: 'Location', rating: listingRatings.categoryRatings.location },
                          { name: 'Value', rating: listingRatings.categoryRatings.value },
                        ].map((category) => {
                          const percent = Math.max(0, Math.min(1, category.rating / 5));
                          return (
                            <div key={category.name} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">{category.name}</span>
                              <div className="flex-1 mx-4">
                                <div className={`h-2 bg-gray-200 rounded-full relative ${isMobile ? 'max-w-32 mx-auto' : 'w-full'}`}>
                                  <div
                                    className="h-2 rounded-full bg-black transition-all"
                                    style={{ width: `${percent * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-gray-900 w-8 text-right flex-shrink-0">{category.rating.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>
                      {user && host && user.id !== host.id && (
                        <div className="mt-4">
                          <button
                            onClick={() => {
                              const event = new CustomEvent('openReviewModal');
                              window.dispatchEvent(event);
                            }}
                            className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
                          >
                            Write a review
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Reviews Section - Always render to ensure event listeners are set up */}
                    <div className="flex-1">
                      <ReviewsSection
                        listingId={listing.id}
                        reviewer={user as any}
                        reviewee={host as any}
                        onReviewSubmitted={fetchListingRatings}
                      />
                    </div>
                  </div>
                ) : (
                  /* Has Reviews Layout - Rating Card on Left, Reviews on Right */
                  <div className={`${!isMobile ? 'flex gap-6 items-start' : 'flex flex-col gap-6'}`} style={!isMobile ? { display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' } : {}}>
                    {/* Rating Card - Left Side */}
                    {listingRatings && (
                      <div className={`${!isMobile ? 'sticky top-28' : ''}`}>
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-md lg:max-w-none">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-black mr-2">★</span>
                              <span className="text-2xl font-bold text-black">{listingRatings.averageRating.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {[
                              { name: 'Cleanliness', rating: listingRatings.categoryRatings.cleanliness },
                              { name: 'Accuracy', rating: listingRatings.categoryRatings.accuracy },
                              { name: 'Communication', rating: listingRatings.categoryRatings.communication },
                              { name: 'Location', rating: listingRatings.categoryRatings.location },
                              { name: 'Value', rating: listingRatings.categoryRatings.value },
                            ].map((category) => {
                              const percent = Math.max(0, Math.min(1, category.rating / 5));
                              return (
                                <div key={category.name} className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">{category.name}</span>
                                  <div className="flex-1 mx-4">
                                    <div className={`h-2 bg-gray-200 rounded-full relative ${isMobile ? 'max-w-32 mx-auto' : 'w-full'}`}>
                                      <div
                                        className="h-2 rounded-full bg-black transition-all"
                                        style={{ width: `${percent * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold text-gray-900 w-8 text-right flex-shrink-0">{category.rating.toFixed(1)}</span>
                                </div>
                              );
                            })}
                          </div>
                          {user && host && user.id !== host.id && (
                            <div className="mt-4">
                              <button
                                onClick={() => {
                                  const event = new CustomEvent('openReviewModal');
                                  window.dispatchEvent(event);
                                }}
                                className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
                              >
                                Write a review
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Reviews Section - Right Side */}
                    <div className="flex-1">
                      <ReviewsSection
                        listingId={listing.id}
                        reviewer={user as any}
                        reviewee={host as any}
                        onReviewSubmitted={fetchListingRatings}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Other Listings Section */}
              {otherListings.length > 0 && (
                <div className={`mt-8 ${isMobile ? 'pb-20' : ''}`}>
                  <h3 className="text-black font-semibold text-xl mb-6">Other listings</h3>
                  {otherListingsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Sliding Gallery Container */}
                      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                        {otherListings.map((otherListing) => (
                          <div key={otherListing.id} className="cursor-pointer flex-shrink-0" onClick={() => {
                            // Check if user is logged in
                            if (!user) {
                              router.push('/login');
                              return;
                            }
                            router.push(`/listings/${otherListing.id}`);
                          }}>
                            <ListingCard 
                              id={otherListing.id}
                              title={otherListing.title}
                              images={otherListing.images}
                              name={otherListing.name}
                              avatar_url={otherListing.avatar_url}
                              university_name={otherListing.university_name}
                              bedrooms={otherListing.bedrooms}
                              bathrooms={otherListing.bathrooms}
                              price_per_night={otherListing.price_per_night}
                              averageRating={otherListing.averageRating}
                              totalReviews={otherListing.totalReviews}
                              amenities={otherListing.amenities}
                              cardMargin="mx-0"
                              onAvatarClick={() => {
                                // Navigate to the host's profile page
                                if (otherListing.user_id) {
                                  router.push(`/profile/${otherListing.user_id}`);
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Navigation Arrows */}
                      {otherListings.length > 3 && (
                        <>
                          {/* Left Arrow */}
                          <button
                            onClick={() => {
                              const container = document.querySelector('.overflow-x-auto');
                              if (container) {
                                container.scrollBy({ left: -400, behavior: 'smooth' });
                              }
                            }}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-10"
                          >
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          
                          {/* Right Arrow */}
                          <button
                            onClick={() => {
                              const container = document.querySelector('.overflow-x-auto');
                              if (container) {
                                container.scrollBy({ left: 400, behavior: 'smooth' });
                              }
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-10"
                          >
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Photo Gallery Modal */}
            {showPhotoModal && images.length > 0 && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-[9999]" onClick={() => setShowPhotoModal(false)}>
                <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  {/* Close button */}
                  <button
                    onClick={() => setShowPhotoModal(false)}
                    className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Main photo */}
                  <div 
                    className="relative"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    <img
                      src={images[currentPhotoIndex]?.url}
                      alt={`${listing.title} - Photo ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-contain max-h-[70vh] rounded-lg"
                    />
                    

                  </div>

                  {/* Navigation buttons - only show on desktop */}
                  {images.length > 1 && !isMobile && (
                    <>
                      {currentPhotoIndex > 0 && (
                        <button
                          onClick={() => setCurrentPhotoIndex(prev => prev - 1)}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      {currentPhotoIndex < images.length - 1 && (
                        <button
                          onClick={() => setCurrentPhotoIndex(prev => prev + 1)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}

                  {/* Thumbnail strip */}
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative flex-shrink-0">
                        <button
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                            index === currentPhotoIndex ? 'border-black' : 'border-gray-400'
                          }`}
                        >
                          <img
                            src={image.url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Amenities Modal */}
            {showAmenitiesModal && listing.amenities && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">All Amenities</h3>
                    <button
                      onClick={() => setShowAmenitiesModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6 space-y-3">
                    {listing.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center">
                        {getAmenityIcon(amenity.name)}
                        <span className="text-sm text-gray-700">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Inline Calendar for Mobile */}
            {showCalendarInline && listing.start_date && listing.end_date && isMobile && (
              <div 
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setShowCalendarInline(false)}
              >
                <div 
                  className="fixed bottom-16 left-4 right-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CompactCalendar 
                    startDate={listing.start_date} 
                    endDate={listing.end_date} 
                    selectedRange={selectedRange}
                    setSelectedRange={(range) => {
                      setSelectedRange(range);
                      // Auto-hide calendar when both start and end dates are selected
                      if (range.start && range.end) {
                        setShowCalendarInline(false);
                      }
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Mobile Footer */}
            {user && isMobile && (
              <MobileFooter 
                isListingPage={true}
                isOwnListing={user?.id === host?.id}
                price={(() => {
                  const { start, end } = selectedRange;
                  let nights = 1;
                  if (start && end) {
                    const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    nights = diff === 0 ? 1 : diff;
                  }
                  if (!selectedRange.start || !selectedRange.end) {
                    return formatPrice(Number(listing?.price_per_night ?? 0));
                  }
                  if (nights === 1) {
                    return formatPrice(Number(listing?.price_per_night ?? 0));
                  }
                  return formatPrice(Math.round(Number(listing?.price_per_night ?? 0) * nights));
                })()}
                priceLabel={(() => {
                  const { start, end } = selectedRange;
                  if (!start || !end) return '/night';
                  const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  const nights = diff === 0 ? 1 : diff;
                  return nights === 1 ? '/night' : ` for ${nights} nights`;
                })()}
                availableDatesLabel={(() => {
                  const { start, end } = selectedRange;
                  if (!start || !end) return "Available dates";
                  
                  const formatDate = (date: Date) => {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${month}/${day}`;
                  };
                  
                  if (start && end) {
                    return `${formatDate(start)} - ${formatDate(end)}`;
                  } else if (start) {
                    return formatDate(start);
                  }
                  
                  return "Available dates";
                })()}
                onAvailableDatesClick={() => {
                  setShowCalendarInline(!showCalendarInline);
                }}
                onMessageClick={handleMessageHost}
              />
            )}
            
            
          </div>
        </div>
        );
}