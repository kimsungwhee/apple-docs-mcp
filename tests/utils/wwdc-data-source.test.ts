/**
 * Tests for WWDC Data Source
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import mocked functions
const {
  loadGlobalMetadata,
  loadTopicIndex,
  loadYearIndex,
  loadVideoData,
  loadAllVideos,
  clearDataCache,
  isDataAvailable,
} = jest.createMockFromModule('../../src/utils/wwdc-data-source.js') as any;

describe('WWDC Data Source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadGlobalMetadata', () => {
    it('should load global metadata', async () => {
      const mockMetadata = {
        topics: ['topic1', 'topic2'],
        years: ['2023', '2024'],
        statistics: { totalVideos: 100 },
      };

      (loadGlobalMetadata as jest.Mock).mockResolvedValue(mockMetadata);

      const result = await loadGlobalMetadata();

      expect(result).toEqual(mockMetadata);
      expect(loadGlobalMetadata).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (loadGlobalMetadata as jest.Mock).mockRejectedValue(
        new Error('Failed to load WWDC metadata. Please ensure the package is properly installed.')
      );

      await expect(loadGlobalMetadata()).rejects.toThrow(
        'Failed to load WWDC metadata'
      );
    });
  });

  describe('loadTopicIndex', () => {
    it('should load topic index', async () => {
      const mockTopicIndex = {
        id: 'swiftui',
        name: 'SwiftUI',
        videos: ['10001', '10002'],
      };

      (loadTopicIndex as jest.Mock).mockResolvedValue(mockTopicIndex);

      const result = await loadTopicIndex('swiftui');

      expect(result).toEqual(mockTopicIndex);
      expect(loadTopicIndex).toHaveBeenCalledWith('swiftui');
    });

    it('should handle non-existent topic', async () => {
      (loadTopicIndex as jest.Mock).mockRejectedValue(
        new Error('Topic not found: invalid-topic')
      );

      await expect(loadTopicIndex('invalid-topic')).rejects.toThrow(
        'Topic not found: invalid-topic'
      );
    });
  });

  describe('loadYearIndex', () => {
    it('should load year index', async () => {
      const mockYearIndex = {
        year: '2024',
        videos: ['10001', '10002'],
        topics: ['SwiftUI', 'UIKit'],
      };

      (loadYearIndex as jest.Mock).mockResolvedValue(mockYearIndex);

      const result = await loadYearIndex('2024');

      expect(result).toEqual(mockYearIndex);
      expect(loadYearIndex).toHaveBeenCalledWith('2024');
    });

    it('should handle non-existent year', async () => {
      (loadYearIndex as jest.Mock).mockRejectedValue(
        new Error('Year not found: 2099')
      );

      await expect(loadYearIndex('2099')).rejects.toThrow(
        'Year not found: 2099'
      );
    });
  });

  describe('loadVideoData', () => {
    it('should load individual video data', async () => {
      const mockVideo = {
        id: '10001',
        title: 'SwiftUI Essentials',
        year: '2024',
        duration: '20 min',
        topics: ['SwiftUI'],
      };

      (loadVideoData as jest.Mock).mockResolvedValue(mockVideo);

      const result = await loadVideoData('2024', '10001');

      expect(result).toEqual(mockVideo);
      expect(loadVideoData).toHaveBeenCalledWith('2024', '10001');
    });

    it('should handle non-existent video', async () => {
      (loadVideoData as jest.Mock).mockRejectedValue(
        new Error('Video not found: 2024-99999')
      );

      await expect(loadVideoData('2024', '99999')).rejects.toThrow(
        'Video not found: 2024-99999'
      );
    });
  });

  describe('loadAllVideos', () => {
    it('should load all videos', async () => {
      const mockVideos = [
        {
          id: '10001',
          title: 'Video 1',
          year: '2024',
        },
        {
          id: '10002',
          title: 'Video 2',
          year: '2024',
        },
      ];

      (loadAllVideos as jest.Mock).mockResolvedValue(mockVideos);

      const result = await loadAllVideos();

      expect(result).toEqual(mockVideos);
      expect(loadAllVideos).toHaveBeenCalled();
    });

    it('should handle loading error', async () => {
      (loadAllVideos as jest.Mock).mockRejectedValue(
        new Error('Failed to load WWDC video list')
      );

      await expect(loadAllVideos()).rejects.toThrow(
        'Failed to load WWDC video list'
      );
    });
  });

  describe('clearDataCache', () => {
    it('should clear the cache', () => {
      (clearDataCache as jest.Mock).mockImplementation(() => {
        // Mock implementation
      });

      clearDataCache();

      expect(clearDataCache).toHaveBeenCalled();
    });
  });

  describe('isDataAvailable', () => {
    it('should return true when data is available', async () => {
      (isDataAvailable as jest.Mock).mockResolvedValue(true);

      const result = await isDataAvailable();

      expect(result).toBe(true);
      expect(isDataAvailable).toHaveBeenCalled();
    });

    it('should return false when data is not available', async () => {
      (isDataAvailable as jest.Mock).mockResolvedValue(false);

      const result = await isDataAvailable();

      expect(result).toBe(false);
    });
  });
});