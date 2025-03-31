import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, onSearch, loading, disabled, placeholder = "Search player..." }: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled && !loading && value.trim()) {
      onSearch();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto relative">
      <div className="absolute inset-0 -z-10 bg-blue-500/10 blur-xl rounded-full transform scale-150 opacity-50" />
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-blue-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-[#111827]/50 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl pl-11 pr-12 py-4 border border-blue-500/20 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
          ) : (
            <button
              onClick={() => {
                if (!disabled && !loading && value.trim()) {
                  onSearch();
                }
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors focus:outline-none"
              disabled={disabled}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {disabled && (
        <div className="absolute inset-0 bg-[#111827]/50 rounded-xl flex items-center justify-center">
          <span className="text-gray-400">Already tracking</span>
        </div>
      )}
    </div>
  );
} 