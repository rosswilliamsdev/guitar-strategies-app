import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { log } from '@/lib/logger';

// Standardized error response structure
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: Record<string, unknown> | string[] | unknown;
  timestamp?: string;
}

// Standardized success response structure
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data?: T, 
  message?: string, 
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: Record<string, unknown> | string[] | unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Handles authentication errors with consistent messaging
 */
export function createAuthErrorResponse(message?: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    message || 'Authentication required',
    401
  );
}

/**
 * Handles authorization errors with consistent messaging
 */
export function createForbiddenResponse(message?: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    message || 'Access forbidden',
    403
  );
}

/**
 * Handles resource not found errors with consistent messaging
 */
export function createNotFoundResponse(resource?: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    resource ? `${resource} not found` : 'Resource not found',
    404
  );
}

/**
 * Handles validation errors from Zod schemas
 */
export function createValidationErrorResponse(error: ZodError): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    'Validation failed',
    400,
    error.flatten().fieldErrors
  );
}

/**
 * Handles business logic conflicts (e.g., double booking)
 */
export function createConflictResponse(message: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 409);
}

/**
 * Handles generic bad request errors
 */
export function createBadRequestResponse(message: string, details?: Record<string, unknown> | string[] | unknown): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 400, details);
}

/**
 * Handles internal server errors with optional error logging
 */
export function createInternalErrorResponse(
  message: string = 'Internal server error',
  originalError?: unknown
): NextResponse<ApiErrorResponse> {
  // Log the original error for debugging but don't expose it
  if (originalError) {
    log.error('Internal server error:', {
        error: originalError instanceof Error ? originalError.message : String(originalError),
        stack: originalError instanceof Error ? originalError.stack : undefined
      });
    if (originalError instanceof Error && originalError.stack) {
      log.error('Stack trace:', {
        error: originalError.stack instanceof Error ? originalError.stack.message : String(originalError.stack),
        stack: originalError.stack instanceof Error ? originalError.stack.stack : undefined
      });
    }
  }
  
  return createErrorResponse(message, 500);
}

/**
 * Centralized error handler that maps common error types to appropriate responses
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  log.error('API Error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
  
  // Zod validation errors
  if (error instanceof ZodError) {
    return createValidationErrorResponse(error);
  }
  
  // Business logic errors (thrown by our application logic)
  if (error instanceof Error) {
    // Check for specific business logic error patterns
    if (error.message.includes('not available') || 
        error.message.includes('already booked') ||
        error.message.includes('time slot conflict')) {
      return createConflictResponse(error.message);
    }
    
    if (error.message.includes('not authorized') ||
        error.message.includes('permission denied')) {
      return createForbiddenResponse(error.message);
    }
    
    if (error.message.includes('not found')) {
      return createNotFoundResponse();
    }
    
    if (error.message.includes('invalid') || 
        error.message.includes('required')) {
      return createBadRequestResponse(error.message);
    }
    
    // Return error message for other Error instances
    return createInternalErrorResponse(error.message, error);
  }
  
  // Default to internal server error
  return createInternalErrorResponse(
    'An unexpected error occurred',
    error
  );
}