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
          <div className="sm:hidden">
            {!user ? (
              <Link href="/login" className="text-gray-700 text-base merriweather-medium px-3 py-2">
                Log In
              </Link>
            ) : (
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="#000000" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
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
                  className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] py-2 flex flex-col"
                >
                  <button
                    className="px-4 py-2 text-left hover:bg-gray-100 rounded-t-lg block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                  >
                    Profile
                  </button>
                  <Link
                    href="/my-listings"
                    className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    My Listings
                  </Link>
                  <Link
                    href="/messages"
                    className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Messages
                  </Link>
                  <Link
                    href="/wishlist"
                    className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Wishlist
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile dropdown */}
        {menuOpen && user && (
          <div className="sm:hidden fixed top-[100px] left-0 w-full bg-white shadow-md border-t py-4 flex flex-col gap-4 text-center text-black text-base merriweather-medium z-50">
            <div className="relative">
              <button
                ref={profileBtnRef}
                onClick={() => setProfileDropdownOpen((o) => !o)}
                className="focus:outline-none w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50 transition-colors"
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
                  className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] py-2 flex flex-col"
                >
                  <button
                    className="px-4 py-2 text-left hover:bg-gray-100 rounded-t-lg block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                  >
                    Profile
                  </button>
                  <Link
                    href="/my-listings"
                    className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    My Listings
                  </Link>
                  <Link
                    href="/messages"
                    className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Messages
                  </Link>
                  <Link
                    href="/wishlist"
                    className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer text-black merriweather-regular"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Wishlist
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      
      {/* Profile Modal */}
      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
    </>
  );
} 