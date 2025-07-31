"use client";
import React, { useState, ReactNode, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import SearchBar from "./Searchbar";

interface NavbarProps {
  children?: ReactNode;
  fixed?: boolean;
  activeTab?: 'all' | 'bookings' | 'messages' | 'stripe';
  setActiveTab?: (tab: 'all' | 'bookings' | 'messages' | 'stripe') => void;
  isHomePage?: boolean;
}

export default function Navbar({ children, fixed = true, activeTab, setActiveTab, isHomePage = false }: NavbarProps) {
  const { user, profile, userListings, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isExtraExtraSmallSize, setIsExtraExtraSmallSize] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search state
  const [where, setWhere] = useState("");
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);

  // Handle search
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
    router.push(`/listings?${params.join('&')}`);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        profileDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileDropdownOpen]);

  // Detect extra extra small size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsExtraExtraSmallSize(width >= 750 && width < 925);
      setIsDesktop(width >= 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between pl-2 pr-13 py-6 bg-gray-50 shadow-sm backdrop-blur-md h-25">
        {/* Left: Logo */}
        <div className={`flex items-center  ml-10`}>
          <Logo className="hover:opacity-80 transition-opacity" />
        </div>
        
        {/* Center: SearchBar or my-listings tabs */}
        {isExtraExtraSmallSize ? (
          <div className="flex-1 flex justify-center">
            {pathname === '/my-listings' ? (
              <div />
            ) : (
              <div className="pointer-events-auto max-w-sm">
                {children}
              </div>
            )}
          </div>
        ) : (
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center">
            {pathname === '/my-listings' ? (
              <div />
            ) : (
              <div className="pointer-events-auto w-full flex justify-center max-w-2xl">
                {children || (
                  // Desktop search bar using SearchBar component
                  <div className="w-full max-w-lg">
                    <SearchBar
                      where={where}
                      setWhere={setWhere}
                      dateRange={dateRange}
                      setDateRange={setDateRange}
                      showCalendar={showCalendar}
                      setShowCalendar={setShowCalendar}
                      onSearch={handleSearch}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Right: Login button and hamburger */}
        <div className="flex items-center gap-4">
          {/* Desktop: Login and Sign up buttons */}
          {!user && isDesktop && (
            <div className="flex items-center gap-3" style={{ zIndex: 50, position: 'relative' }}>
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
            </div>
          )}
          
          {/* Mobile hamburger or login button */}
          <div className="block sm:hidden relative">
            {!user && !isDesktop ? (
              <Link href="/login" className="text-gray-700 text-base px-3 py-2">
                Log In
              </Link>
            ) : user && (
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-black focus:outline-none w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
                aria-label="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            {/* Mobile dropdown - Small rectangle on right */}
            {menuOpen && user && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] flex flex-col overflow-hidden">
                <Link
                  href="/profile"
                  className="w-full px-4 py-3 text-left text-black transition-colors duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/my-listings"
                  className="w-full px-4 py-3 text-left text-black transition-colors duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setMenuOpen(false)}
                >
                  My Listings
                </Link>
                <Link
                  href="/messages"
                  className="w-full px-4 py-3 text-left text-black transition-colors duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setMenuOpen(false)}
                >
                  Messages
                </Link>
                <Link
                  href="/wishlist"
                  className="w-full px-4 py-3 text-left text-black transition-colors duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setMenuOpen(false)}
                >
                  Wishlist
                </Link>
              </div>
            )}
          </div>
          
          {/* Desktop: Profile dropdown */}
          {user && (
            <div className="hidden sm:block relative">
              <button
                ref={profileBtnRef}
                onClick={() => setProfileDropdownOpen((o) => !o)}
                className="text-black focus:outline-none w-10 h-10 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
                aria-haspopup="true"
                aria-expanded={profileDropdownOpen}
                aria-label="Profile menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {profileDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] flex flex-col overflow-hidden"
                >
                  <Link
                    href="/profile"
                    className="w-full px-4 py-3 text-left text-black hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/my-listings"
                    className="w-full px-4 py-3 text-left text-black transition-colors duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    My Listings
                  </Link>
                  <Link
                    href="/messages"
                    className="w-full px-4 py-3 text-left text-black transition-colors duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Messages
                  </Link>
                  <Link
                    href="/wishlist"
                    className="w-full px-4 py-3 text-left text-black transition-colors duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Wishlist
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      
    </>
  );
} 