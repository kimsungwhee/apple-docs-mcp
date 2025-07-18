import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MemoryCache, getCacheInstance, withCache } from '../../src/utils/cache.js';

describe('Cache System', () => {
  describe('MemoryCache', () => {
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache(3, 1000); // Small cache for testing
    });

    afterEach(() => {
      cache.clear();
    });

    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should respect TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should handle has() method correctly', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.delete('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.size()).toBe(0);
    });

    it('should respect max size and evict oldest entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.size()).toBe(3);
    });

    it('should return correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('should get all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const entries = cache.entries();
      
      expect(entries).toHaveLength(2);
      expect(entries.find(e => e[0] === 'key1')?.[1]).toBe('value1');
      expect(entries.find(e => e[0] === 'key2')?.[1]).toBe('value2');
    });

    it('should handle cleanup of expired entries', async () => {
      const cleanupSpy = jest.spyOn(cache as any, 'cleanup');
      
      // Create a new cache with shorter cleanup interval
      const testCache = new MemoryCache(10, 1000);
      
      // Set some entries with short TTL
      testCache.set('key1', 'value1', 50);
      testCache.set('key2', 'value2', 50);
      
      // Wait for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(testCache.get('key1')).toBeUndefined();
      expect(testCache.get('key2')).toBeUndefined();
      
      testCache.clear();
    });
  });

  describe('getCacheInstance', () => {
    it('should return the same instance for the same name', () => {
      const cache1 = getCacheInstance('test');
      const cache2 = getCacheInstance('test');
      expect(cache1).toBe(cache2);
    });

    it('should return different instances for different names', () => {
      const cache1 = getCacheInstance('test1');
      const cache2 = getCacheInstance('test2');
      expect(cache1).not.toBe(cache2);
    });

    it('should create instances with default parameters', () => {
      const cache = getCacheInstance('test');
      expect(cache).toBeInstanceOf(MemoryCache);
      expect(cache.size()).toBe(0);
    });

    it('should use provided configuration', () => {
      const cache = getCacheInstance('test-custom', 5, 500);
      expect(cache).toBeInstanceOf(MemoryCache);
      
      // Test max size
      for (let i = 1; i <= 6; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size()).toBe(5);
      expect(cache.has('key1')).toBe(false); // First key should be evicted
    });
  });

  describe('withCache decorator', () => {
    let mockFunction: jest.Mock;
    let decoratedFunction: any;

    beforeEach(() => {
      mockFunction = jest.fn();
      const cache = new MemoryCache(10, 1000);
      
      // Create a simple class to test the decorator
      class TestClass {
        @withCache(cache, (arg1: string, arg2: number) => `${arg1}-${arg2}`)
        async testMethod(arg1: string, arg2: number): Promise<string> {
          return mockFunction(arg1, arg2);
        }
      }
      
      const instance = new TestClass();
      decoratedFunction = instance.testMethod.bind(instance);
    });

    it('should cache function results', async () => {
      mockFunction.mockResolvedValue('result1');
      
      // First call should execute the function
      const result1 = await decoratedFunction('test', 1);
      expect(result1).toBe('result1');
      expect(mockFunction).toHaveBeenCalledTimes(1);
      
      // Second call with same args should return cached result
      const result2 = await decoratedFunction('test', 1);
      expect(result2).toBe('result1');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should use different cache keys for different arguments', async () => {
      mockFunction.mockResolvedValueOnce('result1').mockResolvedValueOnce('result2');
      
      const result1 = await decoratedFunction('test', 1);
      expect(result1).toBe('result1');
      
      const result2 = await decoratedFunction('test', 2);
      expect(result2).toBe('result2');
      
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });

    it('should handle function errors', async () => {
      mockFunction.mockRejectedValue(new Error('Test error'));
      
      await expect(decoratedFunction('test', 1)).rejects.toThrow('Test error');
      expect(mockFunction).toHaveBeenCalledTimes(1);
      
      // Error should not be cached
      await expect(decoratedFunction('test', 1)).rejects.toThrow('Test error');
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });

    it('should work with synchronous functions', () => {
      const cache = new MemoryCache(10, 1000);
      const syncMock = jest.fn().mockReturnValue('sync result');
      
      class TestClass {
        @withCache(cache, (arg: string) => arg)
        testMethod(arg: string): string {
          return syncMock(arg);
        }
      }
      
      const instance = new TestClass();
      
      expect(instance.testMethod('test')).toBe('sync result');
      expect(instance.testMethod('test')).toBe('sync result');
      expect(syncMock).toHaveBeenCalledTimes(1);
    });

    it('should use default key generator when not provided', () => {
      const cache = new MemoryCache(10, 1000);
      const mock = jest.fn().mockResolvedValue('result');
      
      class TestClass {
        @withCache(cache)
        async testMethod(arg1: any, arg2: any): Promise<string> {
          return mock(arg1, arg2);
        }
      }
      
      const instance = new TestClass();
      
      // Should work with default key generator
      instance.testMethod({ id: 1 }, ['a', 'b']).then(result => {
        expect(result).toBe('result');
        expect(mock).toHaveBeenCalledTimes(1);
      });
    });
  });
});