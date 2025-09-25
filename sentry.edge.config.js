// This file configures the initialization of Sentry for edge runtime components.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for more control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Edge runtime specific configuration
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    return event;
  },

  initialScope: {
    tags: {
      component: 'edge',
      environment: process.env.NODE_ENV,
    },
  },
});