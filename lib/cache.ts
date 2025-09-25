/**
 * Caching utilities for Guitar Strategies application
 *
 * Provides comprehensive caching strategies for API responses,
 * database queries, and static data optimization.
 * Supports both in-memory LRU cache and Redis for production.
 */

import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { log } from '@/lib/logger';

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
  teacherAvailability: (teacherId: string, date?: string) =>
    date ? `availability:${teacherId}:${date}` : `availability:${teacherId}`,
  teacherSettings: (teacherId: string) => `settings:teacher:${teacherId}`,
  studentLessons: (studentId: string, page?: number) =>
    page ? `lessons:student:${studentId}:${page}` : `lessons:student:${studentId}`,
  teacherLessons: (teacherId: string, page?: number) =>
    page ? `lessons:teacher:${teacherId}:${page}` : `lessons:teacher:${teacherId}`,
  lessonDetails: (lessonId: string) => `lesson:${lessonId}`,
  recentLessons: (teacherId: string) => `recent-lessons:${teacherId}`,
  recommendations: (teacherId: string) => `recommendations:${teacherId}`,
  invoices: (teacherId: string) => `invoices:${teacherId}`,
  libraryItems: (teacherId: string) => `library:${teacherId}`,
} as const;

/**
 * Redis-backed cache service for production
 */
class RedisCache {
  private client: Redis | null = null;
  private fallbackCache = new LRUCache<string, any>({
    max: 500,
    ttl: CACHE_DURATIONS.DYNAMIC_MEDIUM * 1000,
  });

  constructor() {
    if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
      try {
        this.client = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
          lazyConnect: true,
        });

        this.client.on('error', (err) => {
          log.error('Redis client error', { error: err.message });
          // Fall back to in-memory cache
          this.client = null;
        });

        this.client.on('connect', () => {
          log.info('Redis connected successfully');
        });
      } catch (error) {
        log.error('Failed to initialize Redis', { error: (error as Error).message });
        this.client = null;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.client) {
        const value = await this.client.get(key);
        if (value) {
          log.debug('Redis cache hit', { key });
          return JSON.parse(value) as T;
        }
      } else {
        const value = this.fallbackCache.get(key);
        if (value) {
          log.debug('Memory cache hit', { key });
          return value as T;
        }
      }
      log.debug('Cache miss', { key });
      return null;
    } catch (error) {
      log.error('Cache get error', { key, error: (error as Error).message });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = CACHE_DURATIONS.DYNAMIC_MEDIUM): Promise<void> {
    try {
      if (this.client) {
        await this.client.setex(key, ttl, JSON.stringify(value));
        log.debug('Redis cache set', { key, ttl });
      } else {
        this.fallbackCache.set(key, value, { ttl: ttl * 1000 });
        log.debug('Memory cache set', { key, ttl });
      }
    } catch (error) {
      log.error('Cache set error', { key, error: (error as Error).message });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.client) {
        await this.client.del(key);
      } else {
        this.fallbackCache.delete(key);
      }
      log.debug('Cache deleted', { key });
    } catch (error) {
      log.error('Cache delete error', { key, error: (error as Error).message });
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
          log.debug('Pattern deleted from Redis', { pattern, count: keys.length });
        }
      } else {
        // For in-memory cache, convert pattern to regex
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keys = Array.from(this.fallbackCache.keys());
        let count = 0;
        for (const key of keys) {
          if (regex.test(key as string)) {
            this.fallbackCache.delete(key as string);
            count++;
          }
        }
        if (count > 0) {
          log.debug('Pattern deleted from memory', { pattern, count });
        }
      }
    } catch (error) {
      log.error('Pattern delete error', { pattern, error: (error as Error).message });
    }
  }

  async flush(): Promise<void> {
    try {
      if (this.client) {
        await this.client.flushdb();
      } else {
        this.fallbackCache.clear();
      }
      log.info('Cache flushed');
    } catch (error) {
      log.error('Cache flush error', { error: (error as Error).message });
    }
  }
}

// Global Redis cache instance
export const redisCache = new RedisCache();

/**
 * Cache wrapper function with automatic fallback to fetcher
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_DURATIONS.DYNAMIC_MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = await redisCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Store in cache
  await redisCache.set(key, fresh, ttl);

  return fresh;
}

/**
 * Invalidate cache entries when data changes
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    await redisCache.deletePattern(pattern);
  }
}

/**
 * Invalidate teacher-related caches
 */
export async function invalidateTeacherCache(teacherId: string): Promise<void> {
  await invalidateCache([
    CacheKeys.teacherProfile(teacherId),
    `${CacheKeys.teacherAvailability(teacherId)}*`,
    CacheKeys.teacherSettings(teacherId),
    `${CacheKeys.teacherLessons(teacherId)}*`,
    CacheKeys.recentLessons(teacherId),
  ]);
}

/**
 * Invalidate student-related caches
 */
export async function invalidateStudentCache(studentId: string): Promise<void> {
  await invalidateCache([
    `${CacheKeys.studentLessons(studentId)}*`,
  ]);
}

/**
 * Invalidate lesson-related caches
 */
export async function invalidateLessonCache(
  lessonId: string,
  teacherId: string,
  studentId: string
): Promise<void> {
  await invalidateCache([
    CacheKeys.lessonDetails(lessonId),
    `${CacheKeys.teacherLessons(teacherId)}*`,
    `${CacheKeys.studentLessons(studentId)}*`,
    CacheKeys.recentLessons(teacherId),
    CacheKeys.dashboardStats(teacherId, 'TEACHER'),
    CacheKeys.dashboardStats(studentId, 'STUDENT'),
  ]);
}