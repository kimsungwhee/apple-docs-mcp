import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleToolCall, toolHandlers } from '../../src/tools/handlers.js';
import * as schemas from '../../src/schemas/index.js';

// Mock all tool implementations
jest.mock('../../src/tools/search-parser.js');
jest.mock('../../src/tools/doc-fetcher.js');
jest.mock('../../src/tools/list-technologies.js');
jest.mock('../../src/tools/search-framework-symbols.js');
jest.mock('../../src/tools/get-related-apis.js');
jest.mock('../../src/tools/resolve-references-batch.js');
jest.mock('../../src/tools/get-platform-compatibility.js');
jest.mock('../../src/tools/find-similar-apis.js');
jest.mock('../../src/tools/get-documentation-updates.js');
jest.mock('../../src/tools/get-technology-overviews.js');
jest.mock('../../src/tools/get-sample-code.js');

// Mock wwdc-data-source to avoid import.meta.url issues
jest.mock('../../src/utils/wwdc-data-source.js');

// Mock WWDC handlers
jest.mock('../../src/tools/wwdc/wwdc-handlers.js', () => ({
  handleListWWDCVideos: jest.fn().mockResolvedValue('WWDC Videos'),
  handleSearchWWDCContent: jest.fn().mockResolvedValue('WWDC Search Results'),
  handleGetWWDCVideo: jest.fn().mockResolvedValue('WWDC Video Details'),
  handleGetWWDCCodeExamples: jest.fn().mockResolvedValue('WWDC Code Examples'),
  handleBrowseWWDCTopics: jest.fn().mockResolvedValue('WWDC Topics'),
  handleFindRelatedWWDCVideos: jest.fn().mockResolvedValue('Related WWDC Videos'),
  handleListWWDCYears: jest.fn().mockResolvedValue('WWDC Years'),
}));

