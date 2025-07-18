/**
 * Simple in-memory cache with TTL (Time To Live) support
 */

import type { CacheEntry } from '../types/cache.js';

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 1000, defaultTTL: number = 30 * 60 * 1000) { // 30 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { 
    size: number; 
    maxSize: number; 
    hitRate: string;
    hits: number;
    misses: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0.00%';
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Get or set with async function
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch new data
    const data = await fetchFn();

    // Store in cache
    this.set(key, data, ttl);

    return data;
  }
}

import { CACHE_SIZE, CACHE_TTL } from './constants.js';

// Create different cache instances for different types of data
export const apiCache = new MemoryCache(CACHE_SIZE.API_DOCS, CACHE_TTL.API_DOCS);
export const searchCache = new MemoryCache(CACHE_SIZE.SEARCH_RESULTS, CACHE_TTL.SEARCH_RESULTS);
export const indexCache = new MemoryCache(CACHE_SIZE.FRAMEWORK_INDEX, CACHE_TTL.FRAMEWORK_INDEX);
export const technologiesCache = new MemoryCache(CACHE_SIZE.TECHNOLOGIES, CACHE_TTL.TECHNOLOGIES);
export const updatesCache = new MemoryCache(CACHE_SIZE.UPDATES, CACHE_TTL.UPDATES);
export const sampleCodeCache = new MemoryCache(CACHE_SIZE.SAMPLE_CODE, CACHE_TTL.SAMPLE_CODE);
export const technologyOverviewsCache = new MemoryCache(
  CACHE_SIZE.TECHNOLOGY_OVERVIEWS,
  CACHE_TTL.TECHNOLOGY_OVERVIEWS,
);

/**
 * Generate cache key for URL-based requests
 */
export function generateUrlCacheKey(url: string, params?: Record<string, unknown>): string {
  let key = url;
  if (params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    key += `?${sortedParams}`;
  }
  return key;
}

/**
 * Generate cache key for enhanced analysis
 */
export function generateEnhancedCacheKey(
  url: string,
  options: {
    includeRelatedApis?: boolean;
    includeReferences?: boolean;
    includeSimilarApis?: boolean;
    includePlatformAnalysis?: boolean;
  },
): string {
  return generateUrlCacheKey(url, options);
}

/**
 * Cache decorator for async functions
 */
export function cached<T>(
  cache: MemoryCache,
  keyGenerator: (...args: unknown[]) => string,
  ttl?: number,
) {
  return function (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<T> {
      const key = keyGenerator(...args);

      return cache.getOrSet(
        key,
        () => method.apply(this, args),
        ttl,
      );
    };
  };
}