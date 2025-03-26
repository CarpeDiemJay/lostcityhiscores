import React from 'react';
import { Popover } from '@headlessui/react';

interface TrackButtonProps {
  onClick: () => void;
}

export default function TrackButton({ onClick }: TrackButtonProps) {
  return (
    <Popover className="relative">
      <Popover.Button
        onClick={onClick}
        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-2 transition-colors group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3.5a6.5 6.5 0 0 0-6.5 6.5c0 3.59 2.91 6.5 6.5 6.5s6.5-2.91 6.5-6.5c0-3.59-2.91-6.5-6.5-6.5zm0 12a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm.5-8.5h-1v4h3v-1h-2v-3z"/>
        </svg>
        Track
      </Popover.Button>
      <Popover.Panel className="absolute z-10 px-3 py-2 mt-2 text-sm bg-gray-800 text-white rounded shadow-lg border border-green-600 whitespace-nowrap">
        Click to track player progress. Stats update every hour.
      </Popover.Panel>
    </Popover>
  );
} 