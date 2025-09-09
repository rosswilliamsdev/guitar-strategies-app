/**
 * Caching utilities for Guitar Strategies application
 * 
 * Provides comprehensive caching strategies for API responses,
 * database queries, and static data optimization.
 */

import { NextResponse } from 'next/server';

/**
 * Cache configuration for different types of data
 */
export const CACHE_DURATIONS = {
  // Static data that rarely changes
  STATIC_LONG: 60 * 60 * 24 * 7, // 1 week
  STATIC_MEDIUM: 60 * 60 * 24,   // 1 day
  STATIC_SHORT: 60 * 60,         // 1 hour
  
  // Dynamic data
  DYNAMIC_LONG: 60 * 15,         // 15 minutes
  DYNAMIC_MEDIUM: 60 * 5,        // 5 minutes
  DYNAMIC_SHORT: 60,             // 1 minute
  
  // Real-time data
  REALTIME: 30,                  // 30 seconds
  NO_CACHE: 0,                   // No caching
} as const;

/**
 * Cache control headers for different data types
 */
export const CACHE_HEADERS = {
  // User profiles and settings (medium caching)
  USER_DATA: {
    'Cache-Control': `public, s-maxage=${CACHE_DURATIONS.DYNAMIC_MEDIUM}, max-age=${CACHE_DURATIONS.DYNAMIC_SHORT}`,
    'CDN-Cache-Control': `public, s-maxage=${CACHE_DURATIONS.DYNAMIC_LONG}`,
  },
  
  // Dashboard statistics (short caching due to frequent updates)
  DASHBOARD_STATS: {
    'Cache-Control': `public, s-maxage=${CACHE_DURATIONS.DYNAMIC_SHORT}, max-age=${CACHE_DURATIONS.REALTIME}`,
    'CDN-Cache-Control': `public, s-maxage=${CACHE_DURATIONS.DYNAMIC_MEDIUM}`,
  },
  
  // Lesson data (medium caching)
  LESSONS: {
    'Cache-Control': `public, s-maxage=${CACHE_DURATIONS.DYNAMIC_MEDIUM}, max-age=${CACHE_DURATIONS.DYNAMIC_SHORT}`,
    'CDN-Cache-Control': `public, s-maxage=${CACHE_DURATIONS.DYNAMIC_LONG}`,
  },
  
  // Static reference data (long caching)
  REFERENCE_DATA: {
    'Cache-Control': `public, s-maxage=${CACHE_DURATIONS.STATIC_MEDIUM}, max-age=${CACHE_DURATIONS.STATIC_SHORT}`,
    'CDN-Cache-Control': `public, s-maxage=${CACHE_DURATIONS.STATIC_LONG}`,
  },
  
  // No cache for sensitive or real-time data
  NO_CACHE: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
} as const;

/**
 * Create a cached API response with appropriate headers
 */
export function createCachedResponse<T>(
  data: T,
  cacheType: keyof typeof CACHE_HEADERS = 'USER_DATA',
  options: {
    status?: number;
    statusText?: string;
    etag?: string;
    lastModified?: Date;
  } = {}
): NextResponse {
  const response = NextResponse.json(data, {
    status: options.status || 200,
    statusText: options.statusText,
  });

  // Add cache control headers
  const headers = CACHE_HEADERS[cacheType];
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add ETag for cache validation
  if (options.etag) {
    response.headers.set('ETag', options.etag);
  }

  // Add Last-Modified header
  if (options.lastModified) {
    response.headers.set('Last-Modified', options.lastModified.toUTCString());
  }

  // Add Vary header for proper caching
  response.headers.set('Vary', 'Accept, Authorization, Accept-Encoding');

  return response;
}

/**
 * Generate ETag for data consistency checking
 */
export function generateETag(data: unknown): string {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  // Simple hash function for ETag generation
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

/**
 * Check if request has valid cache based on ETag or Last-Modified
 */
export function isCacheValid(
  request: Request,
  etag?: string,
  lastModified?: Date
): boolean {
  // Check If-None-Match header (ETag)
  if (etag) {
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return true;
    }
  }

  // Check If-Modified-Since header
  if (lastModified) {
    const ifModifiedSince = request.headers.get('If-Modified-Since');
    if (ifModifiedSince) {
      const modifiedSinceDate = new Date(ifModifiedSince);
      if (lastModified <= modifiedSinceDate) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Create a 304 Not Modified response
 */
export function createNotModifiedResponse(): NextResponse {
  const response = new NextResponse(null, { status: 304 });
  response.headers.set('Cache-Control', 'public, max-age=0');
  return response;
}

/**
 * In-memory cache for frequently accessed data
 */
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  private readonly defaultTTL: number;

  constructor(defaultTTL: number = CACHE_DURATIONS.DYNAMIC_MEDIUM * 1000) {
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expires });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
export const dashboardCache = new MemoryCache(CACHE_DURATIONS.DYNAMIC_SHORT * 1000);
export const userCache = new MemoryCache(CACHE_DURATIONS.DYNAMIC_MEDIUM * 1000);
export const lessonCache = new MemoryCache(CACHE_DURATIONS.DYNAMIC_MEDIUM * 1000);

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  dashboardStats: (userId: string, role: string) => `dashboard:${role}:${userId}`,
  userProfile: (userId: string) => `user:${userId}`,
  teacherProfile: (teacherId: string) => `teacher:${teacherId}`,
  studentLessons: (studentId: string) => `lessons:student:${studentId}`,
  teacherLessons: (teacherId: string) => `lessons:teacher:${teacherId}`,
  lessonDetails: (lessonId: string) => `lesson:${lessonId}`,
} as const;