import { AnalyzeRequest, AnalyzeResponse } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public requestId?: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export async function analyzeContent(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const requestId = response.headers.get('x-request-id');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(response.status, errorMessage, requestId || undefined);
    }

    const data: AnalyzeResponse = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out after 30 seconds');
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(0, 'Network error - unable to connect to server');
    }
    
    throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

export function validateTextSize(text: string, maxSizeMB: number = 2): boolean {
  const sizeInBytes = new Blob([text]).size;
  return sizeInBytes <= maxSizeMB * 1024 * 1024;
}
