'use client';

import { useState, useCallback } from 'react';
import { validateFileSize } from '@/lib/api';
import { formatFileSize, extractTextFromEmlFile } from '@/lib/utils';

interface FileUploaderProps {
  onFileContent: (content: string, filename: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

export default function FileUploader({
  onFileContent,
  disabled = false,
  maxSizeMB = 10
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const processFile = useCallback(async (file: File) => {
    setError('');
    setLoading(true);

    try {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.eml')) {
        throw new Error('Please select a .eml file');
      }

      // Validate file size
      if (!validateFileSize(file, maxSizeMB)) {
        throw new Error(`File is too large. Maximum size is ${formatFileSize(maxSizeMB * 1024 * 1024)}`);
      }

      // Extract text content
      const content = await extractTextFromEmlFile(file);
      
      if (!content.trim()) {
        throw new Error('File appears to be empty');
      }

      onFileContent(content, file.name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onFileContent, maxSizeMB]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
      e.dataTransfer.clearData();
    }
  }, [disabled, processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [disabled, processFile]);

  return (
    <div className="space-y-2">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : error
            ? 'border-red-300 bg-red-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".eml"
          onChange={handleFileSelect}
          disabled={disabled || loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Upload .eml file"
        />
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Processing file...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className={`text-lg font-medium ${error ? 'text-red-600' : 'text-gray-900'}`}>
                  {error || 'Drop your .eml file here'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse (max {formatFileSize(maxSizeMB * 1024 * 1024)})
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Accepts .eml email files up to {formatFileSize(maxSizeMB * 1024 * 1024)}
      </p>
    </div>
  );
}
