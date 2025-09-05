'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { log } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global error occurred:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // In production, you would send this to an error tracking service like Sentry
    // Example:
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error);
    // }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-neutral-200 p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Error Content */}
            <div className="text-center">
              <h1 className="text-3xl font-semibold text-neutral-900 mb-3">
                Something went wrong
              </h1>
              <p className="text-neutral-600 mb-2">
                We're sorry, but an unexpected error has occurred. Our team has been notified
                and is working to fix the issue.
              </p>
              
              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && error.message && (
                <div className="mt-6 p-4 bg-neutral-100 rounded-lg text-left">
                  <p className="text-sm font-mono text-neutral-700 break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-neutral-500 mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-turquoise-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
                <a
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-neutral-700 font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </a>
              </div>
            </div>

            {/* Contact Support */}
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <p className="text-center text-sm text-neutral-600">
                If this problem persists, please contact{' '}
                <a 
                  href="mailto:support@guitarstrategies.com" 
                  className="text-primary hover:text-turquoise-600 font-medium"
                >
                  support@guitarstrategies.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Minimal styles for the error page */}
        <style jsx global>{`
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .bg-neutral-50 { background-color: #fafafa; }
          .bg-white { background-color: #ffffff; }
          .bg-red-50 { background-color: #fef2f2; }
          .bg-neutral-100 { background-color: #f5f5f5; }
          .text-neutral-900 { color: #171717; }
          .text-neutral-700 { color: #404040; }
          .text-neutral-600 { color: #525252; }
          .text-neutral-500 { color: #737373; }
          .text-red-500 { color: #ef4444; }
          .text-primary { color: #14b8b3; }
          .text-white { color: #ffffff; }
          .bg-primary { background-color: #14b8b3; }
          .border-neutral-200 { border-color: #e5e5e5; }
          .border-neutral-300 { border-color: #d4d4d4; }
          .hover\\:bg-turquoise-600:hover { background-color: #0d9289; }
          .hover\\:bg-neutral-50:hover { background-color: #fafafa; }
          .hover\\:text-turquoise-600:hover { color: #0d9289; }
          .focus-visible\\:ring-primary:focus-visible { box-shadow: 0 0 0 2px #14b8b3; }
          .min-h-screen { min-height: 100vh; }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .p-4 { padding: 1rem; }
          .p-8 { padding: 2rem; }
          .max-w-2xl { max-width: 42rem; }
          .w-full { width: 100%; }
          .rounded-lg { border-radius: 0.5rem; }
          .rounded-full { border-radius: 9999px; }
          .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
          .border { border-width: 1px; }
          .border-t { border-top-width: 1px; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-3 { margin-bottom: 0.75rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-6 { margin-top: 1.5rem; }
          .mt-8 { margin-top: 2rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mr-2 { margin-right: 0.5rem; }
          .pt-6 { padding-top: 1.5rem; }
          .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
          .w-20 { width: 5rem; }
          .h-20 { height: 5rem; }
          .w-10 { width: 2.5rem; }
          .h-10 { height: 2.5rem; }
          .w-4 { width: 1rem; }
          .h-4 { height: 1rem; }
          .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .font-mono { font-family: monospace; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .inline-flex { display: inline-flex; }
          .flex-col { flex-direction: column; }
          .gap-3 { gap: 0.75rem; }
          .transition-colors { transition: color 150ms, background-color 150ms; }
          .break-all { word-break: break-all; }
          @media (min-width: 640px) {
            .sm\\:flex-row { flex-direction: row; }
          }
        `}</style>
      </body>
    </html>
  );
}