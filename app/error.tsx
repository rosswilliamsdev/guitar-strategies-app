'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console and potentially to an error tracking service
    console.error('Application error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // In production, send to error tracking service
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error);
    // }
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md border border-neutral-200 p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Error Content */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-neutral-600 mb-2">
            We encountered an error while loading this page. Please try again or return to the homepage.
          </p>
          
          {/* Error Details (development only) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mt-4 p-3 bg-neutral-100 rounded-lg text-left">
              <p className="text-sm font-mono text-neutral-700 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-neutral-500 mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              className="inline-flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link href="/">
              <Button
                variant="secondary"
                className="inline-flex items-center justify-center w-full sm:w-auto"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </Link>
          </div>
        </div>

        {/* Support Link */}
        <div className="mt-6 pt-4 border-t border-neutral-200">
          <p className="text-center text-sm text-neutral-600">
            If this problem persists, please contact{' '}
            <a 
              href="mailto:support@guitarstrategies.com" 
              className="text-primary hover:text-turquoise-600 font-medium transition-colors"
            >
              support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}