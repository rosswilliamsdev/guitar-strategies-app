/**
 * Rate limiting test endpoint
 * 
 * This endpoint is used to test the rate limiting functionality.
 * It has a very low rate limit for easy testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

async function handleGET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             '127.0.0.1';
  
  return NextResponse.json({
    message: 'Rate limiting test successful',
    timestamp,
    ip,
    limits: {
      auth: `${RATE_LIMITS.AUTH.max} requests per ${RATE_LIMITS.AUTH.windowMs / 1000}s`,
      api: `${RATE_LIMITS.API.max} requests per ${RATE_LIMITS.API.windowMs / 1000}s`,
      booking: `${RATE_LIMITS.BOOKING.max} requests per ${RATE_LIMITS.BOOKING.windowMs / 1000}s`,
    }
  });
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  
  return NextResponse.json({
    message: 'POST request successful',
    receivedData: body,
    timestamp: new Date().toISOString(),
  });
}

// Apply different rate limits for testing
export const GET = withRateLimit(handleGET, 'READ'); // 200 requests per minute
export const POST = withRateLimit(handlePOST, 'AUTH'); // 5 requests per 15 minutes (strict for testing)