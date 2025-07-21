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
  guests,
  setGuests,
  onSearch,
}: {
  where: string;
  setWhere: (v: string) => void;
  dateRange: any[];
  setDateRange: (v: any[]) => void;
  showCalendar: boolean;
  setShowCalendar: (v: boolean) => void;
  guests: string;
  setGuests: (v: string) => void;
  onSearch: () => void;
}) {
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
      initAutocomplete();
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

  const checkIn = dateRange[0].startDate
    ? new Date(dateRange[0].startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Add dates';
  const checkOut = dateRange[0].endDate
    ? new Date(dateRange[0].endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Add dates';

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl shadow flex items-center px-1 py-0 relative">
      {/* Where */}
      <div className="flex-[1.3] px-4 py-1 flex flex-col items-start justify-center relative">
        <div className="merriweather-medium text-black mb-0.5 text-sm">Where</div>
        <input
          ref={inputRef}
          type="text"
          value={where}
          onChange={e => setWhere(e.target.value)}
          onFocus={() => setShowCalendar(false)}
          placeholder="Search destinations"
          className="w-full bg-transparent outline-none border-none text-gray-700 placeholder-gray-400 text-sm merriweather-regular"
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
        className="flex-[0.7] px-4 py-1 flex flex-col items-start justify-center cursor-pointer"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        <div className="merriweather-medium text-black mb-0.5 text-sm">Check in</div>
        <div className={checkIn === 'Add dates' ? 'text-gray-400 text-sm merriweather-regular' : 'text-black text-sm merriweather-regular'}>{checkIn}</div>
      </div>
      <div className="h-8 w-px bg-gray-200 mx-1" />
      {/* Check out */}
      <div
        className="flex-[0.7] px-4 py-1 flex flex-col items-start justify-center cursor-pointer"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        <div className="merriweather-medium text-black mb-0.5 text-sm">Check out</div>
        <div className={checkOut === 'Add dates' ? 'text-gray-400 text-sm merriweather-regular' : 'text-black text-sm merriweather-regular'}>{checkOut}</div>
      </div>
      <div className="h-8 w-px bg-gray-200 mx-1" />
      {/* Who */}
      <div className="flex-[0.8] px-4 py-1 flex flex-col items-start justify-center">
        <div className="merriweather-medium text-black mb-0.5 text-sm">Who</div>
        <input
          type="text"
          value={guests}
          onFocus={e => e.target.placeholder = ''}
          onBlur={e => e.target.placeholder = 'Add guests'}
          onChange={e => setGuests(e.target.value.replace(/\D/g, ''))}
          placeholder="Add guests"
          className="w-full bg-transparent outline-none border-none text-gray-700 placeholder-gray-400 text-sm merriweather-regular"
        />
      </div>
      {/* Search Button */}
      <button className="ml-2 mr-1 bg-teal-600 hover:bg-teal-700 transition-colors w-8 h-8 rounded-lg flex items-center justify-center shadow" onClick={onSearch}>
        <FaSearch className="text-white text-lg" />
      </button>
      {/* Calendar Dropdown */}
      {showCalendar && (
        <div ref={calendarRef} className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40 bg-white rounded-xl shadow-lg">
          <CompactCalendar
            value={{
              startDate: dateRange[0]?.startDate ? new Date(dateRange[0].startDate) : null,
              endDate: dateRange[0]?.endDate ? new Date(dateRange[0].endDate) : null
            }}
            onChange={({ startDate, endDate }) => {
              // Ensure minimum 1 night stay
              if (startDate && endDate) {
                const diffTime = endDate.getTime() - startDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 1) {
                  const newEndDate = new Date(startDate);
                  newEndDate.setDate(newEndDate.getDate() + 1);
                  setDateRange([{ startDate, endDate: newEndDate, key: 'selection' }]);
                } else {
                  setDateRange([{ startDate, endDate, key: 'selection' }]);
                }
              } else {
                setDateRange([{ startDate, endDate, key: 'selection' }]);
              }
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
  const [dragging, setDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<Date | null>(null);
  const [dragEnd, setDragEnd] = React.useState<Date | null>(null);
  const [month, setMonth] = React.useState(today.getMonth());
  const [year, setYear] = React.useState(today.getFullYear());

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
    if (value.startDate && value.endDate) {
      isSelected = date >= value.startDate && date <= value.endDate;
    }
    if (dragStart && dragEnd) {
      const dragMin = dragStart < dragEnd ? dragStart : dragEnd;
      const dragMax = dragStart > dragEnd ? dragStart : dragEnd;
      if (date >= dragMin && date <= dragMax) isSelected = true;
    }
    calendarDays.push({
      day,
      isAvailable,
      isSelected,
      date
    });
  }

  function handleMouseDown(dayData: any) {
    if (!dayData.isAvailable) return;
    setDragging(true);
    setDragStart(dayData.date);
    setDragEnd(dayData.date);
  }
  function handleMouseEnter(dayData: any) {
    if (!dragging || !dayData.isAvailable) return;
    setDragEnd(dayData.date);
  }
  function handleMouseUp(dayData: any) {
    if (!dragging || !dayData.isAvailable) return;
    setDragging(false);
    const min = dragStart && dragEnd && dragStart < dragEnd ? dragStart : dragEnd;
    const max = dragStart && dragEnd && dragStart > dragEnd ? dragStart : dragEnd;
    onChange({ startDate: min, endDate: max });
    setDragStart(null);
    setDragEnd(null);
  }

  // Touch events for mobile
  function handleTouchStart(dayData: any) {
    if (!dayData.isAvailable) return;
    setDragging(true);
    setDragStart(dayData.date);
    setDragEnd(dayData.date);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (target && (target as HTMLElement).dataset && (target as HTMLElement).dataset.day) {
      const day = parseInt((target as HTMLElement).dataset.day!);
      const date = new Date(year, month, day);
      if (date >= today) setDragEnd(date);
    }
  }
  function handleTouchEnd(dayData: any) {
    if (!dragging || !dayData.isAvailable) return;
    setDragging(false);
    const min = dragStart && dragEnd && dragStart < dragEnd ? dragStart : dragEnd;
    const max = dragStart && dragEnd && dragStart > dragEnd ? dragStart : dragEnd;
    onChange({ startDate: min, endDate: max });
    setDragStart(null);
    setDragEnd(null);
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
    <div className="bg-white border border-gray-200 rounded-lg p-3 select-none w-[320px]">
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
            onMouseDown={dayData && dayData.isAvailable ? () => handleMouseDown(dayData) : undefined}
            onMouseEnter={dayData && dayData.isAvailable ? () => handleMouseEnter(dayData) : undefined}
            onMouseUp={dayData && dayData.isAvailable ? () => handleMouseUp(dayData) : undefined}
            onTouchStart={dayData && dayData.isAvailable ? () => handleTouchStart(dayData) : undefined}
            onTouchMove={handleTouchMove}
            onTouchEnd={dayData && dayData.isAvailable ? () => handleTouchEnd(dayData) : undefined}
            style={{ cursor: dayData && dayData.isAvailable ? 'pointer' : 'default' }}
          >
            {dayData ? (
              <div className={
                `w-6 h-6 rounded-full flex items-center justify-center mx-auto
                ${dayData.isSelected
                  ? 'bg-blue-500 text-white border-blue-600'
                  : dayData.isAvailable
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'text-gray-400'}
                `
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
        <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded-full mr-1"></span>
        Available
        <span className="inline-block w-3 h-3 bg-blue-500 border border-blue-600 rounded-full ml-4 mr-1"></span>
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
  const [guests, setGuests] = React.useState('');

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
    if (guests) params.push(`guests=${guests}`);
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
        guests={guests}
        setGuests={setGuests}
        onSearch={handleSearch}
      />
    </Navbar>
  );
} 