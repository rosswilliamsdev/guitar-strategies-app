'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function LoadingIndicator() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Show loading indicator briefly on route change
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    // Initial load detection
    const handleLoad = () => setIsLoading(false);

    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      setIsLoading(true);
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-turquoise-300 via-turquoise-500 to-turquoise-600 z-[100] overflow-hidden">
      {/* Shimmer overlay - only shows when loading */}
      {isLoading && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      )}
    </div>
  );
}