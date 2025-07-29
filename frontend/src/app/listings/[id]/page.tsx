"use client";
import React, { useEffect, useState } from "react";
import type { User } from '../../../types/User';
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import SearchBar from "../../../components/Searchbar";
import PrivacyMap from "../../../components/PrivacyMap";
import BookingForm from "../../../components/BookingForm";
import ReviewsSection from "../../../components/ReviewsSection";
import ProfileModal from "../../../components/ProfileModal";
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useAuth } from "../../../hooks/useAuth";
import GoogleMapsAutocomplete from '../../../components/GoogleMapsAutocomplete';
import { getCommuteTimes, CommuteTimes } from '../../../utils/getCommuteTimes';
import ListingCard from '../../../components/ListingCard';

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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const handleSearch = () => {
    // Implement navigation or search logic if needed
  };

  const handleMessageHost = async () => {
    if (!user || !host) return;
    
    try {
      // Create or find conversation
      const response = await fetch('http://localhost:4000/api/conversations/find-or-create', {
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
                    ? 'bg-blue-600 text-white border-blue-700 font-semibold'
                    : dayData.isEndDate
                      ? 'bg-blue-600 text-white border-blue-700 font-semibold'
                      : dayData.isSelected
                        ? 'bg-blue-200 text-blue-800 border border-blue-300'
                        : dayData.isAvailable
                          ? 'hover:bg-gray-100 text-gray-800 border border-transparent'
                          : 'text-gray-400'}
                  ${dayData.isToday && !dayData.isSelected ? 'ring-2 ring-blue-400' : ''}`
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
          <span className="inline-block w-3 h-3 bg-blue-500 border border-blue-600 rounded-full ml-4 mr-1"></span>
          Selected
        </div>
      </div>
    );
  }

  // Function to get icon for amenity
  const getAmenityIcon = (amenityName: string) => {
    const name = amenityName.toLowerCase();
    
    // WiFi/Internet
    if (name.includes('wifi') || name.includes('internet')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    }
    
    // Parking
    if (name.includes('parking')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    }
    
    // Kitchen
    if (name.includes('kitchen')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a3 3 0 106 0l-3-9zm9 0a3 3 0 11-6 0l3 9a3 3 0 006 0l3-9zm-3 1m0 0l3 9a3 3 0 11-6 0l3-9z" />
        </svg>
      );
    }
    
    // Washer
    if (name.includes('washer')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }
    
    // Dryer
    if (name.includes('dryer')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }
    
    // Air Conditioning
    if (name.includes('ac') || name.includes('air conditioning')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    
    // Heating
    if (name.includes('heating')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
      );
    }
    
    // TV
    if (name.includes('tv') || name.includes('television')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    
    // Gym
    if (name.includes('gym')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
        </svg>
      );
    }
    
    // Fitness
    if (name.includes('fitness')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6v6m0 0v6m0-6h6m-6 0H3" />
        </svg>
      );
    }
    
    // Pool
    if (name.includes('pool')) {
        return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
      );
    }
    
    // Swimming
    if (name.includes('swimming')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    }
    
    // Balcony
    if (name.includes('balcony')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    }
    
    // Terrace
    if (name.includes('terrace')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }
    
    // Patio
    if (name.includes('patio')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      );
    }
    
    // Elevator
    if (name.includes('elevator')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }
    
    // Doorman
    if (name.includes('doorman')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    }
    
    // Security
    if (name.includes('security')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    }
    
    // Workspace
    if (name.includes('workspace') || name.includes('desk')) {
      return (
        <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    
    // Default icon for other amenities
    return (
      <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    );
  };

  useEffect(() => {
    // Apply overscroll behavior to prevent bounce
    document.documentElement.style.overscrollBehavior = 'contain';
    document.body.style.overscrollBehavior = 'contain';
    
    // Ensure white background
    document.documentElement.style.backgroundColor = 'white';
    document.body.style.backgroundColor = 'white';
    
    // Cleanup function to reset
    return () => {
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/listings/${id}`);
        const data = await res.json();
        setListing(data);

        // Fetch host user
        if (data.user_id) {
          const userRes = await fetch(`http://localhost:4000/api/users/${data.user_id}`);
          const user = await userRes.json();
          setHost(user);
          // Fetch university
          if (user.university_id) {
            const uniRes = await fetch(`http://localhost:4000/api/universities/${user.university_id}`);
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
        const res = await fetch(`http://localhost:4000/api/host-reviews/user/${host.id}`);
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

  // State for review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    cleanliness_rating: 0,
    accuracy_rating: 0,
    communication_rating: 0,
    location_rating: 0,
    value_rating: 0,
    comment: '',
  });

  // Handle review form submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !host || !user.id || !host.id) {
      alert('You must be logged in and viewing a valid listing to submit a review.');
      return;
    }
    // Prevent submission if any rating is 0
    const { cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating } = reviewForm;
    if ([cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating].some(r => r === 0)) {
      alert('Please provide a rating for all categories.');
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/api/host-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing?.id,
          reviewer_id: user.id,
          reviewee_id: host.id,
          cleanliness_rating: reviewForm.cleanliness_rating,
          accuracy_rating: reviewForm.accuracy_rating,
          communication_rating: reviewForm.communication_rating,
          location_rating: reviewForm.location_rating,
          value_rating: reviewForm.value_rating,
          comment: reviewForm.comment,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit review.');
        return;
      }
      // Success: close modal, reset form, refresh ratings
      setShowReviewModal(false);
      setReviewForm({
        cleanliness_rating: 0,
        accuracy_rating: 0,
        communication_rating: 0,
        location_rating: 0,
        value_rating: 0,
        comment: '',
      });
      // Refresh the ratings to show the new review
      await fetchListingRatings();
    } catch (err) {
      alert('Failed to submit review.');
    }
  };

  // Handler for address selection from autocomplete
  const handleCommuteAddressSelect = (addressData: any) => {
    setCommuteAddress(
      [addressData.street, addressData.neighborhood, addressData.city, addressData.state, addressData.zip]
        .filter(Boolean).join(', ')
    );
    if (addressData.latitude && addressData.longitude) {
      setCommuteCoords({ lat: addressData.latitude, lng: addressData.longitude });
    } else {
      setCommuteCoords(null);
    }
  };

  // Fetch commute times when both coordinates are available
  useEffect(() => {
    const fetchCommute = async () => {
      if (!listing?.latitude || !listing?.longitude || !commuteCoords) return;
      setCommuteLoading(true);
      setCommuteError(null);
      setCommuteTimes(null);
      try {
        const times = await getCommuteTimes(
          commuteCoords,
          { lat: Number(listing.latitude), lng: Number(listing.longitude) }
        );
        setCommuteTimes(times);
      } catch (e: any) {
        setCommuteError(e.message || 'Failed to fetch commute times');
      } finally {
        setCommuteLoading(false);
      }
    };
    if (commuteCoords && listing?.latitude && listing?.longitude) {
      fetchCommute();
    }
  }, [commuteCoords, listing?.latitude, listing?.longitude]);

  // Function to fetch and update listing ratings
  const fetchListingRatings = async () => {
    if (!listing?.id) return;
    try {
      const response = await fetch(`http://localhost:4000/api/host-reviews`);
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
        const response = await fetch(`http://localhost:4000/api/listings?exclude_user_id=${user.id}&city=${encodeURIComponent(listing.city)}`);
        if (response.ok) {
          const data = await response.json();
          // Filter out the current listing
          const filteredListings = data.filter((l: any) => l.id !== listing?.id);
          
          // Fetch ratings for the other listings
          const ratingsResponse = await fetch('http://localhost:4000/api/listings/average-ratings');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <Navbar />
        <div className="max-w-6xl mx-auto mt-16 text-center text-gray-500">Loading...</div>
      </div>
    );
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
    url: img.url.startsWith('/uploads/') ? `http://localhost:4000${img.url}` : img.url
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
      <Navbar fixed={false} />
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 pt-8 pb-8 mb-8">
        <h1 className="text-3xl font-bold mb-6 text-black">{listing.title}</h1>
        <div className="grid grid-cols-1 md:[grid-template-columns:2fr_1fr_1fr] gap-4 rounded-3xl overflow-hidden" style={{ 
          height: '500px', 
          minHeight: '300px',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridTemplateRows: 'repeat(2, 1fr)'
        } as React.CSSProperties & {
          WebkitDisplay?: string;
          WebkitGridTemplateColumns?: string;
          WebkitGridTemplateRows?: string;
        }}>
          {/* First column: one big image spanning two rows */}
          <div className="relative col-span-1 row-span-2 h-full w-full group" style={{
            gridRow: 'span 2'
          } as React.CSSProperties & {
            WebkitGridRow?: string;
          }}>
            <img
              src={images[0]?.url}
              alt={listing.title}
              className="w-full h-full object-cover rounded-2xl cursor-pointer transition-transform duration-300 group-hover:scale-105"
              style={{ 
                height: '100%', 
                width: '100%', 
                objectFit: 'cover',
                transform: 'translateZ(0)'
              }}
              onClick={() => { setShowPhotoModal(true); setCurrentPhotoIndex(0); }}
            />
          </div>
          {/* Second column: two stacked images */}
          {images.slice(1, 3).map((img, i) => (
            <div key={i} className="relative col-span-1 h-full w-full group">
              <img
                src={img.url}
                alt={listing.title}
                className="w-full h-full object-cover rounded-2xl cursor-pointer transition-transform duration-300 group-hover:scale-105"
                style={{ 
                  height: '100%', 
                  width: '100%', 
                  objectFit: 'cover',
                  transform: 'translateZ(0)'
                }}
                onClick={() => { setShowPhotoModal(true); setCurrentPhotoIndex(i + 1); }}
              />
            </div>
          ))}
          {/* Third column: two stacked images */}
          {images.slice(3, 5).map((img, i) => (
            <div key={i} className="relative col-span-1 h-full w-full group">
              <img
                src={img.url}
                alt={listing.title}
                className="w-full h-full object-cover rounded-2xl cursor-pointer transition-transform duration-300 group-hover:scale-105"
                style={{ 
                  height: '100%', 
                  width: '100%', 
                  objectFit: 'cover',
                  transform: 'translateZ(0)'
                }}
                onClick={() => { setShowPhotoModal(true); setCurrentPhotoIndex(i + 3); }}
              />
            </div>
          ))}
        </div>
        {/* Optionally, add more details below */}
        <div className="mt-12 relative">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8" style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '2rem'
          }}>
            {/* Left: Listing details */}
            <div className="lg:col-span-1">
            {/* Meet your host Section (moved above About this place) */}
            <div className="mb-8">
              <h3 className="text-black font-semibold text-xl mb-6">Meet your host</h3>
              <div className="flex items-center">
                <div className="mr-6">
                  {host?.avatar_url ? (
                    <img 
                      src={host.avatar_url} 
                      alt={host.name || 'Host'} 
                      className="w-25 h-25 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowProfileModal(true)}
                    />
                  ) : (
                    <div 
                      className="w-25 h-25 rounded-2xl bg-gray-300 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowProfileModal(true)}
                    >
                      <span className="text-gray-600 text-5xl font-medium">
                        {host?.name ? host.name.charAt(0).toUpperCase() : 'H'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start">
                    <div>
                      <div className="flex items-center mb-4">
                        <p className="text-black font-semibold text-lg mr-3">
                          {host?.name || 'Host'}
                        </p>
                        {hostReviewStats && (
                          <div className="flex items-center">
                            <span className="text-black mr-1">★</span>
                            <span className="text-black font-semibold text-base mr-1">{hostReviewStats.avg.toFixed(1)}</span>
                            <span className="text-gray-700 text-sm">({hostReviewStats.count})</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-700 mb-1">
                          {university?.name || 'University'}, Undergraduate
                        </p>
                        <p className="text-gray-700 mb-1">
                          {host?.major || 'Student'}, Class of {host?.graduation_year || '2025'}
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
              <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
            </div>
            {/* Property details */}
            <div className="mt-8">
              <h3 className="text-black font-semibold mb-2 text-xl">Property details</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {listing.property_type && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-700">{formatPropertyText(listing.property_type)}</span>
                  </div>
                )}
                {listing.bedrooms && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    <span className="text-gray-700">{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {listing.bathrooms && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <span className="text-gray-700">{listing.bathrooms} bathroom{listing.bathrooms !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {listing.max_occupancy && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span className="text-gray-700">{listing.max_occupancy} guest{listing.max_occupancy !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {listing.guest_space && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-700">{formatPropertyText(listing.guest_space)}</span>
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
          <div className="lg:col-span-1">
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
        <div className="lg:grid lg:grid-cols-3 lg:gap-6" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1.5rem'
        }}>
          {/* Left: Map and location info */}
          <div className="lg:col-span-1 relative">
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
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-28" style={{ 
              position: 'sticky',
              top: '7rem',
              transform: 'translateZ(0)'
            }}>
              {/* Commute Time Container */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full" style={{ width: '384px', minWidth: '384px', maxWidth: '384px' }}>
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
                    <div className="text-sm text-blue-600 flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></span> Calculating commute times...</div>
                  )}
                  {commuteError && (
                    <div className="text-sm text-red-600">{commuteError}</div>
                  )}
                  {commuteTimes && !commuteLoading && !commuteError && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {/* Car icon */}
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2-5a2 2 0 012-2h10a2 2 0 012 2l2 5M5 13h14M7 16a2 2 0 104 0 2 2 0 00-4 0zm6 0a2 2 0 104 0 2 2 0 00-4 0z" /></svg>
                        <span>Car: <span className="font-medium">{commuteTimes.car || '--'}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {/* Transit icon (train) */}
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 19v1a1 1 0 001 1h6a1 1 0 001-1v-1M8 19h8M8 19a4 4 0 018 0M8 19a4 4 0 01-8 0M16 19a4 4 0 018 0M12 3v10m0 0l-3-3m3 3l3-3" /></svg>
                        <span>Transit: <span className="font-medium">{commuteTimes.transit || '--'}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {/* Bike icon */}
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17.5V14h-3l-2-5h-2" /></svg>
                        <span>Bike: <span className="font-medium">{commuteTimes.bike || '--'}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {/* Walk icon */}
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 5.5a2 2 0 11-4 0 2 2 0 014 0zM12 7.5v2.5l-2 2.5m2-2.5l2 2.5m-2-2.5v6m0 0l-2 2.5m2-2.5l2 2.5" /></svg>
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
        <div className="mt-8">
          <h3 className="text-black font-semibold text-xl mb-6">Reviews</h3>
          {listingRatings && listingRatings.totalReviews === 0 ? (
            /* No Reviews Layout - Rating Card on Left */
            <div className="flex gap-6 items-start">
              {/* Rating Card - Left Side */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-96">
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
                          <div className="h-2 bg-gray-200 rounded-full relative max-w-32 mx-auto">
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
                        onClick={() => setShowReviewModal(true)}
                        className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
                      >
                        Write a review
                      </button>
                    </div>
                  )}
              </div>
              
              {/* Empty Right Side */}
              <div className="flex-1"></div>
            </div>
          ) : (
            /* Has Reviews Layout - Rating Card on Left, Reviews on Right */
            <div className="flex gap-6 items-start">
              {/* Rating Card - Left Side */}
              {listingRatings && (
                <div className="sticky top-28">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-96">
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
                            <div className="h-2 bg-gray-200 rounded-full relative max-w-32 mx-auto">
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
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Other Listings Section */}
        {otherListings.length > 0 && (
          <div className="mt-8">
            <h3 className="text-black font-semibold text-xl mb-6">Other listings</h3>
            {otherListingsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-start gap-10">
                {otherListings.map((otherListing) => (
                  <div key={otherListing.id} className="cursor-pointer" onClick={() => router.push(`/listings/${otherListing.id}`)}>
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
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      {/* Amenities Modal */}
      {showAmenitiesModal && listing && listing.amenities && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 relative">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-semibold text-gray-900">All Amenities</h3>
              <button
                onClick={() => setShowAmenitiesModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close amenities modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="border-b border-gray-200 absolute left-0 top-[72px] w-full" style={{marginLeft: 0, marginRight: 0}} />
            <div className="pt-8 p-4 grid grid-cols-1 gap-4">
              {listing.amenities.map((a: any) => (
                <div key={a.code || a.name} className="flex items-center">
                  {getAmenityIcon(a.name)}
                  <span className="text-gray-700">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Photo Gallery Modal */}
      {showPhotoModal && images.length > 0 && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[9999]" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
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
            <div className="relative">
              <img
                src={images[currentPhotoIndex]?.url}
                alt={`Photo ${currentPhotoIndex + 1}`}
                className="w-full h-full object-contain max-h-[70vh] rounded-lg transition-transform duration-300 hover:scale-105"
              />
              {/* Photo counter */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
                {currentPhotoIndex + 1} of {images.length}
              </div>
            </div>
            {/* Navigation buttons */}
            {images.length > 1 && (
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
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPhotoIndex(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${index === currentPhotoIndex ? 'border-black' : 'border-gray-400'}`}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Profile Modal */}
      {showProfileModal && host && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userId={host.id}
        />
      )}

      {/* Review Modal for listings without reviews */}
      {showReviewModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Write a Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleReviewSubmit}>
              {/* Star Rating Components */}
              {[
                { label: 'Cleanliness', field: 'cleanliness_rating' },
                { label: 'Accuracy', field: 'accuracy_rating' },
                { label: 'Communication', field: 'communication_rating' },
                { label: 'Location', field: 'location_rating' },
                { label: 'Value', field: 'value_rating' },
              ].map(({ label, field }) => (
                <div key={field} className="mb-2">
                  <label className="block text-gray-700 font-medium mb-1">{label}</label>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="focus:outline-none"
                        onClick={() => setReviewForm(f => ({ ...f, [field]: star }))}
                        aria-label={`Set ${label} to ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <span className={star <= (reviewForm as any)[field] ? 'text-black text-2xl' : 'text-gray-300 text-2xl'}>★</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Comment</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  className="w-full border border-gray-300 border-[1px] rounded-lg px-3 py-2 focus:border-black focus:outline-none text-black"
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="ml-2 bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}