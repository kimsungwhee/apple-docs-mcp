/**
 * Cache related types
 */

/**
 * Cache entry with value and TTL
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxEntries: number; // Maximum number of entries
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}