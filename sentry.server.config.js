// This file configures the initialization of Sentry on the server side.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for more control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Capture unhandled promise rejections
  captureUnhandledRejections: true,

  // Additional options for server-side
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event (dev):', event.exception?.values?.[0]?.value);
      return null; // Don't send to Sentry in development
    }

    // Filter out specific errors
    if (event.exception) {
      const error = event.exception.values?.[0];

      // Filter out database connection timeouts (handled gracefully)
      if (error?.value?.includes('connection timeout')) {
        return null;
      }

      // Filter out validation errors (these are handled by the app)
      if (error?.value?.includes('Validation failed')) {
        return null;
      }
    }

    return event;
  },

  // Add context to all events
  initialScope: {
    tags: {
      component: 'server',
      environment: process.env.NODE_ENV,
    },
  },
});