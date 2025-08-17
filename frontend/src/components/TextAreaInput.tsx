'use client';

import { useState, useCallback } from 'react';
import { validateTextSize } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxSizeMB?: number;
}

export default function TextAreaInput({
  value,
  onChange,
  placeholder = "Paste your email content here...",
  disabled = false,
  maxSizeMB = 2
}: TextAreaInputProps) {
  const [error, setError] = useState<string>('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (!validateTextSize(newValue, maxSizeMB)) {
      const maxSize = formatFileSize(maxSizeMB * 1024 * 1024);
      setError(`Text is too large. Maximum size is ${maxSize}.`);
      return;
    }

    setError('');
    onChange(newValue);
  }, [onChange, maxSizeMB]);

  const handleClear = useCallback(() => {
    onChange('');
    setError('');
  }, [onChange]);

  const currentSize = new Blob([value]).size;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const percentUsed = (currentSize / maxSizeBytes) * 100;

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full h-64 p-4 border-2 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            error 
              ? 'border-red-300 bg-red-50' 
              : disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
          rows={10}
        />
        
        {value && !disabled && (
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            aria-label="Clear text"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex justify-between items-center text-sm">
        <div className={`${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || `${formatFileSize(currentSize)} / ${formatFileSize(maxSizeBytes)}`}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <span className="text-gray-500 text-xs">
            {Math.round(percentUsed)}%
          </span>
        </div>
      </div>
    </div>
  );
}
