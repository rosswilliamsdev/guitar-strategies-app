// ========================================
// FILE: lib/request-validation.ts (Request Size Validation)
// ========================================

import { NextRequest, NextResponse } from 'next/server';

// Request size limits (in bytes) - should match middleware.ts
export const REQUEST_LIMITS = {
  // General API requests (JSON payloads)
  DEFAULT: 1024 * 1024 * 1, // 1MB
  
  // File upload endpoints
  FILE_UPLOAD: 1024 * 1024 * 10, // 10MB
  
  // Rich text content (lesson notes, etc.)
  RICH_TEXT: 1024 * 50, // 50KB (enough for 5000 chars + HTML markup)
  
  // Form submissions
  FORM_DATA: 1024 * 100, // 100KB
  
  // Invoice data
  INVOICE: 1024 * 20, // 20KB
  
  // User settings
  SETTINGS: 1024 * 10, // 10KB
} as const;

export type RequestLimitType = keyof typeof REQUEST_LIMITS;

/**
 * Validates request size against specified limit
 * @param request - Next.js request object
 * @param limitType - Type of limit to apply
 * @returns null if valid, NextResponse error if invalid
 */
export function validateRequestSize(
  request: NextRequest,
  limitType: RequestLimitType = 'DEFAULT'
): NextResponse | null {
  const contentLength = request.headers.get('content-length');
  
  if (!contentLength) {
    return null; // No content length header, let it pass
  }
  
  const size = parseInt(contentLength, 10);
  const limit = REQUEST_LIMITS[limitType];
  
  if (isNaN(size) || size < 0) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        message: 'Invalid content-length header',
      },
      { status: 400 }
    );
  }
  
  if (size > limit) {
    console.warn(`Request size limit exceeded: ${size} bytes (limit: ${limit}) for ${limitType}`);
    
    return NextResponse.json(
      {
        error: 'Request too large',
        message: `Request size (${Math.round(size / 1024)}KB) exceeds limit (${Math.round(limit / 1024)}KB)`,
        limit: limit,
        size: size,
        limitType: limitType,
      },
      { 
        status: 413,
        headers: {
          'Retry-After': '60',
        }
      }
    );
  }
  
  return null;
}

/**
 * Validates JSON request body size after parsing
 * @param data - Parsed JSON data
 * @param limitType - Type of limit to apply
 * @returns null if valid, error response if invalid
 */
export function validateJsonSize(
  data: any,
  limitType: RequestLimitType = 'DEFAULT'
): NextResponse | null {
  const jsonString = JSON.stringify(data);
  const size = Buffer.byteLength(jsonString, 'utf8');
  const limit = REQUEST_LIMITS[limitType];
  
  if (size > limit) {
    console.warn(`JSON payload size limit exceeded: ${size} bytes (limit: ${limit}) for ${limitType}`);
    
    return NextResponse.json(
      {
        error: 'Request too large',
        message: `JSON payload (${Math.round(size / 1024)}KB) exceeds limit (${Math.round(limit / 1024)}KB)`,
        limit: limit,
        size: size,
        limitType: limitType,
      },
      { 
        status: 413,
        headers: {
          'Retry-After': '60',
        }
      }
    );
  }
  
  return null;
}

/**
 * Middleware helper to apply request size limits to API routes
 * @param handler - API route handler
 * @param limitType - Type of limit to apply
 */
export function withRequestSizeLimit<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>,
  limitType: RequestLimitType = 'DEFAULT'
) {
  return async (request: T): Promise<NextResponse> => {
    // Check request size limit
    const sizeValidation = validateRequestSize(request, limitType);
    if (sizeValidation) {
      return sizeValidation;
    }
    
    // Continue to handler
    return handler(request);
  };
}

/**
 * Rate limiting helper (basic implementation)
 * @param identifier - Unique identifier for rate limiting (IP, user ID, etc.)
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests per window
 */
const requestCounts = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(
  identifier: string,
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 100
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  
  const existing = requestCounts.get(identifier);
  
  if (!existing || existing.windowStart < windowStart) {
    // New window
    requestCounts.set(identifier, { count: 1, windowStart });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: windowStart + windowMs,
    };
  }
  
  if (existing.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: windowStart + windowMs,
    };
  }
  
  // Increment count
  existing.count++;
  requestCounts.set(identifier, existing);
  
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetTime: windowStart + windowMs,
  };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now - value.windowStart > 300000) { // 5 minutes old
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean every minute