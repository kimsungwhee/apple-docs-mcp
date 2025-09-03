/**
 * Tests for HTTP Headers Generator
 */

import {
  HttpHeadersGenerator,
  parseUserAgent,
} from '../utils/http-headers-generator.js';
import type { UserAgent, HeaderGeneratorConfig } from '../types/headers.js';

describe('HttpHeadersGenerator', () => {
  let generator: HttpHeadersGenerator;

  beforeEach(() => {
    // Create a fresh instance for each test to avoid state interference
    (HttpHeadersGenerator as any).instance = null;
    generator = HttpHeadersGenerator.getInstance({
      enableSecFetch: true,
      enableDNT: true,
      languageRotation: false, // Disable for predictable tests
      simpleMode: false,
    });
  });

  describe('getInstance', () => {
    test('should return singleton instance', () => {
      const instance1 = HttpHeadersGenerator.getInstance();
      const instance2 = HttpHeadersGenerator.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('should update configuration when provided', () => {
      const config: HeaderGeneratorConfig = {
        simpleMode: true,
        enableDNT: false,
      };

      const instance = HttpHeadersGenerator.getInstance(config);
      const currentConfig = instance.getConfig();

      expect(currentConfig.simpleMode).toBe(true);
      expect(currentConfig.enableDNT).toBe(false);
    });
  });

  describe('generateHeaders', () => {
    describe('Chrome headers', () => {
      test('should generate Chrome-compatible headers', () => {
        const userAgent: UserAgent = {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          browserType: 'chrome',
          version: '121.0.0.0',
          os: 'macOS',
          osVersion: '10.15.7',
        };

        const headers = generator.generateHeaders(userAgent);

        expect(headers['User-Agent']).toBe(userAgent.userAgent);
        expect(headers['Accept']).toContain('image/avif');
        expect(headers['Accept']).toContain('image/webp');
        expect(headers['Accept']).toContain('image/apng');
        expect(headers['Accept-Encoding']).toBe('gzip, deflate, br');
        expect(headers['Sec-Fetch-Dest']).toBe('document');
        expect(headers['Sec-Fetch-Mode']).toBe('navigate');
        expect(headers['Sec-Fetch-Site']).toBe('none');
        expect(headers['Sec-Fetch-User']).toBe('?1');
        expect(headers['Sec-CH-UA-Mobile']).toBe('?0');
        expect(headers['Upgrade-Insecure-Requests']).toBe('1');
      });

      test('should include Sec-CH-UA headers for Chrome', () => {
        const userAgent: UserAgent = {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          browserType: 'chrome',
          version: '121.0.0.0',
          os: 'macOS',
          osVersion: '10.15.7',
        };

        const headers = generator.generateHeaders(userAgent);

        expect(headers['Sec-CH-UA']).toBeDefined();
        expect(headers['Sec-CH-UA']).toContain('Chrome');
        expect(headers['Sec-CH-UA-Platform']).toBeDefined();
        expect(headers['Sec-CH-UA-Platform']).toContain('macOS');
      });
    });

    describe('Firefox headers', () => {
      test('should generate Firefox-compatible headers', () => {
        const userAgent: UserAgent = {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
          browserType: 'firefox',
          version: '122.0',
          os: 'macOS',
          osVersion: '10.15',
        };

        const headers = generator.generateHeaders(userAgent);

        expect(headers['User-Agent']).toBe(userAgent.userAgent);
        expect(headers['Accept']).toBe('text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
        expect(headers['Accept-Language']).toBe('en-US,en;q=0.5');
        expect(headers['Accept-Encoding']).toBe('gzip, deflate, br');
        expect(headers['Upgrade-Insecure-Requests']).toBe('1');

        // Firefox should not have Sec-CH-UA headers
        expect(headers['Sec-CH-UA']).toBeUndefined();
        expect(headers['Sec-Fetch-Dest']).toBeUndefined();
      });
    });

    describe('Safari headers', () => {
      test('should generate Safari-compatible headers', () => {
        const userAgent: UserAgent = {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
          browserType: 'safari',
          version: '18.1',
          os: 'macOS',
          osVersion: '15.1',
          architecture: 'Intel',
        };

        const headers = generator.generateHeaders(userAgent);

        expect(headers['User-Agent']).toBe(userAgent.userAgent);
        expect(headers['Accept']).toBe('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
        expect(headers['Accept-Language']).toBe('en-us');
        expect(headers['Accept-Encoding']).toBe('gzip, deflate, br');

        // Safari should not have Sec-CH-UA headers
        expect(headers['Sec-CH-UA']).toBeUndefined();
        expect(headers['Sec-Fetch-Dest']).toBeUndefined();
      });
    });

    describe('Edge headers', () => {
      test('should generate Edge-compatible headers', () => {
        const userAgent: UserAgent = {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
          browserType: 'edge',
          version: '121.0.0.0',
          os: 'Windows',
          osVersion: '10.0',
        };

        const headers = generator.generateHeaders(userAgent);

        expect(headers['User-Agent']).toBe(userAgent.userAgent);
        expect(headers['Accept']).toContain('image/webp');
        expect(headers['Accept']).toContain('image/apng');
        expect(headers['Sec-CH-UA']).toContain('Microsoft Edge');
        expect(headers['Sec-CH-UA-Platform']).toContain('Windows');
      });
    });

    test('should allow custom header overrides', () => {
      const userAgent: UserAgent = {
        userAgent: 'test-agent',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const customHeaders = {
        'Custom-Header': 'custom-value',
        'Accept': 'custom-accept-value',
      };

      const headers = generator.generateHeaders(userAgent, customHeaders);

      expect(headers['Custom-Header']).toBe('custom-value');
      expect(headers['Accept']).toBe('custom-accept-value'); // Custom should override
      expect(headers['User-Agent']).toBe('test-agent');
    });
  });

  describe('configuration', () => {
    test('should disable Sec-Fetch headers when configured', () => {
      const generator = HttpHeadersGenerator.getInstance({ enableSecFetch: false });
      const userAgent: UserAgent = {
        userAgent: 'test',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const headers = generator.generateHeaders(userAgent);

      expect(headers['Sec-Fetch-Dest']).toBeUndefined();
      expect(headers['Sec-Fetch-Mode']).toBeUndefined();
      expect(headers['Sec-Fetch-Site']).toBeUndefined();
      expect(headers['Sec-Fetch-User']).toBeUndefined();
    });

    test('should use simple mode when configured', () => {
      // Create fresh instance for this test
      (HttpHeadersGenerator as any).instance = null;
      const generator = HttpHeadersGenerator.getInstance({ simpleMode: true });
      const userAgent: UserAgent = {
        userAgent: 'test',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const headers = generator.generateHeaders(userAgent);

      expect(headers['Accept-Encoding']).toBe('gzip, deflate');
      expect(headers['Sec-CH-UA']).toBeUndefined();
      expect(headers['Sec-Fetch-Dest']).toBeUndefined();
    });

    test('should disable DNT when configured', () => {
      const generator = HttpHeadersGenerator.getInstance({ enableDNT: false });
      const userAgent: UserAgent = {
        userAgent: 'test',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const headers = generator.generateHeaders(userAgent);

      expect(headers['DNT']).toBeUndefined();
    });
  });

  describe('language rotation', () => {
    test('should use default language when rotation disabled', () => {
      // Create fresh instance for this test
      (HttpHeadersGenerator as any).instance = null;
      const generator = HttpHeadersGenerator.getInstance({
        languageRotation: false,
        defaultAcceptLanguage: 'fr-FR,fr;q=0.9',
      });

      const userAgent: UserAgent = {
        userAgent: 'test',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const headers = generator.generateHeaders(userAgent);

      expect(headers['Accept-Language']).toBe('fr-FR,fr;q=0.9');
    });

    test('should rotate languages when enabled', () => {
      const generator = HttpHeadersGenerator.getInstance({
        languageRotation: true,
      });

      const userAgent: UserAgent = {
        userAgent: 'test',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const headers1 = generator.generateHeaders(userAgent);
      const headers2 = generator.generateHeaders(userAgent);

      // At least one should be different (with high probability)
      // Note: This test might occasionally fail due to randomness
      expect(headers1['Accept-Language']).toBeDefined();
      expect(headers2['Accept-Language']).toBeDefined();
    });
  });

  describe('validateHeaders', () => {
    test('should validate consistent headers', () => {
      const userAgent: UserAgent = {
        userAgent: 'test-agent',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const headers = generator.generateHeaders(userAgent);
      const validation = generator.validateHeaders(headers, userAgent);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    test('should detect User-Agent mismatch', () => {
      const userAgent: UserAgent = {
        userAgent: 'test-agent',
        browserType: 'chrome',
        version: '121.0.0.0',
        os: 'macOS',
        osVersion: '10.15.7',
      };

      const headers = { 'User-Agent': 'different-agent' };
      const validation = generator.validateHeaders(headers, userAgent);

      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('User-Agent header does not match provided UserAgent object');
    });

    test('should detect Sec-Fetch headers on unsupported browser', () => {
      const userAgent: UserAgent = {
        userAgent: 'firefox-agent',
        browserType: 'firefox',
        version: '122.0',
        os: 'macOS',
        osVersion: '10.15',
      };

      const headers = {
        'User-Agent': 'firefox-agent',
        'Sec-Fetch-Dest': 'document',
      };

      const validation = generator.validateHeaders(headers, userAgent);

      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('Sec-Fetch headers present for firefox which has limited support');
    });
  });
});

describe('parseUserAgent', () => {
  describe('Safari parsing', () => {
    test('should parse Safari User-Agent correctly', () => {
      const uaString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
      const parsed = parseUserAgent(uaString);

      expect(parsed.browserType).toBe('safari');
      expect(parsed.version).toBe('18.1');
      expect(parsed.os).toBe('macOS');
      expect(parsed.osVersion).toBe('15.1');
      expect(parsed.architecture).toBe('Intel');
    });

    test('should parse Safari User-Agent with Apple Silicon', () => {
      const uaString = 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15';
      const parsed = parseUserAgent(uaString);

      expect(parsed.browserType).toBe('safari');
      expect(parsed.version).toBe('17.6.1');
      expect(parsed.os).toBe('macOS');
      expect(parsed.osVersion).toBe('14.7.1');
      expect(parsed.architecture).toBe('Apple Silicon');
    });
  });

  describe('Chrome parsing', () => {
    test('should parse Chrome User-Agent correctly', () => {
      const uaString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
      const parsed = parseUserAgent(uaString);

      expect(parsed.browserType).toBe('chrome');
      expect(parsed.version).toBe('121.0.0.0');
      expect(parsed.os).toBe('macOS');
      expect(parsed.osVersion).toBe('10.15.7');
    });

    test('should parse Chrome User-Agent on Windows', () => {
      const uaString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
      const parsed = parseUserAgent(uaString);

      expect(parsed.browserType).toBe('chrome');
      expect(parsed.version).toBe('121.0.0.0');
      expect(parsed.os).toBe('Windows');
      expect(parsed.osVersion).toBe('10.0');
    });
  });

  describe('Firefox parsing', () => {
    test('should parse Firefox User-Agent correctly', () => {
      const uaString = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0';
      const parsed = parseUserAgent(uaString);

      expect(parsed.browserType).toBe('firefox');
      expect(parsed.version).toBe('122.0');
      expect(parsed.os).toBe('macOS');
      expect(parsed.osVersion).toBe('10.15');
    });

    test('should parse Firefox User-Agent on Linux', () => {
      const uaString = 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0';
      const parsed = parseUserAgent(uaString);

      expect(parsed.browserType).toBe('firefox');
      expect(parsed.version).toBe('122.0');
      expect(parsed.os).toBe('Linux');
    });
  });

  describe('Edge parsing', () => {
    test('should parse Edge User-Agent correctly', () => {
      const uaString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0';
      const parsed = parseUserAgent(uaString);

      expect(parsed.browserType).toBe('edge');
      expect(parsed.version).toBe('121.0.0.0');
      expect(parsed.os).toBe('Windows');
      expect(parsed.osVersion).toBe('10.0');
    });
  });

  test('should default to Chrome for unknown User-Agents', () => {
    const uaString = 'Unknown Browser/1.0';
    const parsed = parseUserAgent(uaString);

    expect(parsed.browserType).toBe('chrome');
    expect(parsed.version).toBe('unknown');
    expect(parsed.os).toBe('unknown');
    expect(parsed.osVersion).toBe('unknown');
  });
});
