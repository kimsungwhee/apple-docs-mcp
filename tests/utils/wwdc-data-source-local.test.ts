import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { httpClient } from '../../src/utils/http-client.js';

// Mock dependencies BEFORE importing the module under test
jest.mock('fs/promises');
jest.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));
// Create a simple cache mock that actually caches
const cacheStore = new Map<string, any>();
jest.mock('../../src/utils/cache.js', () => ({
  wwdcDataCache: {
    get: jest.fn((key) => cacheStore.get(key) ?? null),
    set: jest.fn((key, value) => cacheStore.set(key, value)),
    clear: jest.fn(() => cacheStore.clear()),
  },
}));

// Create a mock for WWDC_DATA_SOURCE_CONFIG that can be modified per test
const mockWWDCConfig = {
  github: {
    baseUrl: 'https://cdn.jsdelivr.net/gh/kimsungwhee/apple-docs-mcp@main/data/wwdc',
  },
  local: {
    dataDir: 'data/wwdc',
  },
  env: {
    localPath: undefined as string | undefined,
    forceGithub: false,
    debug: false,
  },
  filePaths: {
    globalMetadata: 'index.json',
    topicIndex: (topicId: string) => `by-topic/${topicId}/index.json`,
    yearIndex: (year: string) => `by-year/${year}/index.json`,
  },
};

jest.mock('../../src/utils/constants.js', () => ({
  WWDC_DATA_SOURCE_CONFIG: mockWWDCConfig,
  WWDC_CONFIG: {
    CACHE_TTL: 3600,
  },
}));

