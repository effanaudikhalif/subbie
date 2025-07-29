"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import MobileNavbar from '../components/MobileNavbar';
import SearchBar from '../components/Searchbar';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

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
  const router = useRouter();
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const { user: authUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 750);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSearch = () => {
    const checkin = dateRange[0].startDate ? new Date(dateRange[0].startDate).toISOString().slice(0,10) : '';
    const checkout = dateRange[0].endDate ? new Date(dateRange[0].endDate).toISOString().slice(0,10) : '';
    router.push(
      `/listings?where=${encodeURIComponent(where)}&checkin=${checkin}&checkout=${checkout}`
    );
  };

  return (
    <div className="relative bg-white h-screen overflow-hidden w-full">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
      `}</style>
      <div className="relative z-10 h-full">
        {/* Desktop Navbar */}
        {!isMobile && (
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
        )}

        {/* Mobile Navbar */}
        {isMobile && (
          <MobileNavbar
            where={where}
            setWhere={setWhere}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onSearch={handleSearch}
          />
        )}
        
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            Sublet made easy
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 italic" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            <TypewriterText text="for students, by students" speed={150} />
          </p>
        </div>

        {/* Mobile Footer - Only show on mobile and when user is logged in */}
        {authUser && isMobile && (
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
    </div>
  );
}
