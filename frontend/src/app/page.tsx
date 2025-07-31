"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import MobileNavbar from '../components/MobileNavbar';
import SearchBar from '../components/Searchbar';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';
import MobileFooter from '../components/MobileFooter';
import LoadingPage from '../components/LoadingPage';
import HealthCheck from '../components/HealthCheck';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
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

  // Show loading state while fetching user data
  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="relative w-full">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Amaranth:ital,wght@0,400;0,700;1,400;1,700&family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&display=swap');
        
        .stars {
          width: 1px;
          height: 1px;
          position: absolute;
          background: black;
          box-shadow: 2vw 5vh 2px black, 10vw 8vh 2px black, 15vw 15vh 1px black,
            22vw 22vh 1px black, 28vw 12vh 2px black, 32vw 32vh 1px black,
            38vw 18vh 2px black, 42vw 35vh 1px black, 48vw 25vh 2px black,
            53vw 42vh 1px black, 58vw 15vh 2px black, 63vw 38vh 1px black,
            68vw 28vh 2px black, 73vw 45vh 1px black, 78vw 32vh 2px black,
            83vw 48vh 1px black, 88vw 20vh 2px black, 93vw 52vh 1px black,
            98vw 35vh 2px black, 5vw 60vh 1px black, 12vw 65vh 2px black,
            18vw 72vh 1px black, 25vw 78vh 2px black, 30vw 85vh 1px black,
            35vw 68vh 2px black, 40vw 82vh 1px black, 45vw 92vh 2px black,
            50vw 75vh 1px black, 55vw 88vh 2px black, 60vw 95vh 1px black,
            65vw 72vh 2px black, 70vw 85vh 1px black, 75vw 78vh 2px black,
            80vw 92vh 1px black, 85vw 82vh 2px black, 90vw 88vh 1px black,
            95vw 75vh 2px black;
          animation: twinkle 8s infinite linear;
        }

        .shooting-star {
          position: absolute;
          width: 100px;
          height: 2px;
          background: linear-gradient(90deg, black, transparent);
          animation: shoot 3s infinite ease-in;
        }

        .shooting-star:nth-child(1) {
          top: 20%;
          left: -100px;
          animation-delay: 0s;
        }

        .shooting-star:nth-child(2) {
          top: 35%;
          left: -100px;
          animation-delay: 1s;
        }

        .shooting-star:nth-child(3) {
          top: 50%;
          left: -100px;
          animation-delay: 2s;
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes shoot {
          0% {
            transform: translateX(0) translateY(0) rotate(25deg);
            opacity: 1;
          }
          100% {
            transform: translateX(120vw) translateY(50vh) rotate(25deg);
            opacity: 0;
          }
        }

        .stars::after {
          content: "";
          position: absolute;
          width: 1px;
          height: 1px;
          background: black;
          box-shadow: 8vw 12vh 2px black, 16vw 18vh 1px black, 24vw 25vh 2px black,
            33vw 15vh 1px black, 41vw 28vh 2px black, 49vw 35vh 1px black,
            57vw 22vh 2px black, 65vw 42vh 1px black, 73vw 28vh 2px black,
            81vw 48vh 1px black, 89vw 32vh 2px black, 97vw 45vh 1px black,
            3vw 68vh 2px black, 11vw 75vh 1px black, 19vw 82vh 2px black,
            27vw 88vh 1px black, 35vw 72vh 2px black, 43vw 85vh 1px black,
            51vw 92vh 2px black, 59vw 78vh 1px black;
          animation: twinkle 6s infinite linear reverse;
        }
      `}</style>
      <div className="relative z-10">
        {/* Desktop Navbar */}
        {!isMobile && (
          <Navbar isHomePage={true}>
            <div></div>
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
            isHomePage={true}
          />
        )}
        


        {/* Hook Section */}
        <section className="w-full h-screen relative">
          <video 
            className="w-full h-full object-cover"
            autoPlay 
            muted 
            loop 
            playsInline
          >
            <source src="/icons/hook.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Overlay Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <h1 className="text-6xl md:text-9xl font-bold" style={{ fontSize: '6rem', marginBottom: '40px' }}>
                Your Sublet Buddy
              </h1>
              <p className="text-4xl md:text-5xl font-medium" style={{ fontSize: '3rem', marginBottom: '100px' }}>
                College Sublets
              </p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => router.push('/listings?where=Boston')}
                  className="px-6 py-3 bg-white hover:bg-gray-200 text-gray-600 hover:text-gray-800 font-medium rounded-full border border-gray-600 transition-colors" 
                >
                  Find Your Sublet
                </button>
                <button 
                  onClick={() => router.push('/add-listings')}
                  className="px-6 py-3 bg-transparent hover:bg-white hover:bg-opacity-20 text-white hover:text-white font-medium rounded-full border border-white transition-colors" 
                >
                  Sublet Your Place
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tutorial Section */}
        <section className="w-full py-20 bg-gray-50 relative overflow-hidden">
          {/* Stars background */}
          <div className="stars"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            {/* Top Section */}
                          <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                  Sublet made <span style={{ color: '#368a98' }}>easy</span> and <span style={{ color: '#368a98' }}>safe</span> for students
                </h2>
              </div>

            {/* Feature Cards */}
            <div className="flex justify-center">
              <div className="flex flex-col gap-8 w-full max-w-xl">
                {/* Card 1: Verified Students Only */}
                <div className="bg-white rounded-xl p-6 shadow-lg relative overflow-hidden border-1 border-gray-200">
                  <div className="flex items-center mb-4 relative z-10">
                    <div className="w-12 h-12 bg-white rounded-full border-1 border-gray-300 flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Verified Students Only
                    </h3>
                  </div>
                  <p className="text-gray-600 relative z-10">
                    No randos, just students. Every user is verified with .edu emails for safety.
                  </p>
                </div>

                {/* Card 2: Find Your Sublet */}
                <div className="bg-white rounded-xl p-6 shadow-lg border-1 border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Find Your Sublet
                    </h3>
                  </div>
                  <p className="text-gray-600">
                    No fees, budget-friendly, and perfect for semester breaks.
                  </p>
                </div>

                {/* Card 3: Message Your Host */}
                <div className="bg-white rounded-xl p-6 shadow-lg border-1 border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Message Your Host
                    </h3>
                  </div>
                  <p className="text-gray-600">
                    Hear from actual students like you. Message and work things out.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Temporary Health Check */}
        <section className="w-full py-10 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <HealthCheck />
          </div>
        </section>

      </div>
    </div>
  );
}
