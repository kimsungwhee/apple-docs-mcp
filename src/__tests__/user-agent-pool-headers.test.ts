/**
 * Tests for UserAgentPool browser type functionality
 */

import { UserAgentPool, COMMON_USER_AGENTS } from '../utils/user-agent-pool.js';
// import type { BrowserType } from '../types/headers.js';

describe('UserAgentPool Browser Type Support', () => {
  let pool: UserAgentPool;

  beforeEach(() => {
    // Create pool with diverse User-Agents
    const userAgents = Object.values(COMMON_USER_AGENTS);
    pool = new UserAgentPool(userAgents, {
      strategy: 'random',
      disableDuration: 100, // Short for tests
      failureThreshold: 2,
    });
  });

  describe('getNextUserAgent', () => {
    test('should return UserAgent object with parsed information', async () => {
      const userAgent = await pool.getNextUserAgent();

      expect(userAgent).toHaveProperty('userAgent');
      expect(userAgent).toHaveProperty('browserType');
      expect(userAgent).toHaveProperty('version');
      expect(userAgent).toHaveProperty('os');
      expect(userAgent).toHaveProperty('osVersion');

      expect(typeof userAgent.userAgent).toBe('string');
      expect(['chrome', 'firefox', 'safari', 'edge']).toContain(userAgent.browserType);
      expect(userAgent.userAgent.length).toBeGreaterThan(0);
    });

    test('should parse Safari User-Agents correctly', async () => {
      const safariPool = new UserAgentPool([
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      ]);

      const userAgent = await safariPool.getNextUserAgent();

      expect(userAgent.browserType).toBe('safari');
      expect(userAgent.version).toBe('18.1');
      expect(userAgent.os).toBe('macOS');
      expect(userAgent.osVersion).toBe('15.1');
      expect(userAgent.architecture).toBe('Intel');
    });

    test('should parse Chrome User-Agents correctly', async () => {
      const chromePool = new UserAgentPool([
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      ]);

      const userAgent = await chromePool.getNextUserAgent();

      expect(userAgent.browserType).toBe('chrome');
      expect(userAgent.version).toBe('121.0.0.0');
      expect(userAgent.os).toBe('macOS');
      expect(userAgent.osVersion).toBe('10.15.7');
    });
  });

  describe('getByBrowserType', () => {
    test('should return User-Agent of specified browser type', async () => {
      const chromeUA = await pool.getByBrowserType('chrome');
      expect(chromeUA).toBeDefined();
      expect(chromeUA.includes('Chrome/')).toBe(true);
    });

    test('should return Safari User-Agent when requested', async () => {
      const safariUA = await pool.getByBrowserType('safari');
      expect(safariUA).toBeDefined();
      expect(safariUA.includes('Safari/')).toBe(true);
      expect(safariUA.includes('Version/')).toBe(true);
    });

    test('should return Firefox User-Agent when requested', async () => {
      const firefoxUA = await pool.getByBrowserType('firefox');
      expect(firefoxUA).toBeDefined();
      expect(firefoxUA.includes('Firefox/')).toBe(true);
    });

    test('should return Edge User-Agent when requested', async () => {
      const edgeUA = await pool.getByBrowserType('edge');
      expect(edgeUA).toBeDefined();
      expect(edgeUA.includes('Edg/')).toBe(true);
    });

    test('should throw error when no User-Agents of requested type available', async () => {
      // Create pool with only Chrome User-Agents
      const chromeOnlyPool = new UserAgentPool([COMMON_USER_AGENTS.CHROME_MAC_INTEL]);

      await expect(chromeOnlyPool.getByBrowserType('firefox')).rejects.toThrow(
        'No enabled User-Agents available for browser type: firefox',
      );
    });
  });

  describe('getUserAgentByBrowserType', () => {
    test('should return UserAgent object of specified type', async () => {
      const userAgent = await pool.getUserAgentByBrowserType('chrome');

      expect(userAgent.browserType).toBe('chrome');
      expect(userAgent.userAgent.includes('Chrome/')).toBe(true);
      expect(userAgent.version).toBeDefined();
      expect(userAgent.os).toBeDefined();
    });
  });

  describe('getStatsByBrowserType', () => {
    test('should return statistics grouped by browser type', () => {
      const stats = pool.getStatsByBrowserType();

      expect(stats).toHaveProperty('chrome');
      expect(stats).toHaveProperty('firefox');
      expect(stats).toHaveProperty('safari');
      expect(stats).toHaveProperty('edge');

      // Check structure of each browser type stats
      Object.values(stats).forEach(browserStats => {
        expect(browserStats).toHaveProperty('count');
        expect(browserStats).toHaveProperty('enabled');
        expect(browserStats).toHaveProperty('successRate');
        expect(typeof browserStats.count).toBe('number');
        expect(typeof browserStats.enabled).toBe('number');
        expect(typeof browserStats.successRate).toBe('number');
      });
    });

    test('should show correct counts for each browser type', () => {
      const stats = pool.getStatsByBrowserType();

      // Should have some Chrome User-Agents
      expect(stats.chrome.count).toBeGreaterThan(0);
      // Should have some Safari User-Agents
      expect(stats.safari.count).toBeGreaterThan(0);
      // Should have some Firefox User-Agents
      expect(stats.firefox.count).toBeGreaterThan(0);
      // Should have some Edge User-Agents
      expect(stats.edge.count).toBeGreaterThan(0);
    });

    test('should calculate success rates correctly after some requests', async () => {
      // Make some requests and mark successes
      const chromeUA = await pool.getByBrowserType('chrome');
      await pool.markSuccess(chromeUA);
      await pool.markSuccess(chromeUA);

      const firefoxUA = await pool.getByBrowserType('firefox');
      await pool.markFailure(firefoxUA, 500);

      const stats = pool.getStatsByBrowserType();

      expect(stats.chrome.successRate).toBe(100); // 2 successes, 0 failures
      expect(stats.firefox.successRate).toBe(0); // 0 successes, 1 failure
    });
  });

  describe('getAvailableBrowserTypes', () => {
    test('should return all browser types present in the pool', () => {
      const browserTypes = pool.getAvailableBrowserTypes();

      expect(browserTypes).toBeInstanceOf(Array);
      expect(browserTypes.length).toBeGreaterThan(0);

      // Should include main browser types
      expect(browserTypes).toContain('chrome');
      expect(browserTypes).toContain('safari');
      expect(browserTypes).toContain('firefox');
      expect(browserTypes).toContain('edge');
    });

    test('should return unique browser types only', () => {
      const browserTypes = pool.getAvailableBrowserTypes();
      const uniqueTypes = [...new Set(browserTypes)];

      expect(browserTypes.length).toBe(uniqueTypes.length);
    });

    test('should return correct types for single-browser pool', () => {
      const chromeOnlyPool = new UserAgentPool([COMMON_USER_AGENTS.CHROME_MAC_INTEL]);
      const browserTypes = chromeOnlyPool.getAvailableBrowserTypes();

      expect(browserTypes).toEqual(['chrome']);
    });
  });

  describe('browser type filtering with disabled agents', () => {
    test('should exclude disabled agents when filtering by browser type', async () => {
      // Get a Chrome User-Agent and mark it as failed multiple times to disable it
      const chromeUA = await pool.getByBrowserType('chrome');

      // Mark failures to disable
      await pool.markFailure(chromeUA, 403);
      await pool.markFailure(chromeUA, 403);
      await pool.markFailure(chromeUA, 403);

      // Should still be able to get another Chrome User-Agent if available
      try {
        const anotherChromeUA = await pool.getByBrowserType('chrome');
        expect(anotherChromeUA).toBeDefined();
        expect(anotherChromeUA).not.toBe(chromeUA); // Should be a different one
      } catch (error) {
        // If no other Chrome User-Agents available, that's also expected
        expect((error as Error).message).toContain('No enabled User-Agents available for browser type: chrome');
      }
    });
  });
});

describe('COMMON_USER_AGENTS', () => {
  test('should contain User-Agents for all major browser types', () => {
    const userAgents = Object.values(COMMON_USER_AGENTS);
    const pool = new UserAgentPool(userAgents);

    const availableTypes = pool.getAvailableBrowserTypes();

    expect(availableTypes).toContain('chrome');
    expect(availableTypes).toContain('firefox');
    expect(availableTypes).toContain('safari');
    expect(availableTypes).toContain('edge');
  });

  test('should have valid User-Agent strings', () => {
    Object.values(COMMON_USER_AGENTS).forEach(ua => {
      expect(typeof ua).toBe('string');
      expect(ua.length).toBeGreaterThan(50); // Reasonable minimum length
      expect(ua.startsWith('Mozilla/5.0')).toBe(true);
    });
  });

  test('should contain both Intel and Apple Silicon variants', () => {
    const userAgents = Object.values(COMMON_USER_AGENTS);

    const hasIntel = userAgents.some(ua => ua.includes('Intel Mac OS X'));
    const hasApple = userAgents.some(ua => ua.includes('arm64 Mac OS X'));

    expect(hasIntel).toBe(true);
    expect(hasApple).toBe(true);
  });
});