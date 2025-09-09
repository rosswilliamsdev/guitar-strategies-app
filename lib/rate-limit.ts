/**
 * Rate Limiting System for Guitar Strategies API
 * 
 * Provides comprehensive rate limiting with multiple strategies:
 * - In-memory rate limiting for development
 * - Redis-based rate limiting for production
 * - Different limits for different types of endpoints
 * - IP-based and user-based rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { log } from '@/lib/logger';

// Rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // General API endpoints
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many API requests. Please try again later.',
  },
  
  // Lesson booking endpoints - moderate limits
  BOOKING: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 booking attempts per minute
    message: 'Too many booking requests. Please slow down.',
  },
  
  // File upload endpoints - very strict
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 uploads per minute
    message: 'Upload rate limit exceeded. Please wait before uploading again.',
  },
  
  // Email sending endpoints
  EMAIL: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 emails per hour
    message: 'Email rate limit exceeded. Please wait before sending more emails.',
  },
  
  // Dashboard/read-only endpoints - more generous
  READ: {
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    message: 'Rate limit exceeded. Please slow down your requests.',
  },
} as const;

// In-memory store for development
class MemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number; blocked: boolean }>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number; blocked: boolean }> {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || now > current.resetTime) {
      // New window or expired window
      const entry = {
        count: 1,
        resetTime: now + windowMs,
        blocked: false,
      };
      this.store.set(key, entry);
      return entry;
    }

    // Increment existing count
    current.count += 1;
    this.store.set(key, current);
    return current;
  }

  async block(key: string, durationMs: number): Promise<void> {
    const now = Date.now();
    const current = this.store.get(key);
    
    if (current) {
      current.blocked = true;
      current.resetTime = Math.max(current.resetTime, now + durationMs);
      this.store.set(key, current);
    } else {
      this.store.set(key, {
        count: 0,
        resetTime: now + durationMs,
        blocked: true,
      });
    }
  }

  async isBlocked(key: string): Promise<boolean> {
    const current = this.store.get(key);
    if (!current) return false;
    
    if (Date.now() > current.resetTime) {
      this.store.delete(key);
      return false;
    }
    
    return current.blocked;
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Global in-memory store instance
const memoryStore = new MemoryRateLimitStore();

// Cleanup old entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    memoryStore.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Redis-based rate limiter for production
 * Falls back to memory store if Redis is not available
 */
class RedisRateLimitStore {
  private redis: any = null;
  private fallbackStore = memoryStore;

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      // Only initialize Redis in production
      if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
        const { Redis } = await import('ioredis');
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        
        this.redis.on('error', (error: Error) => {
          log.error('Redis connection error, falling back to memory store:', {
            error: error.message,
          });
          this.redis = null;
        });
      }
    } catch (error) {
      log.warn('Failed to initialize Redis, using memory store:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number; blocked: boolean }> {
    // Use Redis if available, otherwise fall back to memory
    if (this.redis) {
      return this.incrementRedis(key, windowMs);
    }
    return this.fallbackStore.increment(key, windowMs);
  }

  private async incrementRedis(key: string, windowMs: number): Promise<{ count: number; resetTime: number; blocked: boolean }> {
    try {
      const now = Date.now();
      const resetTime = now + windowMs;
      const pipeline = this.redis.pipeline();
      
      // Use sliding window with Redis sorted sets
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      const count = results[2][1] as number;
      
      return {
        count,
        resetTime,
        blocked: false, // Blocking logic handled separately
      };
    } catch (error) {
      log.error('Redis increment error, falling back to memory:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackStore.increment(key, windowMs);
    }
  }

  async block(key: string, durationMs: number): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.setex(`blocked:${key}`, Math.ceil(durationMs / 1000), '1');
        return;
      } catch (error) {
        log.error('Redis block error, falling back to memory:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return this.fallbackStore.block(key, durationMs);
  }

  async isBlocked(key: string): Promise<boolean> {
    if (this.redis) {
      try {
        const blocked = await this.redis.get(`blocked:${key}`);
        return !!blocked;
      } catch (error) {
        log.error('Redis isBlocked error, falling back to memory:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return this.fallbackStore.isBlocked(key);
  }
}

// Global rate limit store instance
const rateLimitStore = new RedisRateLimitStore();

/**
 * Generate rate limit key based on IP and optional user ID
 */
function generateRateLimitKey(request: NextRequest, userId?: string, prefix = 'rl'): string {
  const ip = getClientIP(request);
  const baseKey = userId ? `${prefix}:user:${userId}` : `${prefix}:ip:${ip}`;
  return baseKey;
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback for development
  return request.ip || '127.0.0.1';
}

/**
 * Create rate-limited response with proper headers
 */
function createRateLimitResponse(
  message: string,
  retryAfter: number,
  current: { count: number; resetTime: number }
): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message,
      retryAfter,
    },
    { status: 429 }
  );

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', '100'); // Will be dynamic based on endpoint
  response.headers.set('X-RateLimit-Remaining', Math.max(0, 100 - current.count).toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());
  response.headers.set('Retry-After', Math.ceil(retryAfter / 1000).toString());

  return response;
}

/**
 * Main rate limiting middleware function
 */
export async function rateLimit(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'API',
  options: {
    keyPrefix?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  } = {}
): Promise<NextResponse | null> {
  try {
    const config = RATE_LIMITS[limitType];
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Generate rate limit key
    const key = generateRateLimitKey(request, userId, options.keyPrefix || limitType.toLowerCase());
    
    // Check if IP/user is blocked
    const isBlocked = await rateLimitStore.isBlocked(key);
    if (isBlocked) {
      log.warn('Blocked request attempt:', {
        ip: getClientIP(request),
        userId,
        endpoint: request.url,
        limitType,
      });
      
      return createRateLimitResponse(
        'You have been temporarily blocked due to excessive requests.',
        15 * 60 * 1000, // 15 minutes
        { count: config.max + 1, resetTime: Date.now() + 15 * 60 * 1000 }
      );
    }
    
    // Increment rate limit counter
    const result = await rateLimitStore.increment(key, config.windowMs);
    
    // Check if limit exceeded
    if (result.count > config.max) {
      // Log rate limit violation
      log.warn('Rate limit exceeded:', {
        ip: getClientIP(request),
        userId,
        endpoint: request.url,
        limitType,
        count: result.count,
        limit: config.max,
      });
      
      // Block IP/user if they significantly exceed the limit
      if (result.count > config.max * 2) {
        await rateLimitStore.block(key, 15 * 60 * 1000); // Block for 15 minutes
        log.warn('IP/User blocked for excessive requests:', {
          ip: getClientIP(request),
          userId,
          count: result.count,
          limit: config.max,
        });
      }
      
      const retryAfter = result.resetTime - Date.now();
      return createRateLimitResponse(config.message, retryAfter, result);
    }
    
    // Request is allowed - no response means continue
    return null;
    
  } catch (error) {
    // Log error but allow request to continue (fail open)
    log.error('Rate limiting error:', {
      error: error instanceof Error ? error.message : String(error),
      endpoint: request.url,
      limitType,
    });
    
    return null;
  }
}

/**
 * Convenience function for applying rate limiting to API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  limitType: keyof typeof RATE_LIMITS = 'API',
  options?: { keyPrefix?: string; skipSuccessfulRequests?: boolean }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(request, limitType, options);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    return handler(request);
  };
}

/**
 * Express-style middleware for rate limiting (for use with middleware.ts)
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'API'
): Promise<NextResponse | void> {
  const response = await rateLimit(request, limitType);
  if (response) {
    return response;
  }
  // Continue to next middleware/route
}

export default rateLimit;