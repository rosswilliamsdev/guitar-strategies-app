/**
 * Pagination Utilities for API Endpoints
 *
 * Provides consistent pagination across all list endpoints
 * with cursor-based and offset-based pagination support
 */

import { NextRequest } from 'next/server';

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    total?: number;
  };
}

/**
 * Extract pagination parameters from request URL
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const cursor = searchParams.get('cursor') || undefined;
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Validate and constrain values
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit)); // Max 100 items per page

  return {
    page: validPage,
    limit: validLimit,
    cursor,
    sortBy,
    sortOrder,
  };
}

/**
 * Calculate pagination metadata for offset-based pagination
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginatedResponse<any>['pagination'] {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
  };
}

/**
 * Get Prisma pagination options for offset-based pagination
 */
export function getPrismaOffsetPagination(params: PaginationParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
  };
}

/**
 * Get Prisma pagination options for cursor-based pagination
 */
export function getPrismaCursorPagination(params: PaginationParams) {
  const { cursor, limit = 20 } = params;

  if (cursor) {
    return {
      take: limit + 1, // Take one extra to determine if there are more
      cursor: {
        id: cursor,
      },
      skip: 1, // Skip the cursor item itself
    };
  }

  return {
    take: limit + 1, // Take one extra to determine if there are more
  };
}

/**
 * Process cursor-based pagination results
 */
export function processCursorResults<T extends { id: string }>(
  results: T[],
  limit: number
): { data: T[]; hasMore: boolean; nextCursor?: string } {
  let hasMore = false;
  let data = results;

  if (results.length > limit) {
    hasMore = true;
    data = results.slice(0, -1); // Remove the extra item
  }

  const nextCursor = data.length > 0 ? data[data.length - 1].id : undefined;

  return {
    data,
    hasMore,
    nextCursor: hasMore ? nextCursor : undefined,
  };
}

/**
 * Create a paginated response for offset-based pagination
 */
export async function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): Promise<PaginatedResponse<T>> {
  return {
    data,
    pagination: calculatePagination(page, limit, total),
  };
}

/**
 * Create a paginated response for cursor-based pagination
 */
export function createCursorPaginatedResponse<T extends { id: string }>(
  results: T[],
  limit: number,
  total?: number
): CursorPaginatedResponse<T> {
  const { data, hasMore, nextCursor } = processCursorResults(results, limit);

  return {
    data,
    pagination: {
      limit,
      hasMore,
      nextCursor,
      total,
    },
  };
}

/**
 * Get sort configuration for Prisma
 */
export function getPrismaSortOptions(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  allowedFields: string[] = []
): any {
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return { createdAt: sortOrder }; // Default sort
  }

  // Handle nested fields (e.g., "user.name")
  if (sortBy.includes('.')) {
    const parts = sortBy.split('.');
    let sortConfig: any = { [parts[parts.length - 1]]: sortOrder };

    for (let i = parts.length - 2; i >= 0; i--) {
      sortConfig = { [parts[i]]: sortConfig };
    }

    return sortConfig;
  }

  return { [sortBy]: sortOrder };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (params.page && params.page < 1) {
    errors.push('Page must be greater than 0');
  }

  if (params.limit) {
    if (params.limit < 1) {
      errors.push('Limit must be greater than 0');
    }
    if (params.limit > 100) {
      errors.push('Limit cannot exceed 100');
    }
  }

  if (params.sortOrder && !['asc', 'desc'].includes(params.sortOrder)) {
    errors.push('Sort order must be either "asc" or "desc"');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to add pagination info to response headers
 */
export function addPaginationHeaders(
  response: Response,
  pagination: PaginatedResponse<any>['pagination']
): void {
  response.headers.set('X-Page', pagination.page.toString());
  response.headers.set('X-Limit', pagination.limit.toString());
  response.headers.set('X-Total', pagination.total.toString());
  response.headers.set('X-Total-Pages', pagination.totalPages.toString());
  response.headers.set('X-Has-More', pagination.hasMore.toString());

  if (pagination.nextCursor) {
    response.headers.set('X-Next-Cursor', pagination.nextCursor);
  }
}