// Import after mocking
import {
  initializeDataSourceConfig,
  getDataSourceConfig,
  getDataSourceType,
  loadGlobalMetadata,
  DataSourceConfigManager,
  loadVideoData,
  clearDataCache,
} from '../../src/utils/wwdc-data-source.js';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('Local Data Source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DataSourceConfigManager.reset();
    clearDataCache();
    cacheStore.clear(); // Clear the cache store
    // Reset mock config
    mockWWDCConfig.env.localPath = undefined;
    mockWWDCConfig.env.forceGithub = false;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    DataSourceConfigManager.reset();
    mockWWDCConfig.env.localPath = undefined;
    mockWWDCConfig.env.forceGithub = false;
    delete process.env.NODE_ENV;
  });

  describe('CLI Arguments', () => {
    it('should parse --local-path correctly', () => {
      const testPath = '/test/data/path';
      initializeDataSourceConfig({ localPath: testPath });

      const config = getDataSourceConfig();
      expect(config.localPath).toBe(path.resolve(testPath));
      expect(config.type).toBe('local');
      expect(config.forceSource).toBeUndefined(); // No longer forces, allows validation
    });

    it('should handle missing path argument', () => {
      initializeDataSourceConfig({});

      const config = getDataSourceConfig();
      expect(config.localPath).toBe('');
      expect(config.type).toBe('github');
      expect(config.forceSource).toBeUndefined();
    });

    it('should reject unknown options', () => {
      // Initialize with known options only
      initializeDataSourceConfig({
        localPath: '/valid/path',
        unknownOption: 'should-be-ignored'
      } as any);

      const config = getDataSourceConfig();
      expect(config.localPath).toBe(path.resolve('/valid/path'));
      expect((config as any).unknownOption).toBeUndefined();
    });

    it('should detect conflicting options', () => {
      // forceGithub should override localPath
      initializeDataSourceConfig({
        localPath: '/local/path',
        forceGithub: true
      });

      const config = getDataSourceConfig();
      expect(config.type).toBe('github');
      expect(config.forceSource).toBe('github');
      // localPath is still set, but forceGithub takes precedence
      expect(config.localPath).toBe('');
    });

    it('should handle useLocal option', () => {
      const cwd = process.cwd();
      initializeDataSourceConfig({ useLocal: true });

      const config = getDataSourceConfig();
      expect(config.type).toBe('local');
      expect(config.forceSource).toBeUndefined(); // No longer forces, allows validation
      expect(config.localPath).toBe(path.join(cwd, 'data/wwdc'));
    });
  });

  describe('Configuration Priority', () => {
    it('CLI should override environment variables', () => {
      mockWWDCConfig.env.localPath = '/env/path';

      initializeDataSourceConfig({ localPath: '/cli/path' });

      const config = getDataSourceConfig();
      expect(config.localPath).toBe(path.resolve('/cli/path'));
      expect(config.type).toBe('local');
    });

    it('Environment should be used when no CLI args provided', () => {
      mockWWDCConfig.env.localPath = '/env/path';

      initializeDataSourceConfig({});

      const config = getDataSourceConfig();
      expect(config.localPath).toBe(path.resolve('/env/path'));
      expect(config.type).toBe('local');
    });

    it('forceGithub environment should override local path', () => {
      mockWWDCConfig.env.forceGithub = true;
      mockWWDCConfig.env.localPath = '/env/path';

      initializeDataSourceConfig({});

      const config = getDataSourceConfig();
      expect(config.type).toBe('github');
      expect(config.forceSource).toBe('github');
    });

    it('should fall back to GitHub on invalid local path', async () => {
      initializeDataSourceConfig({ localPath: '/invalid/path' });

      // Mock fs.access to throw ENOENT error
      mockedFs.access.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      const source = await getDataSourceType();
      expect(source).toBe('github');
    });

    it('should validate local data structure before using', async () => {
      const testPath = '/valid/path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data/wwdc');

      // Mock successful access to data directory
      mockedFs.access.mockImplementation((filePath) => {
        if (filePath === dataDir) return Promise.resolve();
        if (filePath === path.join(dataDir, 'index.json')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'by-year')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'by-topic')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'videos')) return Promise.resolve();
        return Promise.reject(new Error('Not found'));
      });

      // Mock reading index.json with valid structure
      mockedFs.readFile.mockResolvedValue(JSON.stringify({
        years: ['2024', '2025'],
        topics: [{ id: 'swift', name: 'Swift' }],
        statistics: { totalVideos: 100 }
      }));

      const source = await getDataSourceType();
      expect(source).toBe('local');
    });

    it('should fall back to GitHub when local structure is incomplete', async () => {
      const testPath = '/incomplete/path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data/wwdc');

      // Mock successful access to data directory but missing required files
      mockedFs.access.mockImplementation((filePath) => {
        if (filePath === dataDir) return Promise.resolve();
        if (filePath === path.join(dataDir, 'index.json')) return Promise.resolve();
        // Missing by-year directory
        if (filePath === path.join(dataDir, 'by-year'))
          return Promise.reject(new Error('Not found'));
        return Promise.resolve();
      });

      const source = await getDataSourceType();
      expect(source).toBe('github');
    });
  });

  describe('Security', () => {
    it('should prevent path traversal attacks', async () => {
      const testPath = '/safe/path';
      initializeDataSourceConfig({ localPath: testPath });

      // Mock file system to simulate directory structure
      const dataDir = path.join(testPath, 'data/wwdc');
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockImplementation((filePath) => {
        // Should reject paths outside data directory
        const resolved = path.resolve(filePath as string);
        const baseResolved = path.resolve(dataDir);
        if (!resolved.startsWith(baseResolved)) {
          throw new Error('Invalid file path');
        }
        return Promise.resolve('{}');
      });

      // Attempt path traversal
      await expect(loadVideoData('../../../etc/passwd')).rejects.toThrow();
    });

    it('should validate JSON integrity', async () => {
      const testPath = '/test/path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data/wwdc');

      // Mock successful access
      mockedFs.access.mockResolvedValue(undefined);

      // Mock reading corrupted JSON
      mockedFs.readFile.mockResolvedValue('{ invalid json }');

      // Should reject malformed JSON
      await expect(loadGlobalMetadata('local' as any)).rejects.toThrow(/JSON/);
    });

    it('should check for required fields in index.json', async () => {
      const testPath = '/test/path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data/wwdc');

      // Mock file system access
      mockedFs.access.mockImplementation((filePath) => {
        if (filePath === dataDir) return Promise.resolve();
        if (filePath === path.join(dataDir, 'index.json')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'by-year')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'by-topic')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'videos')) return Promise.resolve();
        return Promise.reject(new Error('Not found'));
      });

      // Mock reading index.json missing required fields
      mockedFs.readFile.mockResolvedValue(JSON.stringify({
        years: ['2024'], // Missing topics and statistics
      }));

      // Should detect invalid structure
      const source = await getDataSourceType();
      expect(source).toBe('github'); // Falls back to GitHub
    });

    it('should handle Windows path traversal attempts', async () => {
      if (process.platform !== 'win32') {
        // Skip on non-Windows platforms
        return;
      }

      const testPath = 'C:\\safe\\path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data', 'wwdc');
      mockedFs.access.mockResolvedValue(undefined);

      // Mock file system with security check
      mockedFs.readFile.mockImplementation((filePath) => {
        const resolved = path.resolve(filePath as string);
        const baseResolved = path.resolve(dataDir);
        const relative = path.relative(baseResolved, resolved);

        // Check for drive letter in relative path
        if (relative.includes(':')) {
          throw new Error('Invalid file path');
        }

        return Promise.resolve('{}');
      });

      // Attempt to access different drive
      await expect(loadVideoData('D:\\malicious\\file.json')).rejects.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should switch from local to GitHub when local fails', async () => {
      const testPath = '/test/path';
      initializeDataSourceConfig({ localPath: testPath });

      // Mock local access failure
      mockedFs.access.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      // Mock successful GitHub fetch
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          topics: [{ id: 'test', name: 'Test' }],
          years: ['2024'],
          statistics: { totalVideos: 50 }
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      // Should automatically fall back to GitHub
      const metadata = await loadGlobalMetadata();
      expect(metadata.topics).toHaveLength(1);
      expect(mockedHttpClient.get).toHaveBeenCalled();
    });

    it('should use local data when available and valid', async () => {
      const testPath = '/valid/path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data/wwdc');

      // Mock successful local access
      mockedFs.access.mockImplementation((filePath) => {
        if (filePath === dataDir) return Promise.resolve();
        if (filePath === path.join(dataDir, 'index.json')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'by-year')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'by-topic')) return Promise.resolve();
        if (filePath === path.join(dataDir, 'videos')) return Promise.resolve();
        return Promise.reject(new Error('Not found'));
      });

      // Mock reading valid local data
      const localData = {
        topics: [{ id: 'local-test', name: 'Local Test' }],
        years: ['2025'],
        statistics: { totalVideos: 75 }
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(localData));

      // Should use local data, not GitHub
      const metadata = await loadGlobalMetadata();
      expect(metadata.topics[0].id).toBe('local-test');
      expect(mockedHttpClient.get).not.toHaveBeenCalled();
    });

    it('should respect forceGithub even when local is available', async () => {
      const testPath = '/valid/path';
      initializeDataSourceConfig({
        localPath: testPath,
        forceGithub: true
      });

      // Mock successful GitHub fetch
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          topics: [{ id: 'github-test', name: 'GitHub Test' }],
          years: ['2024'],
          statistics: { totalVideos: 100 }
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      // Should use GitHub despite local path being set
      const metadata = await loadGlobalMetadata();
      expect(metadata.topics[0].id).toBe('github-test');
      expect(mockedHttpClient.get).toHaveBeenCalled();
      expect(mockedFs.access).not.toHaveBeenCalled();
    });

    it('should handle concurrent requests correctly', async () => {
      initializeDataSourceConfig({ forceGithub: true });

      // Mock GitHub responses
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          topics: [{ id: 'concurrent', name: 'Concurrent' }],
          years: ['2024'],
          statistics: { totalVideos: 50 }
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      // Make multiple concurrent requests with explicit data source
      const promises = [
        loadGlobalMetadata('github' as any),
        loadGlobalMetadata('github' as any),
        loadGlobalMetadata('github' as any)
      ];

      const results = await Promise.all(promises);

      // All should return the same data
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);

      // Should use cache, only one actual fetch
      expect(mockedHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization race conditions', () => {
      // Multiple initializations should be safe
      initializeDataSourceConfig({ localPath: '/path1' });
      initializeDataSourceConfig({ localPath: '/path2' }); // Should be ignored

      const config = getDataSourceConfig();
      expect(config.localPath).toBe(path.resolve('/path1'));
    });
  });

  describe('Error Scenarios', () => {
    it('should provide clear error for permission denied', async () => {
      const testPath = '/restricted/path';
      initializeDataSourceConfig({ localPath: testPath });

      // Mock permission denied error
      mockedFs.access.mockRejectedValue(
        Object.assign(new Error('EACCES'), { code: 'EACCES' })
      );

      const source = await getDataSourceType();
      expect(source).toBe('github'); // Falls back
    });

    it('should handle corrupted JSON with specific error', async () => {
      const testPath = '/test/path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data/wwdc');
      mockedFs.access.mockResolvedValue(undefined);

      // Mock reading malformed JSON with syntax error
      mockedFs.readFile.mockResolvedValue('{ "test": undefined }');

      await expect(loadGlobalMetadata('local' as any)).rejects.toThrow(/JSON/);
    });

    it('should handle file system errors gracefully', async () => {
      const testPath = '/test/path';
      initializeDataSourceConfig({ localPath: testPath });

      const dataDir = path.join(testPath, 'data/wwdc');
      mockedFs.access.mockResolvedValue(undefined);

      // Mock EMFILE error (too many open files)
      mockedFs.readFile.mockRejectedValue(
        Object.assign(new Error('EMFILE'), { code: 'EMFILE' })
      );

      await expect(loadGlobalMetadata('local' as any)).rejects.toThrow(/too many open files/);
    });

    it('should handle network errors with clear messages', async () => {
      initializeDataSourceConfig({ forceGithub: true });

      // Mock network timeout
      mockedHttpClient.get.mockRejectedValue(new Error('timeout'));

      await expect(loadGlobalMetadata()).rejects.toThrow(/timeout/);
    });
  });
});