"use client";
import React, { useState, ReactNode, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

interface NavbarProps {
  children?: ReactNode;
  fixed?: boolean;
}

export default function Navbar({ children, fixed = true }: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between gap-y-2 px-4 sm:px-8 py-4 bg-white shadow-sm backdrop-blur-md">
        {/* Left: Logo */}
        <div className="text-2xl font-bold tracking-tight text-gray-900 pl-4 pt-2 pb-2">
          <Link href="/">
            <span className="font-extrabold text-2xl text-black cursor-pointer hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 rounded transition">Subly</span>
          </Link>
        </div>
        {/* Center: SearchBar or children */}
        <div className="flex-1 flex justify-center items-center">
          {children}
        </div>
        {/* Right: Desktop nav */}
        <nav className="hidden sm:flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-gray-700 text-base font-medium max-w-full pr-4 pt-2 pb-2">
          {!user ? (
            <Link href="/login" className="hover:text-blue-700">Log in</Link>
          ) : (
            <>
              <Link href="/become-host" className="hover:text-blue-700">Become a Sublettor</Link>
              <div className="relative">
                <button
                  ref={profileBtnRef}
                  onClick={() => setProfileDropdownOpen((o) => !o)}
                  className="hover:text-blue-700 focus:outline-none px-2 py-1 rounded flex items-center gap-1"
                  aria-haspopup="true"
                  aria-expanded={profileDropdownOpen}
                >
                  Profile
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {profileDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 flex flex-col"
                  >
                    <Link
                      href="/profile"
                      className="px-4 py-2 text-left hover:bg-gray-100 rounded-t-lg block w-full cursor-pointer"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      View Profile
                    </Link>
                    <Link
                      href="/my-listings"
                      className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Listings
                    </Link>
                    <Link
                      href="/bookings"
                      className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Bookings
                    </Link>
                    <Link
                      href="/messages"
                      className="px-4 py-2 text-left hover:bg-gray-100 rounded-b-lg block w-full cursor-pointer"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Messages
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
          <div className="sm:hidden absolute top-full left-0 w-full bg-white shadow-md border-t py-4 flex flex-col gap-4 text-center text-gray-700 text-base font-medium">
            {!user ? (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="hover:text-blue-700">Log in</Link>
            ) : (
              <>
                <Link href="/become-host" onClick={() => setMenuOpen(false)} className="hover:text-blue-700">Become a Sublettor</Link>
                <div className="relative">
                  <button
                    ref={profileBtnRef}
                    onClick={() => setProfileDropdownOpen((o) => !o)}
                    className="hover:text-blue-700 focus:outline-none px-2 py-1 rounded flex items-center gap-1"
                    aria-haspopup="true"
                    aria-expanded={profileDropdownOpen}
                  >
                    Profile
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {profileDropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 flex flex-col"
                    >
                      <Link
                        href="/profile"
                        className="px-4 py-2 text-left hover:bg-gray-100 rounded-t-lg block w-full cursor-pointer"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        View Profile
                      </Link>
                      <Link
                        href="/my-listings"
                        className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Listings
                      </Link>
                      <Link
                        href="/bookings"
                        className="px-4 py-2 text-left hover:bg-gray-100 block w-full cursor-pointer"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Bookings
                      </Link>
                      <Link
                        href="/messages"
                        className="px-4 py-2 text-left hover:bg-gray-100 rounded-b-lg block w-full cursor-pointer"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Messages
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>
    </>
  );
} 