"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/Searchbar';
import Background from '../components/Background';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabaseClient';

const TypewriterText = ({ text, speed = 100 }: { text: string; speed?: number }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      // Reset after a pause when typing is complete
      const resetTimer = setTimeout(() => {
        setDisplayText('');
        setCurrentIndex(0);
      }, 2000); // Wait 2 seconds before restarting
      return () => clearTimeout(resetTimer);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className="inline-block">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

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
    <div className="relative bg-white h-screen overflow-hidden w-full">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
      `}</style>
      <Background />
      <div className="relative z-10 h-full">
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
        
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            Sublet made easy
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 italic" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            <TypewriterText text="for students, by students" speed={150} />
          </p>
        </div>
      </div>
    </div>
  );
}
