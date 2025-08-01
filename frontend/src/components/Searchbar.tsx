"use client";
import React, { useState, useEffect, useRef } from 'react';
import { FaSearch } from 'react-icons/fa';
// import { DateRange } from 'react-date-range';
import { Loader } from '@googlemaps/js-api-loader';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import Navbar from './Navbar';
import './google-autocomplete.css';

export default function SearchBar({
  where,
  setWhere,
  dateRange,
  setDateRange,
  showCalendar,
  setShowCalendar,
  onSearch,
}: {
  where: string;
  setWhere: (v: string) => void;
  dateRange: any[];
  setDateRange: (v: any[]) => void;
  showCalendar: boolean;
  setShowCalendar: (v: boolean) => void;
  onSearch: () => void;
}) {
  const [isExtraExtraSmallSize, setIsExtraExtraSmallSize] = useState(false);

  // Detect extra extra small size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsExtraExtraSmallSize(width >= 750 && width < 925);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAutocomplete = async () => {
      if (!inputRef.current) return;
      
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
          return;
        }
        
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'], // Prioritize establishments first
          componentRestrictions: { country: ['us', 'ca'] }, // Restrict to US and Canada
          fields: ['address_components', 'formatted_address', 'name', 'place_id'],
          strictBounds: false
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (place.formatted_address) {
            // Clear the input first, then set the formatted address to avoid duplication
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

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      // Add delay for Safari to ensure DOM is ready
      setTimeout(() => {
        initAutocomplete();
      }, 100);
    } else {
      setError('Google Maps API key not configured');
    }
  }, [setWhere]);

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
  }, [showCalendar, setShowCalendar]);

  // Simple date formatting - no timezone nonsense
  const formatSimpleDate = (date: Date | null) => {
    if (!date) return 'Add dates';
    
    // This will show in the Next.js terminal
    console.log('🎨 [TERMINAL] Formatting date:', date.toString());
    
    // Get the date parts directly - no timezone conversion
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    console.log('🎨 [TERMINAL] Date parts:', { day, month, year });
    
    const result = `${months[month]} ${day}, ${year}`;
    console.log('🎨 [TERMINAL] Formatted result:', result);
    
    return result;
  };

  const checkIn = formatSimpleDate(dateRange[0].startDate);
  const checkOut = formatSimpleDate(dateRange[0].endDate);

  return (
    <div className={`w-full bg-white rounded-2xl shadow flex items-center px-1 py-0 relative border border-gray-200 ${isExtraExtraSmallSize ? 'max-w-lg' : 'max-w-lg'}`}>
      {/* Where */}
      <div className={`py-1 flex flex-col items-start justify-center relative ${isExtraExtraSmallSize ? 'px-2 flex-1' : 'px-4 flex-[1.5]'}`}>
                    <div className="text-black mb-0.5 text-sm">Where</div>
        <input
          ref={inputRef}
          type="text"
          value={where}
          onChange={e => setWhere(e.target.value)}
          onFocus={() => setShowCalendar(false)}
          placeholder="Search destinations"
          className="w-full bg-transparent outline-none border-none text-black placeholder-gray-400 text-sm"
                      style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          </div>
        )}
        {error && (
          <div className="absolute top-full left-0 text-red-500 text-xs mt-1 merriweather-regular">{error}</div>
        )}
      </div>
      <div className="h-8 w-px bg-gray-200 mx-1" />
      {/* Check in */}
      <div
        className={`py-1 flex flex-col items-start justify-center cursor-pointer ${isExtraExtraSmallSize ? 'px-2 flex-1' : 'px-4 flex-[1]'}`}
        onClick={() => setShowCalendar(!showCalendar)}
      >
                    <div className="text-black mb-0.5 text-sm">Check in</div>
        <input
          type="text"
          value={checkIn}
          readOnly
          className="w-full bg-transparent outline-none border-none text-black text-sm"
          style={{ 
            color: checkIn === 'Add dates' ? '#9CA3AF' : '#000000',
            fontSize: '0.875rem', 
            lineHeight: '1.25rem'
          }}
        />
      </div>
      <div className="h-8 w-px bg-gray-200 mx-1" />
      {/* Check out */}
      <div
        className={`py-1 flex flex-col items-start justify-center cursor-pointer ${isExtraExtraSmallSize ? 'px-2 flex-1' : 'px-4 flex-[1]'}`}
        onClick={() => setShowCalendar(!showCalendar)}
      >
        <div className="text-black mb-0.5 text-sm">Check out</div>
        <input
          type="text"
          value={checkOut}
          readOnly
          className="w-full bg-transparent outline-none border-none text-black text-sm"
          style={{ 
            color: checkOut === 'Add dates' ? '#9CA3AF' : '#000000',
            fontSize: '0.875rem', 
            lineHeight: '1.25rem'
          }}
        />
      </div>
      {/* Search Button */}
      <button 
        className="ml-2 transition-colors w-8 h-8 rounded-lg flex items-center justify-center shadow" 
        style={{ 
          marginRight: isExtraExtraSmallSize ? '2px' : '10px',
          backgroundColor: '#368a98',
          color: 'white'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2d7a87';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#368a98';
        }}
        onClick={onSearch}
      >
        <FaSearch className="text-white text-lg" />
      </button>
      {/* Calendar Dropdown */}
      {showCalendar && (
        <div ref={calendarRef} className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40 bg-white rounded-xl shadow-lg">
          <CompactCalendar
            value={{
              startDate: dateRange[0]?.startDate || null,
              endDate: dateRange[0]?.endDate || null
            }}
            onChange={({ startDate, endDate }) => {
              // Simple: just create clean local dates
              const cleanStartDate = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : null;
              const cleanEndDate = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;
              
              setDateRange([{ startDate: cleanStartDate, endDate: cleanEndDate, key: 'selection' }]);
            }}
          />
        </div>
      )}
    </div>
  );
}

