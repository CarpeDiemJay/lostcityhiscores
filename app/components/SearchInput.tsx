import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export default function SearchInput({ value, onChange, onSearch, isLoading }: SearchInputProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Enter username"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:outline-none focus:border-[#c6aa54]"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c6aa54] border-t-transparent"></div>
          </div>
        )}
      </div>
      <div className="relative group w-full sm:w-auto">
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-[#c6aa54] text-black font-semibold rounded-lg hover:bg-[#d4b75f] transition-colors disabled:opacity-50"
        >
          Search
        </button>
        <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800/90 backdrop-blur-sm text-white text-sm rounded-lg shadow-lg whitespace-nowrap border border-[#c6aa54]/30">
          Search for a player to view their stats
        </div>
      </div>
    </div>
  );
} 