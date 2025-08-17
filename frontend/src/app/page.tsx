'use client';

import { useState } from 'react';
import TextAreaInput from '@/components/TextAreaInput';
import FileUploader from '@/components/FileUploader';
import Results from '@/components/Results';
import { analyzeContent, ApiError } from '@/lib/api';
import { AnalyzeResponse } from '@/types/api';

export default function Home() {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter content to analyze');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await analyzeContent({
        content: content.trim(),
        type: 'email'
      });
      setResult(response);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.status) {
          case 400:
            setError(`Invalid input: ${err.detail}`);
            break;
          case 413:
            setError('Content too large. Please reduce the size and try again.');
            break;
          case 500:
            setError('Service temporarily unavailable. Please try again later.');
            break;
          default:
            setError(`Error: ${err.detail}`);
        }
      } else if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFileContent = (fileContent: string, filename: string) => {
    setContent(fileContent);
    setError('');
    setResult(null);
  };

  const handleRetry = () => {
    setError('');
    if (content.trim()) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PhishGuard AI
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered email phishing detection
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Analyze Email Content
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Email File (.eml)
                </label>
                <FileUploader
                  onFileContent={handleFileContent}
                  disabled={isLoading}
                />
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Paste Email Content
                </label>
                <TextAreaInput
                  value={content}
                  onChange={setContent}
                  disabled={isLoading}
                  placeholder="Paste your email content here..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={isLoading || !content.trim()}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isLoading || !content.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    'Analyze Content'
                  )}
                </button>

                {content && !isLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setContent('');
                      setResult(null);
                      setError('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Analysis Failed
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {error}
                  </p>
                  {(error.includes('Service temporarily unavailable') || 
                    error.includes('Network error') || 
                    error.includes('Request timeout')) && (
                    <button
                      onClick={handleRetry}
                      className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <Results result={result} />
          )}
        </div>
      </div>
    </div>
  );
}
