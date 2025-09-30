import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

/**
 * Test endpoint for validating security headers implementation
 * Returns information about the current security configuration
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.json({
    message: 'Security headers test endpoint',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    instructions: 'Check response headers to validate security implementation',
    expectedHeaders: {
      'Content-Security-Policy': 'Should be present with comprehensive directives',
      'Strict-Transport-Security': 'Should be present in production only',
      'X-Frame-Options': 'Should be set to DENY',
      'X-Content-Type-Options': 'Should be set to nosniff',
      'X-DNS-Prefetch-Control': 'Should be set to off',
      'Referrer-Policy': 'Should be set to origin-when-cross-origin',
      'X-Download-Options': 'Should be set to noopen',
      'X-Permitted-Cross-Domain-Policies': 'Should be set to none',
      'Permissions-Policy': 'Should restrict various browser features'
    },
    securityFeatures: {
      csp: 'Comprehensive Content Security Policy to prevent XSS attacks',
      hsts: 'HTTP Strict Transport Security for HTTPS enforcement',
      clickjacking: 'X-Frame-Options prevents embedding in frames',
      mimeSniffing: 'X-Content-Type-Options prevents MIME type confusion',
      dnsPrefetch: 'Controlled DNS prefetching for privacy',
      referrerPolicy: 'Controlled referrer information leakage',
      permissionsPolicy: 'Restricted browser API access',
    }
  });

  // Note: Security headers are automatically applied by middleware
  // This endpoint just provides information for testing purposes
  
  return response;
}

/**
 * CSP violation reporting endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const violation = await request.json();
    
    // Log CSP violations for monitoring
    log.warn('CSP violation report received', {
      userAgent: request.headers.get('user-agent') || undefined,
      violation: violation['csp-report'],
      url: request.url,
      documentUri: violation['csp-report']?.['document-uri'],
      blockedUri: violation['csp-report']?.['blocked-uri'],
      violatedDirective: violation['csp-report']?.['violated-directive']
    });

    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, or a custom monitoring solution
    
    return NextResponse.json({ status: 'violation logged' });
  } catch (error) {
    log.error('Error processing CSP violation report', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });
    return NextResponse.json(
      { error: 'Failed to process violation report' },
      { status: 400 }
    );
  }
}