// CompactCalendar for search bar (inline, supports range selection)
function CompactCalendar({ value, onChange }: {
  value: { startDate: Date | null, endDate: Date | null },
  onChange: (range: { startDate: Date | null, endDate: Date | null }) => void
}) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  
  // Initialize month/year to show the start date if it exists, otherwise today
  const initialDate = value.startDate || today;
  const [month, setMonth] = React.useState(initialDate.getMonth());
  const [year, setYear] = React.useState(initialDate.getFullYear());

  // Generate days for the current month
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

    // Always mark isStartDate if the date matches value.startDate
    if (value.startDate && date.getTime() === value.startDate.getTime()) {
      isStartDate = true;
    }
    // Always mark isEndDate if the date matches value.endDate
    if (value.endDate && date.getTime() === value.endDate.getTime()) {
      isEndDate = true;
    }

    // Range selection logic
    if (value.startDate && value.endDate) {
      isSelected = date >= value.startDate && date <= value.endDate;
    }
    // Show hover range when we have a start date but no end date yet
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



  // Handle single date clicks for better UX
  function handleDateClick(dayData: any) {
    if (!dayData.isAvailable) return;
    
    // If no start date is selected, set it as check-in
    if (!value.startDate) {
      onChange({ startDate: dayData.date, endDate: null });
    }
    // If start date is selected but no end date, set end date (check-out)
    else if (value.startDate && !value.endDate) {
      if (dayData.date >= value.startDate) {
        onChange({ startDate: value.startDate, endDate: dayData.date });
      } else {
        // If selected date is before start date, make it the new start date
        onChange({ startDate: dayData.date, endDate: null });
      }
    }
    // If both dates are selected, start a new selection
    else {
      onChange({ startDate: dayData.date, endDate: null });
    }
  }

  // Handle hover for range preview
  function handleMouseEnter(dayData: any) {
    if (!dayData.isAvailable) return;
    
    // If we have a start date but no end date, show hover preview for future dates
    if (value.startDate && !value.endDate && dayData.date > value.startDate) {
      setHoverDate(dayData.date);
    }
  }

  // Clear hover when leaving calendar
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
    <div className="bg-white border border-gray-200 rounded-lg p-3 select-none w-[320px]" onMouseLeave={handleMouseLeave}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-gray-400 hover:text-black px-2 py-1" disabled={month === today.getMonth() && year === today.getFullYear()}>&lt;</button>
        <div className="text-center text-sm font-medium text-gray-900">{new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <button onClick={nextMonth} className="text-gray-400 hover:text-black px-2 py-1">&gt;</button>
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
                ${dayData.isStartDate || dayData.isEndDate ? 'bg-[#368a98] border-[#368a98]' : dayData.isSelected ? 'bg-[#368a98]/20' : ''}`
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

function Home() {
  const [where, setWhere] = React.useState('');
  const [dateRange, setDateRange] = React.useState([
    {
      startDate: null,
      endDate: null,
      key: 'selection',
    },
  ]);
  const [showCalendar, setShowCalendar] = React.useState(false);

  const handleSearch = () => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (dateRange[0]?.startDate) {
      startDate = new Date(dateRange[0].startDate);
    }
    if (dateRange[0]?.endDate) {
      endDate = new Date(dateRange[0].endDate);
    }
    const checkin = startDate ? startDate.toISOString().slice(0, 10) : '';
    let checkout = '';
    if (endDate) {
      checkout = endDate.toISOString().slice(0, 10);
    }
    const params = [];
    if (where) params.push(`where=${encodeURIComponent(where)}`);
    if (checkin) params.push(`checkin=${checkin}`);
    if (checkout) params.push(`checkout=${checkout}`);
    window.location.href = `/listings?${params.join('&')}`;
  };

  return (
    <Navbar>
      <SearchBar
        where={where}
        setWhere={setWhere}
        dateRange={dateRange}
        setDateRange={setDateRange}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}
        onSearch={handleSearch}
      />
    </Navbar>
  );
} 