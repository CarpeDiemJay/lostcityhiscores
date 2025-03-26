"use client";

import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  /** The username typed on the homepage, so the Tracker link can carry it over. */
  username?: string;
}

/**
 * A responsive, mobile-friendly navbar with a link to Home and Tracker.
 * If 'username' is provided, we add ?username=... to the tracker link.
 */
export default function Navbar({ username }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const trackerHref = username
    ? `/tracker?username=${encodeURIComponent(username)}`
    : "/tracker";

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side: Logo / Title */}
        <div className="flex items-center">
          <img
            src="/ui/IMG_1296.png"
            alt="Home Icon"
            className="h-8 w-auto mr-2"
          />
          <span className="text-xl font-bold text-[#c6aa54]">
            Lost City Hiscores Tracker
          </span>
        </div>

        {/* Right side: Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-gray-200 hover:text-white focus:outline-none"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {menuOpen ? (
              /* X icon */
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              /* Hamburger icon */
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href={trackerHref} className="hover:underline">
            Tracker
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-700">
          <div className="px-4 py-2">
            <Link href="/" className="block py-1 hover:underline">
              Home
            </Link>
            <Link href={trackerHref} className="block py-1 hover:underline">
              Tracker
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
