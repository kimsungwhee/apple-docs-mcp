import { jest } from '@jest/globals';

// Mock the entire cache module
jest.mock('../../src/utils/cache.js', () => ({
  indexCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: jest.fn(() => 0),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, sets: 0, deletes: 0 })),
  },
  searchCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: jest.fn(() => 0),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, sets: 0, deletes: 0 })),
  },
  docCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: jest.fn(() => 0),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, sets: 0, deletes: 0 })),
  },
  technologiesCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: jest.fn(() => 0),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, sets: 0, deletes: 0 })),
  },
  generateUrlCacheKey: jest.fn((url: string, params?: any) => {
    return params ? `${url}?${JSON.stringify(params)}` : url;
  }),
  MemoryCache: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: jest.fn(() => 0),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, sets: 0, deletes: 0 })),
  })),
}));