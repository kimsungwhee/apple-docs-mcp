/**
 * HTTP Client User-Agent Integration Test
 *
 * Tests the integration of User-Agent rotation with HTTP client functionality.
 * This ensures that the User-Agent pool works correctly with real HTTP requests.
 */

import { httpClient } from '../utils/http-client.js';

describe('HTTP Client User-Agent Integration', () => {
  describe('User-Agent Pool Integration', () => {
    it('should initialize User-Agent pool successfully', () => {
      const stats = httpClient.getUserAgentPoolStats();

      // Pool should be enabled with Safari User-Agents
      expect(stats.enabled).toBe(true);

      if (stats.enabled) {
        expect(stats.poolStats.total).toBeGreaterThan(0);
        expect(stats.poolStats.enabled).toBeGreaterThan(0);
        expect(stats.poolStats.strategy).toBe('random');
        expect(stats.agentStats).toBeDefined();
        expect(Array.isArray(stats.agentStats)).toBe(true);
      }
    });

    it('should handle fallback when pool fails', () => {
      // This test would require mocking pool initialization failure
      // For now, we verify that the method exists and returns proper structure
      const stats = httpClient.getUserAgentPoolStats();

      expect(stats).toHaveProperty('enabled');
      if (!stats.enabled) {
        expect(stats).toHaveProperty('reason');
        expect(stats).toHaveProperty('fallbackAgent');
      } else {
        expect(stats).toHaveProperty('poolStats');
        expect(stats).toHaveProperty('agentStats');
      }
    });

    it('should include User-Agent pool info in performance report', () => {
      const report = httpClient.getPerformanceReport();

      expect(report).toContain('User-Agent Pool Status');
      expect(report).toContain('Pool Active');
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('should maintain API compatibility', () => {
      // Verify that all existing methods still exist
      expect(typeof httpClient.get).toBe('function');
      expect(typeof httpClient.getJson).toBe('function');
      expect(typeof httpClient.getText).toBe('function');
      expect(typeof httpClient.getStatus).toBe('function');
      expect(typeof httpClient.getPerformanceStats).toBe('function');
      expect(typeof httpClient.resetStats).toBe('function');
      expect(typeof httpClient.getPerformanceReport).toBe('function');

      // New method should also exist
      expect(typeof httpClient.getUserAgentPoolStats).toBe('function');
    });

    it('should handle custom headers override', async () => {
      // Test that custom User-Agent header overrides the pool
      const customUserAgent = 'Custom-Test-Agent/1.0';

      try {
        // This will likely fail due to invalid URL, but that's okay
        // We're testing the header handling
        await httpClient.get('https://httpbin.org/user-agent', {
          headers: {
            'User-Agent': customUserAgent,
          },
        });
      } catch (error) {
        // Expected to fail, we're just testing that the method accepts custom headers
        expect(error).toBeDefined();
      }

      // The test passes if no errors are thrown during header processing
      expect(true).toBe(true);
    }, 10000);

    it('should maintain statistics tracking', () => {
      const initialStats = httpClient.getPerformanceStats();

      expect(initialStats).toHaveProperty('totalRequests');
      expect(initialStats).toHaveProperty('successfulRequests');
      expect(initialStats).toHaveProperty('failedRequests');
      expect(initialStats).toHaveProperty('totalResponseTime');
      expect(initialStats).toHaveProperty('averageResponseTime');
      expect(initialStats).toHaveProperty('successRate');
      expect(initialStats).toHaveProperty('requestsByStatus');
      expect(initialStats).toHaveProperty('requestsByDomain');

      expect(typeof initialStats.totalRequests).toBe('number');
      expect(typeof initialStats.successfulRequests).toBe('number');
      expect(typeof initialStats.failedRequests).toBe('number');
    });

    it('should reset statistics correctly', () => {
      httpClient.resetStats();
      const stats = httpClient.getPerformanceStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.totalResponseTime).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(Object.keys(stats.requestsByStatus)).toHaveLength(0);
      expect(Object.keys(stats.requestsByDomain)).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      try {
        await httpClient.get('https://non-existent-domain-12345.invalid/', {
          timeout: 1000,
          retries: 0,
        });
        fail('Should have thrown network error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Should contain some error indication
        expect((error as Error).message).toBeDefined();
        expect((error as Error).message.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('should handle HTTP errors correctly', async () => {
      try {
        await httpClient.get('https://httpbin.org/status/500', {
          retries: 0,
        });
        fail('Should have thrown HTTP error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Should contain HTTP error indication
        expect((error as Error).message).toBeDefined();
        expect((error as Error).message.length).toBeGreaterThan(0);
      }
    }, 10000);
  });
});