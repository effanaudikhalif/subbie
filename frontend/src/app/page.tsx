"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/Searchbar';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabaseClient';

export default function Page() {
  const [where, setWhere] = useState('');
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: 'selection',
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState('');
  const router = useRouter();
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
  }, []);

  const handleSearch = () => {
    const checkin = dateRange[0].startDate ? new Date(dateRange[0].startDate).toISOString().slice(0,10) : '';
    const checkout = dateRange[0].endDate ? new Date(dateRange[0].endDate).toISOString().slice(0,10) : '';
    router.push(
      `/listings?where=${encodeURIComponent(where)}&checkin=${checkin}&checkout=${checkout}&guests=${guests}`
    );
  };

  return (
    <div className="bg-white min-h-screen">
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
      {/* Optionally, add a hero section or other content here */}
    </div>
  );
}
