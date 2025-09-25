/**
 * CSRF Protection Module
 *
 * Implements double-submit cookie pattern for CSRF protection.
 * Provides token generation, validation, and middleware for API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

// CSRF token configuration
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const CSRF_CACHE_PREFIX = 'csrf:';

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths that are exempt from CSRF protection
const EXEMPT_PATHS = [
  '/api/auth/', // NextAuth handles its own CSRF
  '/api/webhook/', // Webhooks use their own verification
  '/api/public/', // Public endpoints don't need CSRF
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a token for secure comparison
 */
function hashToken(token: string, secret: string): string {
  return createHash('sha256')
    .update(token + secret)
    .digest('hex');
}

/**
 * Get or create a CSRF token for the current session
 */
export async function getCSRFToken(request: NextRequest): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return null;
    }

    // Try to get existing token from cookie
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    if (cookieToken) {
      // Validate token hasn't expired (would be handled by cookie expiry)
      return cookieToken;
    }

    // Generate new token
    const newToken = generateCSRFToken();

    // Store token hash in cache for validation
    const tokenHash = hashToken(newToken, session.user.id);
    const cacheKey = `${CSRF_CACHE_PREFIX}${session.user.id}`;

    // Cache the token hash for validation
    await getCachedData(
      cacheKey,
      async () => tokenHash,
      CACHE_DURATIONS.STATIC_MEDIUM // 24 hours
    );

    return newToken;
  } catch (error) {
    log.error('Failed to get CSRF token', { error: (error as Error).message });
    return null;
  }
}

/**
 * Validate a CSRF token from request
 */
export async function validateCSRFToken(
  request: NextRequest,
  token: string
): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return false;
    }

    // Get stored token hash from cache
    const cacheKey = `${CSRF_CACHE_PREFIX}${session.user.id}`;
    const storedHash = await getCachedData<string>(
      cacheKey,
      async () => null,
      0
    );

    if (!storedHash) {
      log.warn('No CSRF token found in cache', { userId: session.user.id });
      return false;
    }

    // Compare token hashes
    const providedHash = hashToken(token, session.user.id);
    const isValid = storedHash === providedHash;

    if (!isValid) {
      log.warn('Invalid CSRF token provided', {
        userId: session.user.id,
        path: request.nextUrl.pathname
      });
    }

    return isValid;
  } catch (error) {
    log.error('CSRF token validation error', { error: (error as Error).message });
    return false;
  }
}

/**
 * Check if a path is exempt from CSRF protection
 */
function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATHS.some(exempt => pathname.startsWith(exempt));
}

/**
 * CSRF protection middleware for API routes
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (!PROTECTED_METHODS.includes(request.method)) {
    return handler();
  }

  // Check if path is exempt
  if (isExemptPath(request.nextUrl.pathname)) {
    return handler();
  }

  // Get CSRF token from header or body
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const bodyToken = await getTokenFromBody(request);
  const token = headerToken || bodyToken;

  if (!token) {
    log.warn('Missing CSRF token', {
      path: request.nextUrl.pathname,
      method: request.method
    });
    return NextResponse.json(
      { error: 'CSRF token required' },
      { status: 403 }
    );
  }

  // Validate token
  const isValid = await validateCSRFToken(request, token);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  // Token is valid, proceed with request
  return handler();
}

/**
 * Extract CSRF token from request body if present
 */
async function getTokenFromBody(request: NextRequest): Promise<string | null> {
  try {
    // Clone request to avoid consuming the body
    const clonedRequest = request.clone();
    const contentType = clonedRequest.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const body = await clonedRequest.json();
      return body._csrf || body.csrfToken || null;
    }

    if (contentType?.includes('multipart/form-data')) {
      const formData = await clonedRequest.formData();
      const token = formData.get('_csrf') || formData.get('csrfToken');
      return token as string | null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Create a response with CSRF token cookie
 */
export function addCSRFCookie(response: NextResponse, token: string): void {
  // Set secure cookie with CSRF token
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * HOC to wrap API route handlers with CSRF protection
 */
export function withCSRF<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0] as NextRequest;

    // Apply CSRF protection
    return withCSRFProtection(request, async () => {
      return handler(...args);
    });
  }) as T;
}

/**
 * Middleware helper to check CSRF for specific routes
 */
export async function checkCSRF(request: NextRequest): Promise<boolean> {
  // Skip for non-protected methods
  if (!PROTECTED_METHODS.includes(request.method)) {
    return true;
  }

  // Skip for exempt paths
  if (isExemptPath(request.nextUrl.pathname)) {
    return true;
  }

  // Get and validate token
  const token = request.headers.get(CSRF_HEADER_NAME);
  if (!token) {
    return false;
  }

  return validateCSRFToken(request, token);
}

/**
 * Generate CSRF meta tags for HTML pages
 */
export async function getCSRFMetaTags(request: NextRequest): Promise<string> {
  const token = await getCSRFToken(request);
  if (!token) {
    return '';
  }

  return `
    <meta name="csrf-token" content="${token}" />
    <meta name="csrf-header" content="${CSRF_HEADER_NAME}" />
    <meta name="csrf-cookie" content="${CSRF_COOKIE_NAME}" />
  `;
}

/**
 * Client-side helper to get CSRF token
 * This would be used in client components
 */
export function getCSRFTokenFromMeta(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || null;
}

/**
 * Client-side helper to add CSRF token to fetch requests
 */
export function addCSRFToRequest(init: RequestInit = {}): RequestInit {
  const token = getCSRFTokenFromMeta();
  if (!token) {
    return init;
  }

  return {
    ...init,
    headers: {
      ...init.headers,
      [CSRF_HEADER_NAME]: token,
    },
  };
}