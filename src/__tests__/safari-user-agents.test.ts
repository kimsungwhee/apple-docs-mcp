/**
 * Tests for Safari User-Agent constants and utilities
 */

import {
  SAFARI_USER_AGENTS,
  SAFARI_USER_AGENT_CATEGORIES,
  SAFARI_USER_AGENT_UTILS,
  REQUEST_CONFIG,
} from '../utils/constants.js';

describe('Safari User-Agent Constants', () => {
  describe('SAFARI_USER_AGENTS array', () => {
    test('should contain exactly 25 User-Agent strings', () => {
      expect(SAFARI_USER_AGENTS).toHaveLength(25);
    });

    test('all User-Agent strings should be valid Safari format', () => {
      SAFARI_USER_AGENTS.forEach((ua: string) => {
        expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent(ua)).toBe(true);
      });
    });

    test('should contain both Intel and Apple Silicon architectures', () => {
      const intelUAs = SAFARI_USER_AGENTS.filter((ua: string) => 
        SAFARI_USER_AGENT_UTILS.getArchitecture(ua) === 'Intel'
      );
      const appleSiliconUAs = SAFARI_USER_AGENTS.filter((ua: string) => 
        SAFARI_USER_AGENT_UTILS.getArchitecture(ua) === 'Apple Silicon'
      );

      expect(intelUAs.length).toBeGreaterThan(0);
      expect(appleSiliconUAs.length).toBeGreaterThan(0);
      expect(intelUAs.length + appleSiliconUAs.length).toBe(25);
    });

    test('should contain proper macOS version coverage', () => {
      const macOSVersions = SAFARI_USER_AGENTS.map((ua: string) => 
        SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua)
      );

      // Check for presence of different major macOS versions
      const hasMacOS12 = macOSVersions.some((version: string | null) => version?.startsWith('12.'));
      const hasMacOS13 = macOSVersions.some((version: string | null) => version?.startsWith('13.'));
      const hasMacOS14 = macOSVersions.some((version: string | null) => version?.startsWith('14.'));
      const hasMacOS15 = macOSVersions.some((version: string | null) => version?.startsWith('15.'));
      const hasMacOS26 = macOSVersions.some((version: string | null) => version?.startsWith('26.'));

      expect(hasMacOS12).toBe(true);
      expect(hasMacOS13).toBe(true);
      expect(hasMacOS14).toBe(true);
      expect(hasMacOS15).toBe(true);
      expect(hasMacOS26).toBe(true);
    });

    test('should contain proper Safari version coverage', () => {
      const safariVersions = SAFARI_USER_AGENTS.map((ua: string) => 
        SAFARI_USER_AGENT_UTILS.getSafariVersion(ua)
      );

      // Check for presence of different Safari major versions
      const hasSafari15 = safariVersions.some((version: string | null) => version?.startsWith('15.'));
      const hasSafari16 = safariVersions.some((version: string | null) => version?.startsWith('16.'));
      const hasSafari17 = safariVersions.some((version: string | null) => version?.startsWith('17.'));
      const hasSafari18 = safariVersions.some((version: string | null) => version?.startsWith('18.'));
      const hasSafari19 = safariVersions.some((version: string | null) => version?.startsWith('19.'));

      expect(hasSafari15).toBe(true);
      expect(hasSafari16).toBe(true);
      expect(hasSafari17).toBe(true);
      expect(hasSafari18).toBe(true);
      expect(hasSafari19).toBe(true);
    });
  });

  describe('SAFARI_USER_AGENT_CATEGORIES', () => {
    test('should have correct category counts', () => {
      expect(SAFARI_USER_AGENT_CATEGORIES.monterey).toHaveLength(3);
      expect(SAFARI_USER_AGENT_CATEGORIES.ventura).toHaveLength(5);
      expect(SAFARI_USER_AGENT_CATEGORIES.sonoma).toHaveLength(8);
      expect(SAFARI_USER_AGENT_CATEGORIES.sequoia).toHaveLength(6);
      expect(SAFARI_USER_AGENT_CATEGORIES.beta).toHaveLength(3);
    });

    test('all categories should sum to total User-Agent count', () => {
      const totalCategorized = 
        SAFARI_USER_AGENT_CATEGORIES.monterey.length +
        SAFARI_USER_AGENT_CATEGORIES.ventura.length +
        SAFARI_USER_AGENT_CATEGORIES.sonoma.length +
        SAFARI_USER_AGENT_CATEGORIES.sequoia.length +
        SAFARI_USER_AGENT_CATEGORIES.beta.length;

      expect(totalCategorized).toBe(25);
    });

    test('monterey category should contain macOS 12.x versions', () => {
      SAFARI_USER_AGENT_CATEGORIES.monterey.forEach((ua: string) => {
        const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        expect(version?.startsWith('12.')).toBe(true);
      });
    });

    test('ventura category should contain macOS 13.x versions', () => {
      SAFARI_USER_AGENT_CATEGORIES.ventura.forEach((ua: string) => {
        const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        expect(version?.startsWith('13.')).toBe(true);
      });
    });

    test('sonoma category should contain macOS 14.x versions', () => {
      SAFARI_USER_AGENT_CATEGORIES.sonoma.forEach((ua: string) => {
        const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        expect(version?.startsWith('14.')).toBe(true);
      });
    });

    test('sequoia category should contain macOS 15.x versions', () => {
      SAFARI_USER_AGENT_CATEGORIES.sequoia.forEach((ua: string) => {
        const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        expect(version?.startsWith('15.')).toBe(true);
      });
    });

    test('beta category should contain macOS 26.x versions', () => {
      SAFARI_USER_AGENT_CATEGORIES.beta.forEach((ua: string) => {
        const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        expect(version?.startsWith('26.')).toBe(true);
      });
    });
  });

  describe('SAFARI_USER_AGENT_UTILS', () => {
    describe('SAFARI_UA_REGEX', () => {
      test('should match valid Safari User-Agent strings', () => {
        const validUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15';
        expect(SAFARI_USER_AGENT_UTILS.SAFARI_UA_REGEX.test(validUA)).toBe(true);
      });

      test('should not match invalid User-Agent strings', () => {
        const invalidUAs = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) Chrome/91.0.4472.124',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          'Invalid User-Agent String',
        ];

        invalidUAs.forEach(ua => {
          expect(SAFARI_USER_AGENT_UTILS.SAFARI_UA_REGEX.test(ua)).toBe(false);
        });
      });
    });

    describe('isValidSafariUserAgent', () => {
      test('should validate all predefined User-Agent strings', () => {
        SAFARI_USER_AGENTS.forEach((ua: string) => {
          expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent(ua)).toBe(true);
        });
      });

      test('should reject invalid User-Agent strings', () => {
        expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent('invalid')).toBe(false);
        expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent('')).toBe(false);
        expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent('Mozilla/5.0 Chrome')).toBe(false);
      });
    });

    describe('getArchitecture', () => {
      test('should correctly identify Intel architecture', () => {
        const intelUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15';
        expect(SAFARI_USER_AGENT_UTILS.getArchitecture(intelUA)).toBe('Intel');
      });

      test('should correctly identify Apple Silicon architecture', () => {
        const appleUA = 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15';
        expect(SAFARI_USER_AGENT_UTILS.getArchitecture(appleUA)).toBe('Apple Silicon');
      });

      test('should return null for invalid User-Agent', () => {
        expect(SAFARI_USER_AGENT_UTILS.getArchitecture('invalid')).toBeNull();
      });
    });

    describe('getMacOSVersion', () => {
      test('should correctly extract macOS versions', () => {
        const testCases = [
          {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15',
            expected: '14.7.1'
          },
          {
            ua: 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
            expected: '15.0'
          },
          {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_7_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
            expected: '12.7.6'
          }
        ];

        testCases.forEach(({ ua, expected }) => {
          expect(SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua)).toBe(expected);
        });
      });

      test('should return null for invalid User-Agent', () => {
        expect(SAFARI_USER_AGENT_UTILS.getMacOSVersion('invalid')).toBeNull();
      });
    });

    describe('getSafariVersion', () => {
      test('should correctly extract Safari versions', () => {
        const testCases = [
          {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15',
            expected: '17.6.1'
          },
          {
            ua: 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
            expected: '18.0'
          },
          {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 26_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
            expected: '19.0'
          }
        ];

        testCases.forEach(({ ua, expected }) => {
          expect(SAFARI_USER_AGENT_UTILS.getSafariVersion(ua)).toBe(expected);
        });
      });

      test('should return null for invalid User-Agent', () => {
        expect(SAFARI_USER_AGENT_UTILS.getSafariVersion('invalid')).toBeNull();
      });
    });

    describe('getRandomUserAgent', () => {
      test('should return a valid User-Agent from the list', () => {
        const randomUA = SAFARI_USER_AGENT_UTILS.getRandomUserAgent();
        expect((SAFARI_USER_AGENTS as readonly string[]).includes(randomUA)).toBe(true);
        expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent(randomUA)).toBe(true);
      });

      test('should return different values across multiple calls (with high probability)', () => {
        const results = new Set();
        for (let i = 0; i < 50; i++) {
          results.add(SAFARI_USER_AGENT_UTILS.getRandomUserAgent());
        }
        // With 25 different User-Agents and 50 calls, we should get some variety
        expect(results.size).toBeGreaterThan(1);
      });
    });

    describe('getRandomUserAgentFromCategory', () => {
      test('should return User-Agent from specified category', () => {
        const categories = ['monterey', 'ventura', 'sonoma', 'sequoia', 'beta'] as const;
        
        categories.forEach(category => {
          const randomUA = SAFARI_USER_AGENT_UTILS.getRandomUserAgentFromCategory(category);
          expect((SAFARI_USER_AGENT_CATEGORIES[category] as readonly string[]).includes(randomUA)).toBe(true);
          expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent(randomUA)).toBe(true);
        });
      });

      test('monterey category should return macOS 12.x User-Agents', () => {
        const ua = SAFARI_USER_AGENT_UTILS.getRandomUserAgentFromCategory('monterey');
        const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        expect(version?.startsWith('12.')).toBe(true);
      });

      test('beta category should return macOS 26.x User-Agents', () => {
        const ua = SAFARI_USER_AGENT_UTILS.getRandomUserAgentFromCategory('beta');
        const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        expect(version?.startsWith('26.')).toBe(true);
      });
    });
  });

  describe('REQUEST_CONFIG integration', () => {
    test('should have DEFAULT_SAFARI_USER_AGENT set to valid Safari User-Agent', () => {
      expect(SAFARI_USER_AGENTS.includes(REQUEST_CONFIG.DEFAULT_SAFARI_USER_AGENT)).toBe(true);
      expect(SAFARI_USER_AGENT_UTILS.isValidSafariUserAgent(REQUEST_CONFIG.DEFAULT_SAFARI_USER_AGENT)).toBe(true);
    });

    test('DEFAULT_SAFARI_USER_AGENT should be from latest stable version', () => {
      const version = SAFARI_USER_AGENT_UTILS.getMacOSVersion(REQUEST_CONFIG.DEFAULT_SAFARI_USER_AGENT);
      // Should be from macOS 15.x (Sequoia) - latest stable
      expect(version?.startsWith('15.')).toBe(true);
    });
  });

  describe('User-Agent format compliance', () => {
    test('all User-Agents should follow consistent WebKit version pattern', () => {
      SAFARI_USER_AGENTS.forEach((ua: string) => {
        // All modern Safari User-Agents should use WebKit 605.1.15
        expect(ua).toContain('AppleWebKit/605.1.15');
      });
    });

    test('all User-Agents should contain KHTML like Gecko pattern', () => {
      SAFARI_USER_AGENTS.forEach((ua: string) => {
        expect(ua).toContain('(KHTML, like Gecko)');
      });
    });

    test('all User-Agents should start with Mozilla/5.0', () => {
      SAFARI_USER_AGENTS.forEach((ua: string) => {
        expect(ua.startsWith('Mozilla/5.0')).toBe(true);
      });
    });

    test('all User-Agents should end with Safari/605.1.15', () => {
      SAFARI_USER_AGENTS.forEach((ua: string) => {
        expect(ua.endsWith('Safari/605.1.15')).toBe(true);
      });
    });
  });

  describe('Version consistency checks', () => {
    test('macOS versions should match expected Safari versions', () => {
      const versionMappings = [
        { macOSPrefix: '12.', safariPrefix: '15.' }, // Monterey -> Safari 15
        { macOSPrefix: '13.', safariPrefix: '16.' }, // Ventura -> Safari 16
        { macOSPrefix: '14.', safariPrefix: '17.' }, // Sonoma -> Safari 17
        { macOSPrefix: '15.', safariPrefix: '18.' }, // Sequoia -> Safari 18
        { macOSPrefix: '26.', safariPrefix: '19.' }, // macOS 26 -> Safari 19
      ];

      SAFARI_USER_AGENTS.forEach((ua: string) => {
        const macOSVersion = SAFARI_USER_AGENT_UTILS.getMacOSVersion(ua);
        const safariVersion = SAFARI_USER_AGENT_UTILS.getSafariVersion(ua);

        const mapping = versionMappings.find(m => macOSVersion?.startsWith(m.macOSPrefix));
        if (mapping) {
          expect(safariVersion?.startsWith(mapping.safariPrefix)).toBe(true);
        }
      });
    });
  });
});