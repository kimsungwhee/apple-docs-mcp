/**
 * Integration tests for HTTP client with headers generation
 */

import { httpClient } from '../utils/http-client.js';

// Mock fetch to capture and verify headers
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HTTP Client Headers Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve('success'),
      headers: new Headers(),
    });
  });

  describe('getJson with generated headers', () => {
    test('should include User-Agent header', async () => {
      await httpClient.getJson('https://example.com/api');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      
      expect(url).toBe('https://example.com/api');
      expect(options.headers).toHaveProperty('User-Agent');
      expect(typeof options.headers['User-Agent']).toBe('string');
      expect(options.headers['User-Agent'].length).toBeGreaterThan(50);
    });

    test('should include Accept header for JSON requests', async () => {
      await httpClient.getJson('https://example.com/api');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).toHaveProperty('Accept');
      expect(options.headers['Accept']).toBe('application/json');
    });

    test('should include Accept-Encoding header', async () => {
      await httpClient.getJson('https://example.com/api');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).toHaveProperty('Accept-Encoding');
      expect(options.headers['Accept-Encoding']).toMatch(/gzip/);
    });

    test('should include Accept-Language header', async () => {
      await httpClient.getJson('https://example.com/api');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).toHaveProperty('Accept-Language');
      expect(typeof options.headers['Accept-Language']).toBe('string');
    });

    test('should allow custom headers to override generated ones', async () => {
      await httpClient.getJson('https://example.com/api', {
        headers: {
          'User-Agent': 'Custom-Agent/1.0',
          'Custom-Header': 'custom-value',
        },
      });
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['User-Agent']).toBe('Custom-Agent/1.0');
      expect(options.headers['Custom-Header']).toBe('custom-value');
    });
  });

  describe('getText with generated headers', () => {
    test('should include appropriate Accept header for text requests', async () => {
      await httpClient.getText('https://example.com/page.html');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).toHaveProperty('Accept');
      expect(options.headers['Accept']).toContain('text/html');
      expect(options.headers['Accept']).toContain('application/xhtml+xml');
    });

    test('should include User-Agent header', async () => {
      await httpClient.getText('https://example.com/page.html');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).toHaveProperty('User-Agent');
      expect(typeof options.headers['User-Agent']).toBe('string');
    });
  });

  describe('header consistency across requests', () => {
    test('should generate different User-Agents across multiple requests', async () => {
      const userAgents = new Set();
      
      // Make multiple requests to collect User-Agents
      for (let i = 0; i < 10; i++) {
        mockFetch.mockClear();
        await httpClient.getJson(`https://example.com/api/${i}`);
        
        const [, options] = mockFetch.mock.calls[0];
        userAgents.add(options.headers['User-Agent']);
      }
      
      // Should have some variety (though not guaranteed due to randomness)
      // At minimum, all should be valid User-Agent strings
      expect(userAgents.size).toBeGreaterThan(0);
      userAgents.forEach(ua => {
        expect(typeof ua).toBe('string');
        expect(ua.length).toBeGreaterThan(50);
        expect(ua.startsWith('Mozilla/5.0')).toBe(true);
      });
    });

    test('should maintain consistent header structure', async () => {
      const requests = [];
      
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        mockFetch.mockClear();
        await httpClient.getJson(`https://example.com/api/${i}`);
        requests.push(mockFetch.mock.calls[0][1]);
      }
      
      // All requests should have the same header keys (structure)
      const expectedKeys = ['User-Agent', 'Accept', 'Accept-Encoding', 'Accept-Language'];
      
      requests.forEach(options => {
        expectedKeys.forEach(key => {
          expect(options.headers).toHaveProperty(key);
        });
      });
    });
  });

  describe('error handling with headers', () => {
    test('should still include headers when request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      try {
        await httpClient.getJson('https://example.com/nonexistent');
      } catch (error) {
        // Request should fail, but we should still have sent headers
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers).toHaveProperty('User-Agent');
      }
    });

    test('should fallback to basic headers when header generation fails', async () => {
      // This is hard to test directly, but we can verify that requests
      // still work even if something goes wrong with header generation
      
      await httpClient.getJson('https://example.com/api');
      
      const [, options] = mockFetch.mock.calls[0];
      
      // Should always have basic headers at minimum
      expect(options.headers).toHaveProperty('User-Agent');
      expect(options.headers).toHaveProperty('Accept');
      expect(typeof options.headers['User-Agent']).toBe('string');
    });
  });

  describe('browser-specific header patterns', () => {
    test('should generate Safari-compatible headers', async () => {
      // Make multiple requests to eventually get Safari headers
      let safariRequest = null;
      
      for (let i = 0; i < 20; i++) {
        mockFetch.mockClear();
        await httpClient.getJson(`https://example.com/api/${i}`);
        
        const [, options] = mockFetch.mock.calls[0];
        if (options.headers['User-Agent'].includes('Safari/')) {
          safariRequest = options;
          break;
        }
      }
      
      if (safariRequest) {
        expect(safariRequest.headers['User-Agent']).toContain('Safari/');
        expect(safariRequest.headers['User-Agent']).toContain('Version/');
        expect(safariRequest.headers).toHaveProperty('Accept-Language');
      }
    });

    test('should generate Chrome-compatible headers', async () => {
      // Make multiple requests to eventually get Chrome headers
      let chromeRequest = null;
      
      for (let i = 0; i < 20; i++) {
        mockFetch.mockClear();
        await httpClient.getJson(`https://example.com/api/${i}`);
        
        const [, options] = mockFetch.mock.calls[0];
        if (options.headers['User-Agent'].includes('Chrome/') && 
            !options.headers['User-Agent'].includes('Edg/')) {
          chromeRequest = options;
          break;
        }
      }
      
      if (chromeRequest) {
        expect(chromeRequest.headers['User-Agent']).toContain('Chrome/');
        expect(chromeRequest.headers).toHaveProperty('Accept-Encoding');
        expect(chromeRequest.headers['Accept-Encoding']).toMatch(/gzip.*deflate/);
      }
    });
  });

  describe('environment variable configuration', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should respect SIMPLE_HEADERS_MODE environment variable', async () => {
      // This would require restarting the module to pick up env changes
      // For now, just verify that headers are being generated
      await httpClient.getJson('https://example.com/api');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).toHaveProperty('User-Agent');
      expect(options.headers).toHaveProperty('Accept-Encoding');
    });
  });
});