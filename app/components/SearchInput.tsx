import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

export default function SearchInput({ value, onChange, onSearch, loading }: SearchInputProps) {
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
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c6aa54] border-t-transparent"></div>
          </div>
        )}
      </div>
      <button
        onClick={onSearch}
        disabled={loading}
        className="w-full sm:w-auto px-6 py-3 bg-[#c6aa54] text-black font-semibold rounded-lg hover:bg-[#d4b75f] transition-colors disabled:opacity-50"
      >
        Search
      </button>
    </div>
  );
} 