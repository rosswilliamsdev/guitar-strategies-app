/**
 * API Client with CSRF Protection
 *
 * Provides a secure fetch wrapper that automatically includes CSRF tokens
 * and handles common API patterns.
 */

import { toast } from 'react-hot-toast';

// Get CSRF token from meta tag or cookie
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  // First try meta tag
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (metaToken) {
    return metaToken;
  }

  // Fallback to cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '__Host-csrf' || name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Enhanced fetch that includes CSRF token automatically
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // Build headers
  const headers: HeadersInit = {
    ...options.headers,
  };

  // Add CSRF token for state-changing requests
  if (needsCSRF) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      (headers as any)['x-csrf-token'] = csrfToken;
    } else {
      console.warn('No CSRF token found for protected request');
    }
  }

  // Add content-type for JSON if not specified
  if (options.body && typeof options.body === 'string' && !(headers as any)['content-type']) {
    (headers as any)['content-type'] = 'application/json';
  }

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Include cookies
  });

  // Handle CSRF errors specifically
  if (response.status === 403) {
    const text = await response.text();
    if (text.includes('CSRF')) {
      // CSRF token might be expired, try to refresh
      window.location.reload();
      throw new Error('Security token expired. Please refresh the page.');
    }
  }

  return response;
}

/**
 * Typed API client for common operations
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await apiFetch(`${this.baseUrl}${path}`, {
      ...options,
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await apiFetch(`${this.baseUrl}${path}`, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
    }

    return response.json();
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await apiFetch(`${this.baseUrl}${path}`, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
    }

    return response.json();
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await apiFetch(`${this.baseUrl}${path}`, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
    }

    return response.json();
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await apiFetch(`${this.baseUrl}${path}`, {
      ...options,
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
    }

    // DELETE might return empty response
    const text = await response.text();
    return text ? JSON.parse(text) : null as T;
  }

  /**
   * Upload files with CSRF protection
   */
  async upload<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
    // Add CSRF token to form data
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      formData.append('_csrf', csrfToken);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: {
        ...options?.headers,
        // Don't set content-type, let browser set it with boundary for multipart
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
    }

    return response.json();
  }

  /**
   * Parse error response
   */
  private async parseError(response: Response): Promise<string> {
    try {
      const data = await response.json();
      return data.error || data.message || response.statusText;
    } catch {
      return response.statusText;
    }
  }
}

// Default API client instance
export const api = new ApiClient('/api');

/**
 * React Hook for API calls with loading state
 */
export function useApi<T>() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const execute = React.useCallback(async (
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

/**
 * Fetch with automatic retry and CSRF handling
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await apiFetch(url, options);

      // If CSRF error, refresh token and retry once
      if (response.status === 403 && i === 0) {
        const text = await response.text();
        if (text.includes('CSRF')) {
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx except 403)
      if (error instanceof Response && error.status >= 400 && error.status < 500 && error.status !== 403) {
        throw error;
      }

      // Wait before retry with exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// Make React import conditional for Next.js
import * as React from 'react';