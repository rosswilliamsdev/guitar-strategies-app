/**
 * Custom cache handler for Next.js 15
 * 
 * Provides optimized caching for pages, API routes, and static assets
 * using in-memory storage with TTL support.
 */

const LRU = require('lru-cache');

// Cache instances for different types of content
const pageCache = new LRU({
  max: 500, // Maximum number of pages to cache
  ttl: 1000 * 60 * 15, // 15 minutes TTL
  updateAgeOnGet: true,
  allowStale: false,
});

const apiCache = new LRU({
  max: 1000, // Maximum number of API responses to cache
  ttl: 1000 * 60 * 5, // 5 minutes TTL for API routes
  updateAgeOnGet: true,
  allowStale: false,
});

const staticCache = new LRU({
  max: 2000, // Maximum number of static assets to cache
  ttl: 1000 * 60 * 60 * 24, // 24 hours TTL for static content
  updateAgeOnGet: true,
  allowStale: false,
});

class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key, fetchCache) {
    // Determine cache type based on key pattern
    let cache;
    if (key.startsWith('/api/')) {
      cache = apiCache;
    } else if (key.includes('/_next/static/') || key.includes('.css') || key.includes('.js')) {
      cache = staticCache;
    } else {
      cache = pageCache;
    }

    const cached = cache.get(key);
    if (cached) {
      return {
        ...cached,
        isMiss: false,
      };
    }

    return null;
  }

  async set(key, data, ttl) {
    // Determine cache type and TTL
    let cache;
    let cacheTTL = ttl;

    if (key.startsWith('/api/')) {
      cache = apiCache;
      cacheTTL = ttl || 1000 * 60 * 5; // 5 minutes default for API
    } else if (key.includes('/_next/static/') || key.includes('.css') || key.includes('.js')) {
      cache = staticCache;
      cacheTTL = ttl || 1000 * 60 * 60 * 24; // 24 hours for static assets
    } else {
      cache = pageCache;
      cacheTTL = ttl || 1000 * 60 * 15; // 15 minutes for pages
    }

    cache.set(key, data, { ttl: cacheTTL });
  }

  async revalidateTag(tag) {
    // Clear related cache entries based on tags
    const caches = [pageCache, apiCache, staticCache];
    
    caches.forEach(cache => {
      const keys = [...cache.keys()];
      keys.forEach(key => {
        if (key.includes(tag)) {
          cache.delete(key);
        }
      });
    });
  }

  async resetRequestCache() {
    // Clear all caches
    pageCache.clear();
    apiCache.clear();
    // Keep static cache as it's longer-lived
  }

  // Get cache statistics
  getStats() {
    return {
      page: {
        size: pageCache.size,
        max: pageCache.options.max,
        hits: pageCache.calculatedSize,
      },
      api: {
        size: apiCache.size,
        max: apiCache.options.max,
        hits: apiCache.calculatedSize,
      },
      static: {
        size: staticCache.size,
        max: staticCache.options.max,
        hits: staticCache.calculatedSize,
      },
    };
  }
}

module.exports = CacheHandler;