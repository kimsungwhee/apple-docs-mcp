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
    };
  });

  describe('handleToolCall', () => {
    it('should throw error for unknown tool', async () => {
      await expect(handleToolCall('unknown_tool', {}, mockServer))
        .rejects.toThrow('Unknown tool: unknown_tool');
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

    it('should handle validation errors gracefully', async () => {
      // Mock schema parse to throw validation error
      jest.spyOn(schemas.searchAppleDocsSchema, 'parse').mockImplementationOnce(() => {
        throw new Error('Validation failed: query is required');
      });

      await expect(handleToolCall('search_apple_docs', {}, mockServer))
        .rejects.toThrow('Validation failed: query is required');
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