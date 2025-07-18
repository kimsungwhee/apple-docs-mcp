/**
 * Response format validation tests
 * 
 * These tests ensure that all MCP tool responses follow the correct format
 * and prevent nested response structure issues.
 */

import { jest } from '@jest/globals';
import AppleDeveloperDocsMCPServer from '../src/index.js';

// Mock external dependencies
jest.mock('../src/utils/http-client.js', () => ({
  httpClient: {
    getText: jest.fn().mockResolvedValue('<html><body><ul class="search-results"></ul></body></html>'),
    get: jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    })
  }
}));

jest.mock('../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../src/utils/cache.js', () => ({
  apiCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false)
  },
  generateUrlCacheKey: jest.fn().mockReturnValue('test-cache-key')
}));

// Mock all handler functions to return proper string responses
jest.mock('../src/tools/list-technologies.js', () => ({
  handleListTechnologies: jest.fn().mockResolvedValue('Mock technologies list')
}));

jest.mock('../src/tools/search-framework-symbols.js', () => ({
  searchFrameworkSymbols: jest.fn().mockResolvedValue('Mock framework symbols')
}));

jest.mock('../src/tools/get-related-apis.js', () => ({
  handleGetRelatedApis: jest.fn().mockResolvedValue('Mock related APIs')
}));

jest.mock('../src/tools/resolve-references-batch.js', () => ({
  handleResolveReferencesBatch: jest.fn().mockResolvedValue('Mock references')
}));

jest.mock('../src/tools/get-platform-compatibility.js', () => ({
  handleGetPlatformCompatibility: jest.fn().mockResolvedValue('Mock platform compatibility')
}));

jest.mock('../src/tools/find-similar-apis.js', () => ({
  handleFindSimilarApis: jest.fn().mockResolvedValue('Mock similar APIs')
}));

jest.mock('../src/tools/get-documentation-updates.js', () => ({
  handleGetDocumentationUpdates: jest.fn().mockResolvedValue('Mock documentation updates')
}));

jest.mock('../src/tools/get-technology-overviews.js', () => ({
  handleGetTechnologyOverviews: jest.fn().mockResolvedValue('Mock technology overviews')
}));

jest.mock('../src/tools/get-sample-code.js', () => ({
  handleGetSampleCode: jest.fn().mockResolvedValue('Mock sample code')
}));

jest.mock('../src/tools/doc-fetcher.js', () => ({
  fetchAppleDocJson: jest.fn().mockResolvedValue('Mock doc content')
}));

