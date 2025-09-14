'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoadingIndicator() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Start loading when navigation begins
    const handleStart = () => setIsLoading(true);
    // Stop loading when navigation completes
    const handleComplete = () => setIsLoading(false);

    // Listen for browser navigation events
    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = (...args) => {
      setIsLoading(true);
      return originalPush.apply(router, args).finally(() => {
        setTimeout(() => setIsLoading(false), 100);
      });
    };

    router.replace = (...args) => {
      setIsLoading(true);
      return originalReplace.apply(router, args).finally(() => {
        setTimeout(() => setIsLoading(false), 100);
      });
    };

    // Initial load detection
    const handleLoad = () => setIsLoading(false);
    if (document.readyState === 'loading') {
      setIsLoading(true);
      window.addEventListener('load', handleLoad);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router]);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-turquoise-300 via-turquoise-500 to-turquoise-600 z-50 overflow-hidden">
      {/* Shimmer overlay - only shows when loading */}
      {isLoading && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      )}
    </div>
  );
}