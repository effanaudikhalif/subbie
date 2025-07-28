"use client";
import React, { useState, ReactNode, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import ProfileModal from "./ProfileModal";

interface NavbarProps {
  children?: ReactNode;
  fixed?: boolean;
  activeTab?: 'all' | 'bookings' | 'messages' | 'stripe';
  setActiveTab?: (tab: 'all' | 'bookings' | 'messages' | 'stripe') => void;
}

export default function Navbar({ children, fixed = true, activeTab, setActiveTab }: NavbarProps) {
  const { user, profile, userListings, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between pl-2 pr-13 py-6 bg-gray-50 shadow-sm backdrop-blur-md h-25">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Logo className="hover:opacity-80 transition-opacity" />
        </div>
        
        {/* Center: SearchBar or my-listings tabs */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center">
          {pathname === '/my-listings' ? (
            <div />
          ) : (
            <div className="pointer-events-auto w-full max-w-2xl flex justify-center">{children}</div>
          )}
        </div>
        
        {/* Right: Login button and hamburger */}
        <div className="flex items-center gap-4">
          {/* Desktop: Login button */}
          {!user && (
            <Link href="/login" className="hidden sm:block text-gray-700 text-base merriweather-medium">Log in</Link>
          )}
          
          {/* Mobile hamburger or login button */}
          <div className="block sm:hidden relative">
            {!user ? (
              <Link href="/login" className="text-gray-700 text-base merriweather-medium px-3 py-2">
                Log In
              </Link>
            ) : (
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-black focus:outline-none w-10 h-10 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-50 transition-colors"
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
                <button
                  className="w-full px-4 py-3 text-left text-black merriweather-regular hover:bg-gray-100 transition-colors duration-200"
                  onClick={() => {
                    setMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                >
                  Profile
                </button>
                <Link
                  href="/my-listings"
                  className="w-full px-4 py-3 text-left text-black merriweather-regular transition-colors duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setMenuOpen(false)}
                >
                  My Listings
                </Link>
                <Link
                  href="/messages"
                  className="w-full px-4 py-3 text-left text-black merriweather-regular transition-colors duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setMenuOpen(false)}
                >
                  Messages
                </Link>
                <Link
                  href="/wishlist"
                  className="w-full px-4 py-3 text-left text-black merriweather-regular transition-colors duration-200"
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
                className="text-black focus:outline-none w-10 h-10 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-50 transition-colors"
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
                  <button
                    className="w-full px-4 py-3 text-left text-black merriweather-regular hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                  >
                    Profile
                  </button>
                  <Link
                    href="/my-listings"
                    className="w-full px-4 py-3 text-left text-black merriweather-regular transition-colors duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    My Listings
                  </Link>
                  <Link
                    href="/messages"
                    className="w-full px-4 py-3 text-left text-black merriweather-regular transition-colors duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Messages
                  </Link>
                  <Link
                    href="/wishlist"
                    className="w-full px-4 py-3 text-left text-black merriweather-regular transition-colors duration-200"
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
      
      {/* Profile Modal */}
      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
    </>
  );
} 