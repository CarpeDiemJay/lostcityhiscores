'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <header className="bg-[#0A0B0F] border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14">
            <button
              type="button"
              className="md:hidden text-gray-500 hover:text-blue-400 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="sr-only">Open menu</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
    </>
  );
} 