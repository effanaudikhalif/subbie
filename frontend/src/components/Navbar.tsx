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
  activeTab?: 'all' | 'pending' | 'approvedBookings' | 'messages';
  setActiveTab?: (tab: 'all' | 'pending' | 'approvedBookings' | 'messages') => void;
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
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between gap-y-2 pr-4 sm:pr-8 py-6 bg-gray-50 shadow-sm backdrop-blur-md h-25">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Logo className="hover:opacity-80 transition-opacity" />
        </div>
        {/* Center: SearchBar, children, or my-listings tabs */}
        <div className="flex-1 flex justify-center items-center">
          {pathname === '/my-listings' ? (
            <div className="flex space-x-8">
              <button
                className={`pb-1 font-semibold transition-colors ${
                  activeTab === 'all'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab?.('all')}
              >
                Listings
              </button>
              <button
                className={`pb-1 font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab?.('pending')}
              >
                Requests
              </button>
              <button
                className={`pb-1 font-semibold transition-colors ${
                  activeTab === 'approvedBookings'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab?.('approvedBookings')}
              >
                Approved
              </button>
              <button
                className={`pb-1 font-semibold transition-colors ${
                  activeTab === 'messages'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab?.('messages')}
              >
                Messages
              </button>
            </div>
          ) : (
            children
          )}
        </div>
        {/* Right: Desktop nav */}
        <nav className="hidden sm:flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-gray-700 text-base font-medium max-w-full">
          {!user ? (
            <Link href="/login" className="hover:text-blue-700">Log in</Link>
          ) : (
            <>
              {/* Conditional Sublettor Button - Don't show on my-listings page or while loading */}
              {pathname !== '/my-listings' && !loading && userListings && (
                userListings.hasListings ? (
                  <Link 
                    href="/my-listings" 
                    className="hover:text-blue-700 text-gray-700 text-base font-medium"
                  >
                    Switch to Sublettor
                  </Link>
                ) : (
                  <Link 
                    href="/add-listings" 
                    className="hover:text-blue-700 text-gray-700 text-base font-medium"
                  >
                    Become a Sublettor
                  </Link>
                )
              )}
              
              <div className="relative">
                <button
                  ref={profileBtnRef}
                  onClick={() => setProfileDropdownOpen((o) => !o)}
                  className="hover:text-blue-700 focus:outline-none w-10 h-10 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center  hover:bg-gray-50 transition-colors"
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
                      className="px-4 py-2 text-left hover:bg-gray-100 rounded-t-lg block w-full cursor-pointer"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setProfileModalOpen(true);
                      }}
                    >
                      Profile
                    </button>
                    <Link
                      href="/bookings"
                      className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Bookings
                    </Link>
                    <Link
                      href="/messages"
                      className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Messages
                    </Link>
                    <Link
                      href="/wishlist"
                      className="px-4 py-2 text-left hover:bg-gray-100 rounded-b-lg block w-full cursor-pointer"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Wishlist
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 text-gray-700 focus:outline-none"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden fixed top-[100px] left-0 w-full bg-white shadow-md border-t py-4 flex flex-col gap-4 text-center text-gray-700 text-base font-medium z-50">
            {!user ? (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="hover:text-blue-700">Log in</Link>
            ) : (
              <>
                {/* Conditional Sublettor Button - Don't show on my-listings page or while loading */}
                {pathname !== '/my-listings' && !loading && userListings && (
                  userListings.hasListings ? (
                    <Link 
                      href="/my-listings" 
                      onClick={() => setMenuOpen(false)}
                      className="hover:text-blue-700 text-gray-700 text-base font-medium"
                    >
                      Switch to Sublettor
                    </Link>
                  ) : (
                    <Link 
                      href="/add-listings" 
                      onClick={() => setMenuOpen(false)}
                      className="hover:text-blue-700 text-gray-700 text-base font-medium"
                    >
                      Become a Sublettor
                    </Link>
                  )
                )}
                
                <div className="relative">
                  <button
                    ref={profileBtnRef}
                    onClick={() => setProfileDropdownOpen((o) => !o)}
                    className="hover:text-blue-700 focus:outline-none w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50 transition-colors"
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
                        className="px-4 py-2 text-left hover:bg-gray-100 rounded-t-lg block w-full cursor-pointer"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setProfileModalOpen(true);
                        }}
                      >
                        Profile
                      </button>
                      <Link
                        href="/bookings"
                        className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Bookings
                      </Link>
                      <Link
                        href="/messages"
                        className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Messages
                      </Link>
                      <Link
                        href="/wishlist"
                        className="px-4 py-2 text-left hover:bg-gray-100 rounded-b-lg block w-full cursor-pointer"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Wishlist
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
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