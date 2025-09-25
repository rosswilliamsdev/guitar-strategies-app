/**
 * Validated Request Utilities
 *
 * Type-safe utilities for accessing validated data from API requests
 * that have been processed through the validation middleware.
 */

import { NextRequest } from 'next/server';
import { z, ZodSchema } from 'zod';

/**
 * Extended NextRequest interface that includes validated data
 */
export interface ValidatedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> extends NextRequest {
  validatedBody?: TBody;
  validatedQuery?: TQuery;
  validatedParams?: TParams;
}

/**
 * Type-safe getter for validated request body
 */
export function getValidatedBody<T>(
  request: NextRequest,
  schema?: ZodSchema<T>
): T | undefined {
  const body = (request as any).validatedBody;

  if (schema && body) {
    // Re-validate if schema is provided for extra type safety
    const result = schema.safeParse(body);
    return result.success ? result.data : undefined;
  }

  return body as T;
}

/**
 * Type-safe getter for validated query parameters
 */
export function getValidatedQuery<T>(
  request: NextRequest,
  schema?: ZodSchema<T>
): T | undefined {
  const query = (request as any).validatedQuery;

  if (schema && query) {
    const result = schema.safeParse(query);
    return result.success ? result.data : undefined;
  }

  return query as T;
}

/**
 * Type-safe getter for validated path parameters
 */
export function getValidatedParams<T>(
  request: NextRequest,
  schema?: ZodSchema<T>
): T | undefined {
  const params = (request as any).validatedParams;

  if (schema && params) {
    const result = schema.safeParse(params);
    return result.success ? result.data : undefined;
  }

  return params as T;
}

/**
 * Validates and extracts request body manually (for endpoints not using middleware)
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    const result = schema.parse(body); // Throws on validation error
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request body', error.errors);
    }
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Validates query parameters manually
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams);

  try {
    return schema.parse(queryParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid query parameters', error.errors);
    }
    throw new ValidationError('Invalid query parameters');
  }
}

/**
 * Validates path parameters manually (requires params to be passed in)
 */
export function validatePathParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): T {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid path parameters', error.errors);
    }
    throw new ValidationError('Invalid path parameters');
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly field?: string;
  public readonly errors?: z.ZodIssue[];

  constructor(message: string, errors?: z.ZodIssue[], field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.field = field;
  }
}

/**
 * Helper to create common validation schemas for IDs
 */
export const idSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('America/New_York'),
});

/**
 * Common validation schemas for different data types
 */
export const commonSchemas = {
  id: idSchema,
  pagination: paginationQuerySchema,
  dateRange: dateRangeSchema,

  // Email validation
  email: z.string().email('Invalid email address'),

  // URL validation
  url: z.string().url('Invalid URL'),

  // Phone number (basic validation)
  phone: z.string().regex(
    /^[\+]?[\d\s\-\(\)]{10,}$/,
    'Invalid phone number format'
  ),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Positive integer
  positiveInt: z.number().int().positive('Must be a positive integer'),

  // Price in cents
  priceInCents: z.number().int().min(0, 'Price cannot be negative'),

  // Date string (ISO format)
  dateString: z.string().datetime('Invalid date format'),

  // Boolean from string (for query params)
  booleanFromString: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean()),
};

/**
 * Utility to combine multiple validation schemas
 */
export function combineSchemas<T extends Record<string, ZodSchema>>(
  schemas: T
): {
  [K in keyof T]: T[K] extends ZodSchema<infer U> ? U : never;
} {
  return schemas as any;
}

/**
 * Create a validated handler wrapper with full type safety
 */
export function createValidatedHandler<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
>(
  bodySchema?: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>,
  paramsSchema?: ZodSchema<TParams>
) {
  return function<TResponse>(
    handler: (
      request: ValidatedRequest<TBody, TQuery, TParams>
    ) => Promise<TResponse>
  ) {
    return handler;
  };
}