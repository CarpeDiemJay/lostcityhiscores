"use client";

import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  username?: string;
}

/**
 * A simple shared navbar that can show links to "Home" and "Tracker."
 * Optionally receives a "username" prop to include in the tracker link.
 */
export default function Navbar({ username }: NavbarProps) {
  // If you want the navbar to have its own local states or logic, you can do so.
  // For now, we just show some links.

  // We'll build a link to the tracker, including ?username=...
  const trackerHref = username
    ? `/tracker?username=${encodeURIComponent(username)}`
    : "/tracker";

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left side: Logo / Title */}
        <div className="flex items-center gap-2">
          <img
            src="/ui/IMG_1296.png"
            alt="Home Icon"
            className="h-8 w-auto"
          />
          <span className="text-xl font-bold text-[#c6aa54]">
            Lost City Hiscores Tracker
          </span>
        </div>

        {/* Right side: Nav links */}
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href={trackerHref} className="hover:underline">
            Tracker
          </Link>
        </div>
      </div>
    </nav>
  );
}
