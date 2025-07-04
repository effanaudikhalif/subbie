"use client";
import React, { useState, ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

interface NavbarProps {
  children?: ReactNode;
  fixed?: boolean;
}

export default function Navbar({ children, fixed = true }: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between gap-y-2 px-4 sm:px-8 py-4 bg-white shadow-sm backdrop-blur-md">
        {/* Left: Logo */}
        <div className="text-2xl font-bold tracking-tight text-gray-900 pl-4 pt-2 pb-2">
          <Link href="/">
            <span className="font-extrabold text-2xl text-black cursor-pointer hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 rounded transition">Subletz</span>
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
            <Link href="/profile" className="hover:text-blue-700">Profile</Link>
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
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="hover:text-blue-700">Profile</Link>
            )}
          </div>
        )}
      </header>
    </>
  );
} 