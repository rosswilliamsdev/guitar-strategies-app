'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Bug, Server, Shield } from 'lucide-react';

export default function TestErrorPage() {
  const [errorType, setErrorType] = useState<string>('');

  const throwError = (type: string) => {
    setErrorType(type);
    
    switch (type) {
      case 'reference':
        throw new ReferenceError('This is a test reference error - undefined variable accessed');
      case 'type':
        throw new TypeError('This is a test type error - invalid operation');
      case 'range':
        throw new RangeError('This is a test range error - value out of range');
      case 'syntax':
        throw new Error('This is a simulated syntax error');
      case 'network':
        throw new Error('Network request failed - unable to fetch data');
      case 'auth':
        throw new Error('Authentication failed - invalid session');
      case 'permission':
        throw new Error('Permission denied - insufficient privileges');
      case 'database':
        throw new Error('Database connection failed - unable to connect to PostgreSQL');
      default:
        throw new Error('Unknown error occurred');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Error Boundary Test Page
          </h1>
          <p className="text-neutral-600">
            This page is for testing the global error boundary in development.
            Click any button below to trigger different types of errors.
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Warning:</strong> This page will intentionally crash the application
                to test error handling. Only use in development environment.
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* JavaScript Errors */}
          <div>
            <h2 className="text-lg font-medium text-neutral-900 mb-3 flex items-center gap-2">
              <Bug className="w-5 h-5" />
              JavaScript Errors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                onClick={() => throwError('reference')}
                variant="secondary"
                className="justify-start"
              >
                ReferenceError
              </Button>
              <Button
                onClick={() => throwError('type')}
                variant="secondary"
                className="justify-start"
              >
                TypeError
              </Button>
              <Button
                onClick={() => throwError('range')}
                variant="secondary"
                className="justify-start"
              >
                RangeError
              </Button>
              <Button
                onClick={() => throwError('syntax')}
                variant="secondary"
                className="justify-start"
              >
                Syntax Error
              </Button>
            </div>
          </div>

          {/* Application Errors */}
          <div>
            <h2 className="text-lg font-medium text-neutral-900 mb-3 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Application Errors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                onClick={() => throwError('network')}
                variant="secondary"
                className="justify-start"
              >
                Network Error
              </Button>
              <Button
                onClick={() => throwError('database')}
                variant="secondary"
                className="justify-start"
              >
                Database Error
              </Button>
              <Button
                onClick={() => throwError('auth')}
                variant="secondary"
                className="justify-start"
              >
                Auth Error
              </Button>
              <Button
                onClick={() => throwError('permission')}
                variant="secondary"
                className="justify-start"
              >
                Permission Error
              </Button>
            </div>
          </div>

          {/* Async Error Test */}
          <div>
            <h2 className="text-lg font-medium text-neutral-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Async Errors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                onClick={() => {
                  setTimeout(() => {
                    throw new Error('Delayed error after 1 second');
                  }, 1000);
                }}
                variant="secondary"
                className="justify-start"
              >
                Delayed Error (1s)
              </Button>
              <Button
                onClick={async () => {
                  await Promise.reject(new Error('Promise rejection error'));
                }}
                variant="secondary"
                className="justify-start"
              >
                Promise Rejection
              </Button>
              <Button
                onClick={() => {
                  // This will cause an unhandled error
                  const obj: Record<string, any> | null = null;
                  obj!.someMethod(); // Non-null assertion for intentional error
                }}
                variant="secondary"
                className="justify-start"
              >
                Null Reference
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-neutral-100 rounded-lg">
          <h3 className="font-medium text-neutral-900 mb-2">Testing Instructions:</h3>
          <ol className="text-sm text-neutral-600 space-y-1 list-decimal list-inside">
            <li>Click any error button to trigger that specific error type</li>
            <li>The global error boundary should catch the error and display a friendly error page</li>
            <li>You should see options to &quot;Try Again&quot; or &quot;Go to Homepage&quot;</li>
            <li>In development, you&apos;ll see the error message details</li>
            <li>In production, error details would be hidden from users</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}