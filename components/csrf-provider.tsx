'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface CSRFContextType {
  token: string | null;
  headerName: string;
  refreshToken: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextType>({
  token: null,
  headerName: 'x-csrf-token',
  refreshToken: async () => {},
});

export function useCSRF() {
  return useContext(CSRFContext);
}

interface CSRFProviderProps {
  children: ReactNode;
  initialToken?: string;
}

export function CSRFProvider({ children, initialToken }: CSRFProviderProps) {
  const [token, setToken] = useState<string | null>(initialToken || null);
  const headerName = 'x-csrf-token';

  const getTokenFromMeta = (): string | null => {
    if (typeof document === 'undefined') return null;
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') || null;
  };

  const getTokenFromCookie = (): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '__Host-csrf') {
        return decodeURIComponent(value);
      }
    }
    return null;
  };

  const refreshToken = async (): Promise<void> => {
    try {
      // Try to get from meta tag first
      let newToken = getTokenFromMeta();

      // Fallback to cookie
      if (!newToken) {
        newToken = getTokenFromCookie();
      }

      // If still no token, try to fetch from API
      if (!newToken) {
        const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
        if (response.ok) {
          const data = await response.json();
          newToken = data.token;
        }
      }

      setToken(newToken);
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  };

  useEffect(() => {
    // Initialize token from various sources
    const initToken = token || getTokenFromMeta() || getTokenFromCookie();
    if (initToken) {
      setToken(initToken);
    } else {
      // Try to get token from API if not available
      refreshToken();
    }
  }, []);

  const contextValue: CSRFContextType = {
    token,
    headerName,
    refreshToken,
  };

  return (
    <CSRFContext.Provider value={contextValue}>
      {children}
    </CSRFContext.Provider>
  );
}

/**
 * Meta tags component to inject CSRF token
 */
export function CSRFMeta({ token }: { token?: string }) {
  if (!token) return null;

  return (
    <>
      <meta name="csrf-token" content={token} />
      <meta name="csrf-header" content="x-csrf-token" />
    </>
  );
}

/**
 * Hook to automatically add CSRF token to fetch requests
 */
export function useCSRFFetch() {
  const { token, headerName } = useCSRF();

  return (url: string, options: RequestInit = {}): Promise<Response> => {
    const method = options.method?.toUpperCase() || 'GET';

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && token) {
      options.headers = {
        ...options.headers,
        [headerName]: token,
      };
    }

    // Ensure credentials are included
    options.credentials = options.credentials || 'same-origin';

    return fetch(url, options);
  };
}