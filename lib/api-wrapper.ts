/**
 * API Route Wrapper Utility
 *
 * Provides a centralized way to wrap API route handlers with:
 * - Rate limiting
 * - Error handling
 * - Logging
 * - Authentication checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiLog } from '@/lib/logger';
import { withCSRFProtection } from '@/lib/csrf';
import { z, ZodSchema } from 'zod';
import {
  createValidationErrorResponse,
  createBadRequestResponse,
  handleApiError
} from '@/lib/api-responses';

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

interface ApiWrapperOptions {
  rateLimit?: keyof typeof RATE_LIMITS;
  requireAuth?: boolean;
  requireRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  logRequest?: boolean;
  skipCSRF?: boolean; // Allow skipping CSRF for specific endpoints
  bodySchema?: ZodSchema; // Schema for request body validation
  querySchema?: ZodSchema; // Schema for query parameters validation
  paramsSchema?: ZodSchema; // Schema for path parameters validation
}

/**
 * Wraps an API route handler with standard middleware
 */
export function withApiMiddleware(
  handler: RouteHandler,
  options: ApiWrapperOptions = {}
): RouteHandler {
  const {
    rateLimit = 'API',
    requireAuth = true,
    requireRole,
    logRequest = true,
    skipCSRF = false,
    bodySchema,
    querySchema,
    paramsSchema,
  } = options;

  // Extract handler logic into separate function
  async function executeHandler(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      // Log the request
      if (logRequest) {
        apiLog.info('API request', {
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        });
      }

      // Validate request data
      let validatedBody, validatedQuery, validatedParams;

      // Validate request body for POST/PUT/PATCH requests
      if (bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method || '')) {
        try {
          const body = await request.json();
          const validation = bodySchema.safeParse(body);

          if (!validation.success) {
            return createValidationErrorResponse(validation.error);
          }

          validatedBody = validation.data;
        } catch (error) {
          return createBadRequestResponse('Invalid JSON in request body');
        }
      }

      // Validate query parameters
      if (querySchema) {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams);
        const validation = querySchema.safeParse(queryParams);

        if (!validation.success) {
          return createValidationErrorResponse(validation.error);
        }

        validatedQuery = validation.data;
      }

      // Validate path parameters (extracted from URL)
      if (paramsSchema) {
        // This would need to be passed from the route context
        // For now, we'll skip params validation as it's complex to extract generically
        // Individual routes can handle this manually
      }

      // Check authentication if required
      if (requireAuth) {
        const session = await getServerSession(authOptions);

        if (!session) {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
          );
        }

        // Check role if specified
        if (requireRole) {
          // For ADMIN requirement, check both role and isAdmin flag
          if (requireRole === 'ADMIN') {
            const hasAdminAccess = session.user.role === 'ADMIN' ||
              (session.user.role === 'TEACHER' && session.user.teacherProfile?.isAdmin === true);

            if (!hasAdminAccess) {
              return NextResponse.json(
                { error: 'Forbidden', message: 'Admin access required' },
                { status: 403 }
              );
            }
          } else {
            // For other roles, check exact match or ADMIN override
            const hasAccess = session.user.role === requireRole ||
              session.user.role === 'ADMIN' ||
              (session.user.role === 'TEACHER' && session.user.teacherProfile?.isAdmin === true);

            if (!hasAccess) {
              return NextResponse.json(
                { error: 'Forbidden', message: `${requireRole} access required` },
                { status: 403 }
              );
            }
          }
        }
      }

      // Attach validated data to the request for easy access
      if (validatedBody) {
        (request as any).validatedBody = validatedBody;
      }
      if (validatedQuery) {
        (request as any).validatedQuery = validatedQuery;
      }
      if (validatedParams) {
        (request as any).validatedParams = validatedParams;
      }

      // Call the actual handler
      const response = await handler(request);

      // Log the response
      if (logRequest) {
        apiLog.info('API response', {
          method: request.method,
          url: request.url,
          status: response.status,
          duration: Date.now() - startTime,
        });
      }

      return response;
    } catch (error) {
      // Log the error
      apiLog.error('API error', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      });

      // Return generic error response
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'An unexpected error occurred',
        },
        { status: 500 }
      );
    }
  }

  // Apply rate limiting and CSRF protection
  const rateLimitedHandler = withRateLimit(async (request: NextRequest) => {
    // Apply CSRF protection if not skipped
    if (!skipCSRF) {
      return withCSRFProtection(request, async () => {
        return executeHandler(request);
      });
    } else {
      return executeHandler(request);
    }
  }, rateLimit);

  return rateLimitedHandler;
}

/**
 * Shorthand wrappers for common scenarios
 */
export const withAuth = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true });

export const withTeacherAuth = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true, requireRole: 'TEACHER', rateLimit: 'API' });

export const withStudentAuth = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true, requireRole: 'STUDENT', rateLimit: 'READ' });

export const withAdminAuth = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true, requireRole: 'ADMIN', rateLimit: 'API' });

export const withPublic = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: false, rateLimit: 'API' });

export const withBookingLimit = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true, rateLimit: 'BOOKING' });

export const withUploadLimit = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true, rateLimit: 'UPLOAD' });

export const withEmailLimit = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true, rateLimit: 'EMAIL' });

// Wrappers that skip CSRF protection (for specific use cases like public endpoints)
export const withPublicNoCSRF = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: false, rateLimit: 'API', skipCSRF: true });

export const withAuthNoCSRF = (handler: RouteHandler) =>
  withApiMiddleware(handler, { requireAuth: true, skipCSRF: true });

// Validation-specific wrappers
export const withValidation = (
  handler: RouteHandler,
  options: Pick<ApiWrapperOptions, 'bodySchema' | 'querySchema' | 'paramsSchema'> & Partial<ApiWrapperOptions>
) =>
  withApiMiddleware(handler, { ...options });

export const withBodyValidation = (handler: RouteHandler, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, { bodySchema });

export const withQueryValidation = (handler: RouteHandler, querySchema: ZodSchema) =>
  withApiMiddleware(handler, { querySchema });

export const withTeacherValidation = (handler: RouteHandler, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: 'TEACHER',
    bodySchema,
    rateLimit: 'API'
  });

export const withStudentValidation = (handler: RouteHandler, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: 'STUDENT',
    bodySchema,
    rateLimit: 'READ'
  });

export const withAdminValidation = (handler: RouteHandler, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: 'ADMIN',
    bodySchema,
    rateLimit: 'API'
  });