describe('Tool Handlers', () => {
  let mockServer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock server with all required methods
    mockServer = {
      searchAppleDocs: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Search results' }],
      }),
      getAppleDocContent: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Doc content' }],
      }),
      listTechnologies: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Technologies list' }],
      }),
      searchFrameworkSymbols: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Framework symbols' }],
      }),
      getRelatedApis: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Related APIs' }],
      }),
      resolveReferencesBatch: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Resolved references' }],
      }),
      getPlatformCompatibility: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Platform compatibility' }],
      }),
      findSimilarApis: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Similar APIs' }],
      }),
      getDocumentationUpdates: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Documentation updates' }],
      }),
      getTechnologyOverviews: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Technology overviews' }],
      }),
      getSampleCode: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Sample code' }],
      }),
      searchAppleDesignDocs: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Design search results' }],
      }),
      getAppleDesignContent: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Design content' }],
      }),
      listAppleDesignResources: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Design resources' }],
      }),
      downloadAppleDesignResource: jest.fn().mockResolvedValue({
        content: [
          { type: 'text', text: 'Downloaded resource' },
          {
            type: 'resource_link',
            uri: 'apple-design://cache/test/example.zip',
            name: 'example.zip',
            mimeType: 'application/zip',
          },
        ],
      }),
      getAppleDesignExamples: jest.fn().mockResolvedValue({
        content: [
          { type: 'text', text: 'Design examples' },
          {
            type: 'image',
            data: Buffer.from('image').toString('base64'),
            mimeType: 'image/png',
          },
        ],
      }),
    };
  });

  describe('handleToolCall', () => {
    it('should throw error for unknown tool', async () => {
      const result = await handleToolCall('unknown_tool', {}, mockServer);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool: unknown_tool');
    });

    it('should handle search_apple_docs tool', async () => {
      const args = { query: 'SwiftUI', type: 'all' };
      const result = await handleToolCall('search_apple_docs', args, mockServer);
      
      expect(mockServer.searchAppleDocs).toHaveBeenCalledWith('SwiftUI', 'all');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Search results' }],
      });
    });

    it('should handle get_apple_doc_content tool', async () => {
      const args = {
        url: 'https://developer.apple.com/documentation/swiftui',
        includeRelatedApis: true,
        includeReferences: false,
      };
      const result = await handleToolCall('get_apple_doc_content', args, mockServer);
      
      expect(mockServer.getAppleDocContent).toHaveBeenCalledWith(
        'https://developer.apple.com/documentation/swiftui',
        true,
        false,
        false,
        false,
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Doc content' }],
      });
    });

    it('should handle search_apple_design_docs tool', async () => {
      const args = { query: 'layout', contentType: 'all', platform: 'iOS', limit: 5 };
      const result = await handleToolCall('search_apple_design_docs', args, mockServer);

      expect(mockServer.searchAppleDesignDocs).toHaveBeenCalledWith('layout', 'all', 'iOS', 5);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Design search results' }],
      });
    });

    it('should handle get_apple_design_content tool', async () => {
      const args = { url: 'https://developer.apple.com/design/human-interface-guidelines/layout' };
      const result = await handleToolCall('get_apple_design_content', args, mockServer);

      expect(mockServer.getAppleDesignContent).toHaveBeenCalledWith(args.url);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Design content' }],
      });
    });

    it('should handle list_apple_design_resources tool', async () => {
      const args = {
        category: 'Design templates',
        platform: 'iOS',
        format: 'figma',
        searchQuery: 'template',
        limit: 10,
      };
      const result = await handleToolCall('list_apple_design_resources', args, mockServer);

      expect(mockServer.listAppleDesignResources).toHaveBeenCalledWith(
        'Design templates',
        'iOS',
        'figma',
        'template',
        10,
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Design resources' }],
      });
    });

    it('should handle list_apple_design_resources tool with omitted arguments', async () => {
      const result = await handleToolCall('list_apple_design_resources', undefined, mockServer);

      expect(mockServer.listAppleDesignResources).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        50,
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Design resources' }],
      });
    });

    it('should handle download_apple_design_resource tool with resource links', async () => {
      const args = { resourceId: 'design-resource:templates:ios:download' };
      const result = await handleToolCall('download_apple_design_resource', args, mockServer);

      expect(mockServer.downloadAppleDesignResource).toHaveBeenCalledWith(
        'design-resource:templates:ios:download',
        undefined,
        undefined,
      );
      expect(result.content).toEqual([
        { type: 'text', text: 'Downloaded resource' },
        {
          type: 'resource_link',
          uri: 'apple-design://cache/test/example.zip',
          name: 'example.zip',
          mimeType: 'application/zip',
        },
      ]);
    });

    it('should handle download_apple_design_resource tool with omitted arguments', async () => {
      await handleToolCall('download_apple_design_resource', undefined, mockServer);

      expect(mockServer.downloadAppleDesignResource).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
      );
    });

    it('should handle get_apple_design_examples tool with image blocks', async () => {
      const args = {
        url: 'https://developer.apple.com/design/human-interface-guidelines/layout',
        limit: 1,
      };
      const result = await handleToolCall('get_apple_design_examples', args, mockServer);

      expect(mockServer.getAppleDesignExamples).toHaveBeenCalledWith(args.url, undefined, undefined, 1);
      expect(result.content).toEqual([
        { type: 'text', text: 'Design examples' },
        {
          type: 'image',
          data: Buffer.from('image').toString('base64'),
          mimeType: 'image/png',
        },
      ]);
    });

    it('should handle get_apple_design_examples tool with omitted arguments', async () => {
      const result = await handleToolCall('get_apple_design_examples', undefined, mockServer);

      expect(mockServer.getAppleDesignExamples).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        3,
      );
      expect(result.content).toEqual([
        { type: 'text', text: 'Design examples' },
        {
          type: 'image',
          data: Buffer.from('image').toString('base64'),
          mimeType: 'image/png',
        },
      ]);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock schema parse to throw validation error
      jest.spyOn(schemas.searchAppleDocsSchema, 'parse').mockImplementationOnce(() => {
        throw new Error('Validation failed: query is required');
      });

      const result = await handleToolCall('search_apple_docs', {}, mockServer);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation failed: query is required');
    });
  });

  describe('toolHandlers', () => {
    it('should have handlers for all expected tools', () => {
      const expectedTools = [
        'search_apple_docs',
        'get_apple_doc_content',
        'list_technologies',
        'search_framework_symbols',
        'get_related_apis',
        'resolve_references_batch',
        'get_platform_compatibility',
        'find_similar_apis',
        'get_documentation_updates',
        'get_technology_overviews',
        'get_sample_code',
        'search_apple_design_docs',
        'get_apple_design_content',
        'list_apple_design_resources',
        'download_apple_design_resource',
        'get_apple_design_examples',
      ];

      expectedTools.forEach(tool => {
        expect(toolHandlers[tool]).toBeDefined();
        expect(typeof toolHandlers[tool]).toBe('function');
      });
    });

    it('should handle list_technologies with optional parameters', async () => {
      const handler = toolHandlers.list_technologies;
      const args = { category: 'games', language: 'swift', includeBeta: false };
      
      await handler(args, mockServer);
      
      expect(mockServer.listTechnologies).toHaveBeenCalledWith('games', 'swift', false, 200);
    });

    it('should handle list_technologies with limit parameter', async () => {
      const handler = toolHandlers.list_technologies;
      const args = { category: 'ui', limit: 10 };
      
      await handler(args, mockServer);
      
      expect(mockServer.listTechnologies).toHaveBeenCalledWith('ui', undefined, true, 10);
    });

    it('should handle search_framework_symbols with all parameters', async () => {
      const handler = toolHandlers.search_framework_symbols;
      const args = {
        framework: 'swiftui',
        symbolType: 'struct',
        namePattern: '*View',
        language: 'swift',
        limit: 100,
      };
      
      await handler(args, mockServer);
      
      expect(mockServer.searchFrameworkSymbols).toHaveBeenCalledWith(
        'swiftui',
        'struct',
        '*View',
        'swift',
        100,
      );
    });

    it('should handle get_documentation_updates with all parameters', async () => {
      const handler = toolHandlers.get_documentation_updates;
      const args = {
        category: 'wwdc',
        technology: 'SwiftUI',
        year: '2024',
        searchQuery: 'animation',
        includeBeta: true,
        limit: 50,
      };
      
      await handler(args, mockServer);
      
      expect(mockServer.getDocumentationUpdates).toHaveBeenCalledWith(
        'wwdc',
        'SwiftUI',
        '2024',
        'animation',
        true,
        50,
      );
    });
  });
});