describe('Response Format Validation', () => {
  let server: AppleDeveloperDocsMCPServer;

  beforeEach(() => {
    server = new AppleDeveloperDocsMCPServer();
    jest.clearAllMocks();
  });

  /**
   * Valid MCP response format should be:
   * {
   *   content: [
   *     {
   *       type: 'text',
   *       text: string
   *     }
   *   ],
   *   isError?: boolean
   * }
   */
  const validateResponseFormat = (response: any) => {
    expect(response).toHaveProperty('content');
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    
    response.content.forEach((item: any) => {
      expect(item).toHaveProperty('type');
      expect(item.type).toBe('text');
      expect(item).toHaveProperty('text');
      expect(typeof item.text).toBe('string');
      
      // Ensure text is not a nested object (the main issue we're preventing)
      expect(typeof item.text).not.toBe('object');
      expect(item.text).not.toHaveProperty('content');
    });
  };

  describe('searchAppleDocs response format', () => {
    it('should return properly formatted response for valid query', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      expect(typeof response.content[0].text).toBe('string');
      expect(response.content[0].text).toContain('Apple Documentation Search Results');
    });

    it('should return properly formatted error response for invalid input', async () => {
      const response = await server.searchAppleDocs('', 'all');
      
      validateResponseFormat(response);
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error:');
    });
  });

  describe('All MCP tools response format consistency', () => {
    const toolTests = [
      {
        name: 'listTechnologies',
        method: () => server.listTechnologies(),
      },
      {
        name: 'searchFrameworkSymbols',
        method: () => server.searchFrameworkSymbols('SwiftUI'),
      },
      {
        name: 'getAppleDocContent',
        method: () => server.getAppleDocContent('https://developer.apple.com/documentation/swiftui'),
      },
      {
        name: 'getRelatedApis',
        method: () => server.getRelatedApis('https://developer.apple.com/documentation/swiftui/view'),
      },
      {
        name: 'resolveReferencesBatch',
        method: () => server.resolveReferencesBatch('https://developer.apple.com/documentation/swiftui'),
      },
      {
        name: 'getPlatformCompatibility',
        method: () => server.getPlatformCompatibility('https://developer.apple.com/documentation/swiftui/view'),
      },
      {
        name: 'findSimilarApis',
        method: () => server.findSimilarApis('https://developer.apple.com/documentation/swiftui/view'),
      },
      {
        name: 'getDocumentationUpdates',
        method: () => server.getDocumentationUpdates(),
      },
      {
        name: 'getTechnologyOverviews',
        method: () => server.getTechnologyOverviews(),
      },
      {
        name: 'getSampleCode',
        method: () => server.getSampleCode(),
      },
    ];

    toolTests.forEach(({ name, method }) => {
      it(`${name} should return properly formatted response`, async () => {
        const response = await method();
        
        validateResponseFormat(response);
        expect(typeof response.content[0].text).toBe('string');
      });
    });
  });

  describe('Error response format consistency', () => {
    it('should maintain consistent error format across all tools', async () => {
      // Test with invalid URL to trigger error in getAppleDocContent
      const response = await server.getAppleDocContent('invalid-url');
      
      validateResponseFormat(response);
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error:');
    });

    it('should handle network errors with proper format', async () => {
      // Mock network failure
      const { httpClient } = await import('../src/utils/http-client.js');
      (httpClient.getText as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      expect(response.isError).toBe(true);
    });
  });

  describe('Regression tests for nested response issue', () => {
    it('should not return nested content objects in searchAppleDocs', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      // Specifically check that text is not an object with content property
      const textContent = response.content[0].text;
      expect(typeof textContent).toBe('string');
      expect(textContent).not.toHaveProperty('content');
      
      // Ensure we don't have the problematic nested structure:
      // { content: [{ type: 'text', text: { content: [...] } }] }
      if (typeof textContent === 'object') {
        fail(`searchAppleDocs returned object instead of string: ${JSON.stringify(textContent)}`);
      }
    });

    it('should prevent double-wrapping of response content', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      // Check that the response is not double-wrapped
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      
      const firstItem = response.content[0];
      expect(firstItem.type).toBe('text');
      expect(typeof firstItem.text).toBe('string');
      
      // Parse the text to ensure it's not stringified JSON
      try {
        const parsed = JSON.parse(firstItem.text);
        if (parsed && typeof parsed === 'object' && parsed.content) {
          fail('Response text appears to be stringified JSON with nested content structure');
        }
      } catch {
        // This is expected - text should not be valid JSON
      }
    });
  });

  describe('Response size and performance validation', () => {
    it('should return reasonable response sizes', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      
      const responseText = response.content[0].text;
      expect(responseText.length).toBeLessThan(50000); // 50KB limit
      expect(responseText.length).toBeGreaterThan(10); // Not empty
    });

    it('should handle large responses gracefully', async () => {
      // Mock a large response
      const largeHtml = '<html><body><ul class="search-results">' + 
        '<li class="search-result">'.repeat(100) +
        '<article><h1>Test Result</h1><p>Description</p></article></li>'.repeat(100) +
        '</ul></body></html>';
      
      const { httpClient } = await import('../src/utils/http-client.js');
      (httpClient.getText as jest.Mock).mockResolvedValueOnce(largeHtml);

      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      // Should handle large responses without breaking format
      expect(response.content[0].text).toBeDefined();
    });
  });
});