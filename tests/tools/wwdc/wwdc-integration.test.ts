/**
 * Integration tests for WWDC tools
 */

import { handleToolCall } from '../../../src/tools/handlers';
import { httpClient } from '../../../src/utils/http-client';
import * as wwdcDataSource from '../../../src/utils/wwdc-data-source';

// Mock dependencies
jest.mock('../../../src/utils/http-client');
jest.mock('../../../src/utils/wwdc-data-source');

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;
const mockDataSource = wwdcDataSource as jest.Mocked<typeof wwdcDataSource>;

// Mock server instance
const mockServer = {
  searchAppleDocs: jest.fn(),
  getAppleDocContent: jest.fn(),
  listTechnologies: jest.fn(),
  searchFrameworkSymbols: jest.fn(),
  getRelatedApis: jest.fn(),
  resolveReferencesBatch: jest.fn(),
  getPlatformCompatibility: jest.fn(),
  findSimilarApis: jest.fn(),
  getDocumentationUpdates: jest.fn(),
  getTechnologyOverviews: jest.fn(),
  getSampleCode: jest.fn(),
};

describe('WWDC Tools Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDataSource.loadGlobalMetadata.mockResolvedValue({
      version: '1.0',
      lastUpdated: '2025-01-01',
      totalVideos: 100,
      topics: [
        { id: 'swiftui', name: 'SwiftUI', url: 'https://example.com' },
      ],
      years: ['2025', '2024'],
      statistics: {
        byTopic: { swiftui: 10 },
        byYear: { '2025': 50, '2024': 50 },
        videosWithCode: 80,
        videosWithTranscript: 90,
        videosWithResources: 70,
      },
    });
  });

  describe('list_wwdc_videos tool', () => {
    test('should handle tool call with valid parameters', async () => {
      mockDataSource.loadYearIndex.mockResolvedValue({
        year: '2025',
        videoCount: 1,
        topics: ['SwiftUI'],
        videos: [{
          id: '10188',
          year: '2025',
          title: 'Test Video', 
          topics: ['SwiftUI'],
          duration: '15 min',
          hasCode: true,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          dataFile: 'videos/10188.json'
        }],
      });

      mockDataSource.loadVideosData.mockResolvedValue([{
        id: '10188',
        year: '2025',
        url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
        title: 'Test Video',
        duration: '15 min',
        topics: ['SwiftUI'],
        hasTranscript: true,
        hasCode: true,
        resources: {
          resourceLinks: []
        },
      }]);

      const result = await handleToolCall('list_wwdc_videos', {
        year: '2025',
        limit: 10,
      }, mockServer);

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Test Video');
      expect(result.content[0].text).toContain('WWDC2025');
    });

    test('should validate parameters', async () => {
      const result = await handleToolCall('list_wwdc_videos', {
        year: 123, // Invalid type
      }, mockServer);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('search_wwdc_content tool', () => {
    test('should search through video content', async () => {
      mockDataSource.loadYearIndex.mockResolvedValue({
        year: '2025',
        videoCount: 1,
        topics: ['SwiftUI'],
        videos: [{
          id: '10188',
          year: '2025',
          title: 'Test Video', 
          topics: ['SwiftUI'],
          duration: '15 min',
          hasCode: true,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          dataFile: 'videos/10188.json'
        }],
      });

      mockDataSource.loadVideosData.mockResolvedValue([{
        id: '10188',
        title: 'SwiftUI Basics',
        transcript: {
          segments: [
            { timestamp: '00:00', text: 'Welcome to SwiftUI' },
          ],
          fullText: 'Welcome to SwiftUI',
        },
        codeExamples: [{
          language: 'swift',
          title: 'Example',
          code: 'struct ContentView: View {}',
        }],
        year: '2025',
        url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
        duration: '15 min',
        topics: ['SwiftUI'],
        hasTranscript: true,
        hasCode: true,
        resources: {
          resourceLinks: []
        },
      } as any]);

      const result = await handleToolCall('search_wwdc_content', {
        query: 'SwiftUI',
        searchIn: 'both',
      }, mockServer);

      expect(result.content[0].text).toContain('SwiftUI Basics');
      expect(result.content[0].text).toContain('Welcome to SwiftUI');
    });

    test('should require query parameter', async () => {
      const result = await handleToolCall('search_wwdc_content', {
        searchIn: 'transcript',
      }, mockServer);

      expect(result.isError).toBe(true);
    });
  });

  describe('get_wwdc_video tool', () => {
    test('should get video details', async () => {
      mockDataSource.loadVideoData.mockResolvedValue({
        id: '10188',
        url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
        title: 'Complete Video',
        duration: '30 min',
        topics: ['Testing'],
        hasTranscript: true,
        hasCode: true,
        transcript: {
          segments: [],
          fullText: 'This is the full transcript without truncation',
        },
        codeExamples: [{
          language: 'swift',
          title: 'Code',
          code: 'print("Hello")',
        }],
        resources: {
          resourceLinks: [{
            title: 'Sample',
            url: 'https://example.com',
          }]
        },
        relatedVideos: [],
        year: '2025',
      } as any);

      const result = await handleToolCall('get_wwdc_video', {
        year: '2025',
        videoId: '10188',
      }, mockServer);

      expect(result.content[0].text).toContain('Complete Video');
      expect(result.content[0].text).toContain('30 min');
      // Verify transcript is not truncated
      expect(result.content[0].text).toContain('This is the full transcript without truncation');
      expect(result.content[0].text).not.toContain('[Transcript content too long, truncated...]');
    });

    test('should require both year and videoId', async () => {
      const result = await handleToolCall('get_wwdc_video', {
        year: '2025',
        // Missing videoId
      }, mockServer);

      expect(result.isError).toBe(true);
    });
  });

  describe('browse_wwdc_topics tool', () => {
    test('should list all topics', async () => {
      const result = await handleToolCall('browse_wwdc_topics', {}, mockServer);

      expect(result.content[0].text).toContain('WWDC Topics');
      expect(result.content[0].text).toContain('SwiftUI');
    });

    test('should browse specific topic', async () => {
      mockDataSource.loadTopicIndex.mockResolvedValue({
        id: 'swiftui',
        name: 'SwiftUI',
        videoCount: 1,
        years: ['2025'],
        videos: [{
          id: '10188',
          year: '2025',
          title: 'SwiftUI Video',
          topics: ['SwiftUI'],
          duration: '20 min',
          hasCode: true,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          dataFile: 'videos/10188.json'
        }],
      });

      mockDataSource.loadVideosData.mockResolvedValue([{
        id: '10188',
        title: 'SwiftUI Video',
        year: '2025',
        duration: '20 min',
        hasTranscript: true,
        hasCode: true,
      } as any]);

      const result = await handleToolCall('browse_wwdc_topics', {
        topicId: 'swiftui',
      }, mockServer);

      expect(result.content[0].text).toContain('SwiftUI');
      expect(result.content[0].text).toContain('SwiftUI Video');
    });
  });

  describe('find_related_wwdc_videos tool', () => {
    test('should find related videos', async () => {
      // Mock year index for year-related videos
      mockDataSource.loadYearIndex.mockResolvedValue({
        year: '2025',
        videoCount: 2,
        topics: ['SwiftUI'],
        videos: [{
          id: '10188',
          year: '2025',
          title: 'Source Video',
          topics: ['SwiftUI'],
          duration: '20 min',
          hasCode: true,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          dataFile: 'videos/2025-10188.json'
        }, {
          id: '10189',
          year: '2025',
          title: 'Related Video',
          topics: ['SwiftUI'],
          duration: '15 min',
          hasCode: false,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10189/',
          dataFile: 'videos/2025-10189.json'
        }],
      });

      // Mock global metadata for topic search
      mockDataSource.loadGlobalMetadata.mockResolvedValue({
        topics: [{
          id: 'swiftui-ui-frameworks',
          name: 'SwiftUI & UI Frameworks',
          description: 'SwiftUI and UI frameworks'
        }],
        years: ['2025'],
        videoCount: 2,
        lastUpdated: '2025-01-01'
      });

      // Mock topic index
      mockDataSource.loadTopicIndex.mockResolvedValue({
        id: 'swiftui-ui-frameworks',
        name: 'SwiftUI & UI Frameworks',
        videos: [{
          id: '10188',
          year: '2025',
          title: 'Source Video',
          topics: ['SwiftUI'],
          duration: '20 min',
          hasCode: true,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          dataFile: 'videos/2025-10188.json'
        }, {
          id: '10189',
          year: '2025',
          title: 'Related Video',
          topics: ['SwiftUI'],
          duration: '15 min',
          hasCode: false,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10189/',
          dataFile: 'videos/2025-10189.json'
        }],
        videoCount: 2
      });

      mockDataSource.loadVideoData
        .mockResolvedValueOnce({
          id: '10188',
          title: 'Source Video',
          topics: ['SwiftUI'],
          relatedVideos: [{
            id: '10189',
            year: '2025',
            title: 'Related Video',
            url: 'https://developer.apple.com/videos/play/wwdc2025/10189/'
          }],
          year: '2025',
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          duration: '20 min',
          hasTranscript: true,
          hasCode: true,
          resources: {
            resourceLinks: []
          },
        } as any)
        .mockResolvedValueOnce({
          id: '10189',
          title: 'Related Video',
          year: '2025',
          topics: ['SwiftUI'],
          url: 'https://developer.apple.com/videos/play/wwdc2025/10189/',
          duration: '15 min',
          hasTranscript: true,
          hasCode: false,
          resources: {
            resourceLinks: []
          },
        } as any);

      // Mock loadVideosData for year-related videos
      mockDataSource.loadVideosData.mockResolvedValue([{
        id: '10189',
        title: 'Related Video',
        year: '2025',
        topics: ['SwiftUI'],
        url: 'https://developer.apple.com/videos/play/wwdc2025/10189/',
        duration: '15 min',
        hasTranscript: true,
        hasCode: false,
        resources: {
          resourceLinks: []
        },
      }]);

      const result = await handleToolCall('find_related_wwdc_videos', {
        videoId: '10188',
        year: '2025',
      }, mockServer);

      expect(result.content[0].text).toContain('Source Video');
      expect(result.content[0].text).toContain('Related Video');
    });
  });

  describe('get_wwdc_code_examples tool', () => {
    test('should get code examples', async () => {
      mockDataSource.loadYearIndex.mockResolvedValue({
        year: '2025',
        videoCount: 1,
        topics: ['SwiftUI'],
        videos: [{
          id: '10188',
          year: '2025',
          title: 'Test Video', 
          topics: ['SwiftUI'],
          duration: '15 min',
          hasCode: true,
          hasTranscript: true,
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          dataFile: 'videos/10188.json'
        }],
      });

      mockDataSource.loadVideosData.mockResolvedValue([{
        id: '10188',
        title: 'Code Examples Video',
        codeExamples: [{
          language: 'swift',
          title: 'Example 1',
          code: 'let example = 1',
        }],
        year: '2025',
        url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
        duration: '15 min',
        topics: ['SwiftUI'],
        hasTranscript: true,
        hasCode: true,
        resources: {
          resourceLinks: []
        },
      } as any]);

      const result = await handleToolCall('get_wwdc_code_examples', {
        limit: 10,
      }, mockServer);

      expect(result.content[0].text).toContain('WWDC Code Examples');
      expect(result.content[0].text).toContain('Example 1');
      expect(result.content[0].text).toContain('let example = 1');
    });

    test('should filter by framework', async () => {
      mockDataSource.loadYearIndex.mockResolvedValue({
        year: '2025',
        videoCount: 2,
        topics: ['SwiftUI', 'UIKit'],
        videos: [
          {
            id: '10188',
            year: '2025',
            title: 'SwiftUI Code', 
            topics: ['SwiftUI'],
            duration: '15 min',
            hasCode: true,
            hasTranscript: true,
            url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
            dataFile: 'videos/10188.json'
          },
          {
            id: '10189',
            year: '2025',
            title: 'UIKit Code', 
            topics: ['UIKit'],
            duration: '20 min',
            hasCode: true,
            hasTranscript: true,
            url: 'https://developer.apple.com/videos/play/wwdc2025/10189/',
            dataFile: 'videos/10189.json'
          },
        ],
      });

      mockDataSource.loadVideosData.mockResolvedValue([
        {
          id: '10188',
          year: '2025',
          title: 'SwiftUI Code',
          codeExamples: [{
            language: 'swift',
            title: 'SwiftUI Example',
            code: 'import SwiftUI',
          }],
          url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
          duration: '15 min',
          topics: ['SwiftUI'],
          hasTranscript: true,
          hasCode: true,
          resources: {
            resourceLinks: []
          },
        },
        {
          id: '10189',
          year: '2025',
          title: 'UIKit Code',
          codeExamples: [{
            language: 'swift',
            title: 'UIKit Example',
            code: 'import UIKit',
          }],
          url: 'https://developer.apple.com/videos/play/wwdc2025/10189/',
          duration: '20 min',
          topics: ['UIKit'],
          hasTranscript: true,
          hasCode: true,
          resources: {
            resourceLinks: []
          },
        }
      ] as any);

      const result = await handleToolCall('get_wwdc_code_examples', {
        framework: 'SwiftUI',
      }, mockServer);

      expect(result.content[0].text).toContain('SwiftUI Example');
      expect(result.content[0].text).not.toContain('UIKit Example');
    });
  });

  describe('Error handling', () => {
    test('should handle data source errors gracefully', async () => {
      mockDataSource.loadGlobalMetadata.mockRejectedValue(
        new Error('Failed to load data')
      );

      const result = await handleToolCall('list_wwdc_videos', {}, mockServer);

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Failed to list WWDC videos');
    });

    test('should handle invalid tool name', async () => {
      const result = await handleToolCall('invalid_wwdc_tool', {}, mockServer);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });
  });
});