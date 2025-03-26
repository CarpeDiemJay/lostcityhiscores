import React from 'react';
import { Popover } from '@headlessui/react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function SearchInput({ value, onChange, onSearch, loading, disabled }: SearchInputProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 min-w-[300px]">
        <input
          type="text"
          placeholder="Enter username"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          disabled={disabled}
          className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:outline-none focus:border-[#c6aa54] disabled:opacity-50"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c6aa54] border-t-transparent"></div>
          </div>
        )}
        {disabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="group relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c6aa54] cursor-help" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="invisible group-hover:visible absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-800 text-sm text-white rounded shadow-lg">
                Stats are automatically updated every hour
              </div>
            </div>
          </div>
        )}
      </div>
      <Popover className="relative">
        <Popover.Button
          onClick={onSearch}
          disabled={loading || disabled}
          className="px-6 py-3 bg-[#c6aa54] text-black font-semibold rounded-lg hover:bg-[#d4b75f] transition-colors disabled:opacity-50"
        >
          {disabled ? "Tracked" : "Search"}
        </Popover.Button>
        <Popover.Panel className="absolute z-10 px-3 py-2 mt-2 text-sm bg-gray-800 text-white rounded shadow-lg border border-[#c6aa54]">
          {disabled ? "Player is being tracked" : "Search for a player to view their stats"}
        </Popover.Panel>
      </Popover>
    </div>
  );
} 