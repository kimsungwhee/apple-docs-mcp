import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { httpClient } from '../../src/utils/http-client.js';
import { 
  loadGlobalMetadata, 
  loadTopicIndex, 
  loadYearIndex, 
  loadVideoData,
  clearDataCache 
} from '../../src/utils/wwdc-data-source.js';
import { WWDC_DATA_SOURCE_CONFIG } from '../../src/utils/constants.js';

// Mock httpClient
jest.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

const mockedHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('WWDC Data Source with jsDelivr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearDataCache();
    // Force use of GitHub data source (which now uses jsDelivr)
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe('jsDelivr URL Construction', () => {
    it('should use jsDelivr CDN URL for fetching data', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          topics: [{ id: 'test-topic', name: 'Test Topic' }],
          years: ['2024', '2025'],
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      await loadGlobalMetadata('github' as any);

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/gh/kimsungwhee/apple-docs-mcp@main/data/wwdc/index.json'
      );
    });

    it('should construct correct jsDelivr URL for topic index', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          topic: { id: 'swift', name: 'Swift' },
          videos: [],
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      await loadTopicIndex('swift', 'github' as any);

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/gh/kimsungwhee/apple-docs-mcp@main/data/wwdc/by-topic/swift/index.json'
      );
    });

    it('should construct correct jsDelivr URL for year index', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          year: '2025',
          videos: [],
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      await loadYearIndex('2025', 'github' as any);

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/gh/kimsungwhee/apple-docs-mcp@main/data/wwdc/by-year/2025/index.json'
      );
    });

    it('should construct correct jsDelivr URL for video data', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          id: '101',
          year: '2025',
          title: 'Test Video',
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      await loadVideoData('videos/2025-101.json', 'github' as any);

      expect(mockedHttpClient.get).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/gh/kimsungwhee/apple-docs-mcp@main/data/wwdc/videos/2025-101.json'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle jsDelivr fetch errors gracefully', async () => {
      mockedHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(loadGlobalMetadata('github' as any)).rejects.toThrow(
        'Failed to load global metadata: Failed to fetch index.json from GitHub: Network error'
      );
    });

    it('should handle rate limiting errors', async () => {
      mockedHttpClient.get.mockRejectedValue(new Error('403 Forbidden'));

      await expect(loadYearIndex('2025', 'github' as any)).rejects.toThrow(
        'Failed to load year index 2025: Failed to fetch by-year/2025/index.json from GitHub: 403 Forbidden'
      );
    });
  });

  describe('Caching', () => {
    it('should cache successful jsDelivr requests', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(JSON.stringify({
          topics: [],
          years: [],
        })),
      };
      mockedHttpClient.get.mockResolvedValue(mockResponse as any);

      // First call - should hit the network
      await loadGlobalMetadata('github' as any);
      expect(mockedHttpClient.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await loadGlobalMetadata('github' as any);
      expect(mockedHttpClient.get).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  describe('jsDelivr vs GitHub Raw URL', () => {
    it('should verify jsDelivr URL format is different from GitHub raw', () => {
      const baseUrl = WWDC_DATA_SOURCE_CONFIG.github.baseUrl;
      
      // Verify it's using jsDelivr format
      expect(baseUrl).toContain('cdn.jsdelivr.net');
      expect(baseUrl).toContain('/gh/');
      expect(baseUrl).toContain('@main');
      
      // Verify it's NOT using GitHub raw format
      expect(baseUrl).not.toContain('raw.githubusercontent.com');
      expect(baseUrl).not.toContain('/main/');
    });
  });
});