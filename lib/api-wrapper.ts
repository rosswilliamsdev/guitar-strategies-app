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

// Support both simple and Next.js 15 dynamic route handlers
type RouteHandler = (request: NextRequest) => Promise<NextResponse>;
type RouteHandlerWithParams = (
  request: NextRequest,
  context: { params: Promise<any> }
) => Promise<NextResponse>;

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
 * Supports both simple handlers and Next.js 15 dynamic route handlers with params
 */
export function withApiMiddleware(
  handler: RouteHandler | RouteHandlerWithParams,
  options: ApiWrapperOptions = {}
): RouteHandler | RouteHandlerWithParams {
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
  async function executeHandler(request: NextRequest, context?: { params: Promise<any> }): Promise<NextResponse> {
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

      // Validate path parameters if schema provided and params available
      if (paramsSchema && context?.params) {
        const params = await context.params;
        const validation = paramsSchema.safeParse(params);

        if (!validation.success) {
          return createValidationErrorResponse(validation.error);
        }

        validatedParams = validation.data;
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

      // Call the actual handler - support both handler types
      let response: NextResponse;
      if (context) {
        // Next.js 15 dynamic route handler with params
        response = await (handler as RouteHandlerWithParams)(request, context);
      } else {
        // Simple handler without params
        response = await (handler as RouteHandler)(request);
      }

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
  // Return a function that can handle both signatures
  const wrappedHandler = async (request: NextRequest, context?: { params: Promise<any> }) => {
    return withRateLimit(async (req: NextRequest) => {
      // Apply CSRF protection if not skipped
      if (!skipCSRF) {
        return withCSRFProtection(req, async () => {
          return executeHandler(req, context);
        });
      } else {
        return executeHandler(req, context);
      }
    }, rateLimit)(request);
  };

  return wrappedHandler as RouteHandler | RouteHandlerWithParams;
}

/**
 * Shorthand wrappers for common scenarios
 */
export const withAuth = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true });

export const withTeacherAuth = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true, requireRole: 'TEACHER', rateLimit: 'API' });

export const withStudentAuth = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true, requireRole: 'STUDENT', rateLimit: 'READ' });

export const withAdminAuth = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true, requireRole: 'ADMIN', rateLimit: 'API' });

export const withPublic = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: false, rateLimit: 'API' });

export const withBookingLimit = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true, rateLimit: 'BOOKING' });

export const withUploadLimit = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true, rateLimit: 'UPLOAD' });

export const withEmailLimit = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true, rateLimit: 'EMAIL' });

// Wrappers that skip CSRF protection (for specific use cases like public endpoints)
export const withPublicNoCSRF = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: false, rateLimit: 'API', skipCSRF: true });

export const withAuthNoCSRF = (handler: RouteHandler | RouteHandlerWithParams) =>
  withApiMiddleware(handler, { requireAuth: true, skipCSRF: true });

// Validation-specific wrappers
export const withValidation = (
  handler: RouteHandler | RouteHandlerWithParams,
  options: Pick<ApiWrapperOptions, 'bodySchema' | 'querySchema' | 'paramsSchema'> & Partial<ApiWrapperOptions>
) =>
  withApiMiddleware(handler, { ...options });

export const withBodyValidation = (handler: RouteHandler | RouteHandlerWithParams, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, { bodySchema });

export const withQueryValidation = (handler: RouteHandler | RouteHandlerWithParams, querySchema: ZodSchema) =>
  withApiMiddleware(handler, { querySchema });

export const withTeacherValidation = (handler: RouteHandler | RouteHandlerWithParams, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: 'TEACHER',
    bodySchema,
    rateLimit: 'API',
    skipCSRF: true
  });

export const withStudentValidation = (handler: RouteHandler | RouteHandlerWithParams, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: 'STUDENT',
    bodySchema,
    rateLimit: 'READ',
    skipCSRF: true
  });

export const withAdminValidation = (handler: RouteHandler | RouteHandlerWithParams, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: 'ADMIN',
    bodySchema,
    rateLimit: 'API',
    skipCSRF: true
  });