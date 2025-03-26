import React from 'react';
import { Popover } from '@headlessui/react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

export default function SearchInput({ value, onChange, onSearch, loading }: SearchInputProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 min-w-[300px]">
        <input
          type="text"
          placeholder="Enter username"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:outline-none focus:border-[#c6aa54]"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c6aa54] border-t-transparent"></div>
          </div>
        )}
      </div>
      <Popover className="relative">
        <Popover.Button
          onClick={onSearch}
          disabled={loading}
          className="px-6 py-3 bg-[#c6aa54] text-black font-semibold rounded-lg hover:bg-[#d4b75f] transition-colors disabled:opacity-50"
        >
          Search
        </Popover.Button>
        <Popover.Panel className="absolute z-10 px-3 py-2 mt-2 text-sm bg-gray-800 text-white rounded shadow-lg border border-[#c6aa54]">
          Search for a player to view their stats
        </Popover.Panel>
      </Popover>
    </div>
  );
} 