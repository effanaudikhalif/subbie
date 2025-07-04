"use client";
import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import Navbar from './Navbar';

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
  const checkIn = dateRange[0].startDate
    ? new Date(dateRange[0].startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Add dates';
  const checkOut = dateRange[0].endDate
    ? new Date(dateRange[0].endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Add dates';

  return (
    <div className="w-full max-w-2xl bg-white rounded-full shadow flex items-center px-1 py-0 relative">
      {/* Where */}
      <div className="flex-[1.3] px-4 py-1 flex flex-col items-start justify-center">
        <div className="font-medium text-black mb-0.5 text-sm">Where</div>
        <input
          type="text"
          value={where}
          onChange={e => setWhere(e.target.value)}
          placeholder="Search destinations"
          className="w-full bg-transparent outline-none border-none text-gray-700 placeholder-gray-400 text-sm"
        />
      </div>
      <div className="h-8 w-px bg-gray-200 mx-1" />
      {/* Check in */}
      <div
        className="flex-[0.7] px-4 py-1 flex flex-col items-start justify-center cursor-pointer"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        <div className="font-medium text-black mb-0.5 text-sm">Check in</div>
        <div className={checkIn === 'Add dates' ? 'text-gray-400 text-sm' : 'text-black text-sm'}>{checkIn}</div>
      </div>
      <div className="h-8 w-px bg-gray-200 mx-1" />
      {/* Check out */}
      <div
        className="flex-[0.7] px-4 py-1 flex flex-col items-start justify-center cursor-pointer"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        <div className="font-medium text-black mb-0.5 text-sm">Check out</div>
        <div className={checkOut === 'Add dates' ? 'text-gray-400 text-sm' : 'text-black text-sm'}>{checkOut}</div>
      </div>
      <div className="h-8 w-px bg-gray-200 mx-1" />
      {/* Who */}
      <div className="flex-[1.3] px-4 py-1 flex flex-col items-start justify-center">
        <div className="font-medium text-black mb-0.5 text-sm">Who</div>
        <input
          type="text"
          value={guests}
          onFocus={e => e.target.placeholder = ''}
          onBlur={e => e.target.placeholder = 'Add guests'}
          onChange={e => setGuests(e.target.value.replace(/\D/g, ''))}
          placeholder="Add guests"
          className="w-full bg-transparent outline-none border-none text-gray-700 placeholder-gray-400 text-sm"
        />
      </div>
      {/* Search Button */}
      <button className="ml-2 mr-1 bg-[#FF385C] hover:bg-[#e03150] transition-colors w-8 h-8 rounded-full flex items-center justify-center shadow" onClick={onSearch}>
        <FaSearch className="text-white text-lg" />
      </button>
      {/* Calendar Dropdown */}
      {showCalendar && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-white rounded-xl shadow-lg">
          <DateRange
            ranges={dateRange}
            onChange={(item: any) => setDateRange([item.selection])}
            moveRangeOnFirstSelection={false}
            editableDateInputs={true}
            minDate={new Date()}
            rangeColors={["#2563eb"]}
          />
        </div>
      )}
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
    // Implement search logic here
    console.log('Searching for:', where, dateRange, guests);
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