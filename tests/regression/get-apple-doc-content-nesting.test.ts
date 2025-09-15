/**
 * Regression tests for getAppleDocContent nested response structure issue
 *
 * This test suite specifically prevents the regression of the bug where
 * getAppleDocContent returned nested response structures like:
 * { content: [{ type: 'text', text: { content: [...] } }] }
 *
 * The issue occurred because:
 * 1. fetchAppleDocJson returns correct MCP format: { content: [{ type: 'text', text: string }] }
 * 2. getAppleDocContent used handleAsyncOperation wrapper which expected string returns
 * 3. handleAsyncOperation wrapped the already-correct MCP response, causing nesting
 */

import { jest } from '@jest/globals';

// Create a mock function first
const mockFetchAppleDocJson = jest.fn();

// Mock wwdc-data-source before importing anything that uses it
jest.mock('../../src/utils/wwdc-data-source.js', () => ({
  loadGlobalMetadata: jest.fn(),
  loadTopicIndex: jest.fn(),
  loadYearIndex: jest.fn(),
  loadVideoData: jest.fn(),
  loadAllVideos: jest.fn(),
  clearDataCache: jest.fn(),
  isDataAvailable: jest.fn().mockResolvedValue(true),
}));

// Mock the doc-fetcher module
jest.mock('../../src/tools/doc-fetcher.js', () => ({
  fetchAppleDocJson: mockFetchAppleDocJson
}));

// Mock external dependencies
jest.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    getText: jest.fn().mockResolvedValue('<html><body><ul class="search-results"></ul></body></html>'),
    getJson: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    })
  }
}));

jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../src/utils/cache.js', () => ({
  apiCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false)
  },
  generateUrlCacheKey: jest.fn().mockReturnValue('test-cache-key'),
  generateEnhancedCacheKey: jest.fn().mockReturnValue('test-enhanced-cache-key')
}));

// Import the server after mocks are set up
import AppleDeveloperDocsMCPServer from '../../src/index.js';

