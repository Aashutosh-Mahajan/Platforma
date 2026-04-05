/**
 * Simple in-memory cache for API responses
 * Helps reduce redundant API calls and improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // Default TTL: 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.expiresIn;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with optional custom TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists and hasn't expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries from cache
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.expiresIn) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const apiCache = new APICache();

// Run cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * Helper function to create cache keys from URL and params
 */
export const createCacheKey = (url: string, params?: Record<string, any>): string => {
  if (!params) {
    return url;
  }

  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&');

  return `${url}?${sortedParams}`;
};
