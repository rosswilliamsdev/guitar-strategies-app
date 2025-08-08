'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-display-xl font-display text-brand-black mb-4">
          Something went wrong
        </h1>
        <p className="text-body text-brand-gray mb-8">
          We encountered an error while loading the page.
        </p>
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
      </div>
    </div>
  );
}