describe('getAppleDocContent Nested Response Regression Tests', () => {
  let server: AppleDeveloperDocsMCPServer;
  
  beforeEach(() => {
    server = new AppleDeveloperDocsMCPServer();
    jest.clearAllMocks();
  });

  describe('Preventing nested response structure', () => {
    it('should not double-wrap when fetchAppleDocJson returns MCP format', async () => {
      // Mock fetchAppleDocJson to return correct MCP format (as it should)
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Mock documentation content for UIViewController'
        }]
      });

      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/uikit/uiviewcontroller');

      // Verify the response is not double-wrapped
      expect(response).toHaveProperty('content');
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content.length).toBe(1);

      const contentItem = response.content[0];
      expect(contentItem.type).toBe('text');
      expect(typeof contentItem.text).toBe('string');
      expect(contentItem.text).toBe('Mock documentation content for UIViewController');

      // Most importantly: ensure text is NOT an object with content property
      expect(contentItem.text).not.toHaveProperty('content');
      expect(typeof contentItem.text).not.toBe('object');

      // Verify fetchAppleDocJson was called correctly
      expect(mockFetchAppleDocJson).toHaveBeenCalledWith(
        'https://developer.apple.com/documentation/uikit/uiviewcontroller',
        {
          includeRelatedApis: false,
          includeReferences: false,
          includeSimilarApis: false,
          includePlatformAnalysis: false,
        }
      );
    });

    it('should handle enhanced options without double-wrapping', async () => {
      // Mock fetchAppleDocJson to return MCP format with enhanced content
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Enhanced documentation content with related APIs and platform analysis'
        }]
      });

      const response = await server.getAppleDocContent(
        'https://developer.apple.com/documentation/swiftui/view',
        true,  // includeRelatedApis
        true,  // includeReferences
        true,  // includeSimilarApis
        true   // includePlatformAnalysis
      );

      // Verify correct response structure
      expect(response).toHaveProperty('content');
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content.length).toBe(1);

      const contentItem = response.content[0];
      expect(contentItem.type).toBe('text');
      expect(typeof contentItem.text).toBe('string');

      // Ensure no nesting occurred
      expect(contentItem.text).not.toHaveProperty('content');

      // Verify enhanced options were passed correctly
      expect(mockFetchAppleDocJson).toHaveBeenCalledWith(
        'https://developer.apple.com/documentation/swiftui/view',
        {
          includeRelatedApis: true,
          includeReferences: true,
          includeSimilarApis: true,
          includePlatformAnalysis: true,
        }
      );
    });

    it('should handle error responses without double-wrapping', async () => {
      // Mock fetchAppleDocJson to return error response in MCP format
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Error: Failed to get Apple doc content: Network error\n\nPlease try accessing the documentation directly at: https://developer.apple.com/documentation/invalid'
        }],
        isError: true
      });

      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/invalid');

      // Verify error response structure
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('isError', true);
      expect(Array.isArray(response.content)).toBe(true);

      const contentItem = response.content[0];
      expect(contentItem.type).toBe('text');
      expect(typeof contentItem.text).toBe('string');
      expect(contentItem.text).toContain('Error: Failed to get Apple doc content');

      // Ensure no double-wrapping of error response
      expect(contentItem.text).not.toHaveProperty('content');
    });
  });

  describe('Specific regression scenarios', () => {
    it('should detect if handleAsyncOperation wrapper is incorrectly used', async () => {
      // This test simulates what would happen if someone accidentally 
      // re-introduced handleAsyncOperation wrapper to getAppleDocContent

      // Mock fetchAppleDocJson to return MCP format
      const correctMcpResponse = {
        content: [{
          type: 'text',
          text: 'Correct MCP response from fetchAppleDocJson'
        }]
      };

      mockFetchAppleDocJson.mockResolvedValue(correctMcpResponse);

      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/swiftui/view');

      // If handleAsyncOperation was incorrectly applied, we would get:
      // { content: [{ type: 'text', text: '{"content":[{"type":"text","text":"..."}]}' }] }
      // 
      // Let's verify this doesn't happen:
      const textContent = response.content[0].text;
      
      // Try to parse the text as JSON - if it succeeds and contains 'content' array,
      // it means the MCP response was stringified (indicating double-wrapping)
      let parsedContent;
      try {
        parsedContent = JSON.parse(textContent);
      } catch {
        // This is expected - the text should be plain text, not JSON
        parsedContent = null;
      }

      if (parsedContent && typeof parsedContent === 'object' && parsedContent.content) {
        fail(`getAppleDocContent appears to be double-wrapping responses! 
              Text content is a stringified MCP response: ${textContent}`);
      }

      // Verify we got the expected plain text content
      expect(textContent).toBe('Correct MCP response from fetchAppleDocJson');
    });

    it('should maintain backward compatibility with input validation', async () => {
      // Test that validation errors still work correctly
      const response = await server.getAppleDocContent('');

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('isError', true);
      expect(Array.isArray(response.content)).toBe(true);

      const contentItem = response.content[0];
      expect(contentItem.type).toBe('text');
      expect(typeof contentItem.text).toBe('string');
      expect(contentItem.text).toContain('Error:');
    });

    it('should maintain backward compatibility with URL validation', async () => {
      // Test that URL validation errors still work correctly
      const response = await server.getAppleDocContent('https://example.com/not-apple');

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('isError', true);
      expect(Array.isArray(response.content)).toBe(true);

      const contentItem = response.content[0];
      expect(contentItem.type).toBe('text');
      expect(typeof contentItem.text).toBe('string');
      expect(contentItem.text).toContain('URL must be from developer.apple.com');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large content responses without nesting', async () => {
      // Test with large content that might cause issues
      const largeContent = 'Large content '.repeat(1000);
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: largeContent
        }]
      });

      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/foundation');

      expect(response.content[0].text).toBe(largeContent);
      expect(typeof response.content[0].text).toBe('string');
      expect(response.content[0].text).not.toHaveProperty('content');
    });

    it('should handle special characters and markdown without nesting', async () => {
      // Test with content that contains special characters and markdown
      const specialContent = `# Documentation
      
## Overview
This contains **bold** text, \`code\`, and [links](https://example.com).

### JSON-like content:
\`\`\`json
{
  "content": "This looks like MCP format but it's just documentation"
}
\`\`\``;

      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: specialContent
        }]
      });

      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/swift');

      expect(response.content[0].text).toBe(specialContent);
      expect(typeof response.content[0].text).toBe('string');
      expect(response.content[0].text).not.toHaveProperty('content');
    });

    it('should detect the specific nested structure that was causing the original bug', async () => {
      // Test to catch the specific error structure that was reported:
      // ClaudeAiToolResultRequest.content.0.text.text: Input should be a valid string
      
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Valid documentation content'
        }]
      });

      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/uikit/uiviewcontroller');

      // The original bug would have created a structure like:
      // { content: [{ type: 'text', text: { content: [{ type: 'text', text: 'actual content' }] } }] }
      
      const textContent = response.content[0].text;
      
      // Ensure text is a string, not an object
      expect(typeof textContent).toBe('string');
      
      // Ensure text doesn't have nested properties that would cause validation errors
      expect(textContent).not.toHaveProperty('text');
      expect(textContent).not.toHaveProperty('content');
      expect(textContent).not.toHaveProperty('type');
      
      // Verify the actual content
      expect(textContent).toBe('Valid documentation content');
    });
  });
});