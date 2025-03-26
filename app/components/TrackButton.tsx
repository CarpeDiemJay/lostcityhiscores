import React from 'react';
import { Popover } from '@headlessui/react';

interface TrackButtonProps {
  onClick: () => void;
  isTracking?: boolean;
}

export default function TrackButton({ onClick, isTracking = false }: TrackButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 bg-[#c6aa54]/20 text-[#c6aa54] hover:bg-[#c6aa54]/30 rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">{isTracking ? 'Tracking' : 'Track Progress'}</span>
      </button>
      <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800/90 backdrop-blur-sm text-white text-sm rounded-lg shadow-lg whitespace-nowrap border border-[#c6aa54]/30">
        {isTracking ? 'Stats are automatically updated every hour' : 'Start tracking this player\'s progress'}
      </div>
    </div>
  );
} 