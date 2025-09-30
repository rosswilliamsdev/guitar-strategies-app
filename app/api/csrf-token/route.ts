/**
 * CSRF Token API Endpoint
 *
 * Provides CSRF tokens for authenticated users.
 * This endpoint is used when client-side code needs to refresh or obtain CSRF tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCSRFToken, addCSRFCookie } from '@/lib/csrf';
import { apiLog } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate or get existing CSRF token
    const token = await getCSRFToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
    }

    // Create response with token
    const response = NextResponse.json({
      token,
      headerName: 'x-csrf-token',
      cookieName: '__Host-csrf',
    });

    // Set the CSRF cookie
    addCSRFCookie(response, token);

    apiLog.info('CSRF token generated', {
      userId: session.user.id,
      userAgent: request.headers.get('user-agent') ?? undefined
    });

    return response;
  } catch (error) {
    apiLog.error('Error generating CSRF token:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Export handlers directly (rate limiting temporarily disabled for Next.js 15 compatibility)
export const GET = handleGET;