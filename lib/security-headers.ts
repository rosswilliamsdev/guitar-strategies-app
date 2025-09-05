/**
 * Security Headers Configuration
 * 
 * Implements comprehensive security headers for production deployment
 * including CSP, HSTS, and other critical security protections.
 */

import { NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  isDevelopment: boolean;
  domain?: string;
  allowedImageDomains?: string[];
  allowedScriptDomains?: string[];
  enableHSTS?: boolean;
  maxAge?: number;
}

/**
 * Generate Content Security Policy (CSP) header value
 */
export function generateCSP(config: SecurityHeadersConfig): string {
  const { isDevelopment, allowedImageDomains = [], allowedScriptDomains = [] } = config;

  // Base CSP directives
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Next.js development
      "'unsafe-inline'", // Required for inline scripts in development
      ...(isDevelopment ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
      ...allowedScriptDomains,
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and CSS-in-JS
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:', // For base64 images
      'blob:', // For blob URLs (file uploads)
      'https://vercel.blob.store', // Vercel Blob storage
      ...allowedImageDomains,
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    'connect-src': [
      "'self'",
      ...(isDevelopment ? ['ws:', 'wss:'] : []), // WebSocket for dev server
      'https://api.resend.com', // Email service
      'https://vercel.blob.store', // File storage
    ],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", 'blob:', 'data:'],
    'worker-src': ["'self'", 'blob:'],
  };

  // Convert directives to CSP string
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig
): NextResponse {
  const { isDevelopment, enableHSTS = true, maxAge = 31536000 } = config;

  // Content Security Policy
  response.headers.set('Content-Security-Policy', generateCSP(config));

  // HTTP Strict Transport Security (HSTS) - Only in production
  if (enableHSTS && !isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      `max-age=${maxAge}; includeSubDomains; preload`
    );
  }

  // X-Frame-Options (prevent clickjacking)
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options (prevent MIME type sniffing)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-DNS-Prefetch-Control (control DNS prefetching)
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  // Referrer-Policy (control referrer information)
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  // X-Download-Options (prevent IE from executing downloads)
  response.headers.set('X-Download-Options', 'noopen');

  // X-Permitted-Cross-Domain-Policies (restrict Adobe Flash/PDF cross-domain access)
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Permissions-Policy (control browser features)
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
      'payment=()',
      'usb=()',
    ].join(', ')
  );

  return response;
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityHeadersConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  domain: process.env.NEXTAUTH_URL,
  allowedImageDomains: [
    'https://avatars.githubusercontent.com', // GitHub avatars
    'https://lh3.googleusercontent.com', // Google avatars
  ],
  allowedScriptDomains: [
    'https://va.vercel-scripts.com', // Vercel Analytics
  ],
  enableHSTS: process.env.NODE_ENV === 'production',
  maxAge: 31536000, // 1 year
};

/**
 * Validate CSP violations (for CSP reporting)
 */
export function validateCSPViolation(violation: any): boolean {
  // Basic validation of CSP violation reports
  return (
    violation &&
    typeof violation === 'object' &&
    violation['csp-report'] &&
    violation['csp-report']['document-uri']
  );
}

/**
 * Security headers middleware helper
 */
export function createSecurityHeadersMiddleware(config: SecurityHeadersConfig = defaultSecurityConfig) {
  return function addSecurityHeaders(response: NextResponse): NextResponse {
    return applySecurityHeaders(response, config);
  };
}