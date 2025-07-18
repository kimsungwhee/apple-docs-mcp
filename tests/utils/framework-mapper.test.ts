/**
 * Tests for framework name mapping utilities
 */

import {
  normalizeFrameworkName,
  getFrameworkAliases,
  isValidFramework,
  getFrameworksByCategory,
  getFrameworkCategory,
  searchFrameworks,
  getFrameworkInfo,
  FRAMEWORK_MAPPINGS,
  FRAMEWORK_CATEGORIES,
} from '../../src/utils/framework-mapper.js';

describe('Framework Mapper', () => {
  describe('normalizeFrameworkName', () => {
    it('should normalize common framework names correctly', () => {
      expect(normalizeFrameworkName('swiftui')).toBe('SwiftUI');
      expect(normalizeFrameworkName('uikit')).toBe('UIKit');
      expect(normalizeFrameworkName('core-data')).toBe('Core Data');
      expect(normalizeFrameworkName('arkit')).toBe('ARKit');
      expect(normalizeFrameworkName('webkit')).toBe('WebKit');
    });

    it('should handle case variations', () => {
      expect(normalizeFrameworkName('SWIFTUI')).toBe('SwiftUI');
      expect(normalizeFrameworkName('SwiftUI')).toBe('SwiftUI');
      expect(normalizeFrameworkName('swift-ui')).toBe('SwiftUI');
      expect(normalizeFrameworkName('swift_ui')).toBe('SwiftUI');
    });

    it('should handle empty or invalid input', () => {
      expect(normalizeFrameworkName('')).toBe('');
      expect(normalizeFrameworkName('   ')).toBe('');
      // @ts-expect-error Testing invalid input
      expect(normalizeFrameworkName(null)).toBe('');
      // @ts-expect-error Testing invalid input
      expect(normalizeFrameworkName(undefined)).toBe('');
    });

    it('should return original name with proper casing for unknown frameworks', () => {
      expect(normalizeFrameworkName('unknownframework')).toBe('Unknownframework');
      expect(normalizeFrameworkName('custom-lib')).toBe('Custom-lib');
    });

    it('should handle already canonical names', () => {
      expect(normalizeFrameworkName('Foundation')).toBe('Foundation');
      expect(normalizeFrameworkName('Core Data')).toBe('Core Data');
      expect(normalizeFrameworkName('Metal Performance Shaders')).toBe('Metal Performance Shaders');
    });
  });

  describe('getFrameworkAliases', () => {
    it('should return aliases for known frameworks', () => {
      const aliases = getFrameworkAliases('SwiftUI');
      expect(aliases).toContain('swiftui');
      expect(aliases).toContain('swift-ui');
      expect(aliases).toContain('swift_ui');
    });

    it('should return empty array for unknown frameworks', () => {
      expect(getFrameworkAliases('UnknownFramework')).toEqual([]);
    });

    it('should work with normalized names', () => {
      const aliases = getFrameworkAliases('swiftui');
      expect(aliases).toContain('swiftui');
    });
  });

  describe('isValidFramework', () => {
    it('should return true for valid frameworks', () => {
      expect(isValidFramework('swiftui')).toBe(true);
      expect(isValidFramework('SwiftUI')).toBe(true);
      expect(isValidFramework('core-data')).toBe(true);
      expect(isValidFramework('Foundation')).toBe(true);
    });

    it('should return false for invalid frameworks', () => {
      expect(isValidFramework('unknownframework')).toBe(false);
      expect(isValidFramework('')).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(isValidFramework(null)).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(isValidFramework(undefined)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidFramework('   ')).toBe(false);
      expect(isValidFramework('123')).toBe(false);
    });
  });

  describe('getFrameworksByCategory', () => {
    it('should return frameworks for valid categories', () => {
      const uiFrameworks = getFrameworksByCategory('UI');
      expect(uiFrameworks).toContain('SwiftUI');
      expect(uiFrameworks).toContain('UIKit');
      expect(uiFrameworks).toContain('AppKit');

      const gameFrameworks = getFrameworksByCategory('Games');
      expect(gameFrameworks).toContain('ARKit');
      expect(gameFrameworks).toContain('SceneKit');
      expect(gameFrameworks).toContain('SpriteKit');
    });

    it('should return empty array for invalid categories', () => {
      // @ts-expect-error Testing invalid category
      expect(getFrameworksByCategory('InvalidCategory')).toEqual([]);
    });
  });

  describe('getFrameworkCategory', () => {
    it('should return correct category for known frameworks', () => {
      expect(getFrameworkCategory('SwiftUI')).toBe('UI');
      expect(getFrameworkCategory('swiftui')).toBe('UI');
      expect(getFrameworkCategory('Core Data')).toBe('Data');
      expect(getFrameworkCategory('arkit')).toBe('Games');
      expect(getFrameworkCategory('Foundation')).toBe('Foundation');
    });

    it('should return null for unknown frameworks', () => {
      expect(getFrameworkCategory('UnknownFramework')).toBeNull();
      expect(getFrameworkCategory('')).toBeNull();
    });
  });

  describe('searchFrameworks', () => {
    it('should find frameworks by partial name', () => {
      const results = searchFrameworks('swift');
      expect(results).toContain('SwiftUI');
      expect(results).toContain('Swift');

      const coreResults = searchFrameworks('core');
      expect(coreResults).toContain('Core Data');
      expect(coreResults).toContain('Core Graphics');
      expect(coreResults).toContain('Core Animation');
    });

    it('should handle case insensitive search', () => {
      const results = searchFrameworks('SWIFT');
      expect(results).toContain('SwiftUI');
      expect(results).toContain('Swift');
    });

    it('should return empty array for invalid input', () => {
      expect(searchFrameworks('')).toEqual([]);
      // @ts-expect-error Testing invalid input
      expect(searchFrameworks(null)).toEqual([]);
      expect(searchFrameworks('xyz123notfound')).toEqual([]);
    });

    it('should return sorted results', () => {
      const results = searchFrameworks('kit');
      expect(results).toBeTruthy();
      // Check that results are sorted
      const sorted = [...results].sort();
      expect(results).toEqual(sorted);
    });
  });

  describe('getFrameworkInfo', () => {
    it('should return complete info for valid frameworks', () => {
      const info = getFrameworkInfo('swiftui');
      expect(info.canonical).toBe('SwiftUI');
      expect(info.category).toBe('UI');
      expect(info.isValid).toBe(true);
      expect(info.aliases).toContain('swiftui');
    });

    it('should handle unknown frameworks gracefully', () => {
      const info = getFrameworkInfo('unknownframework');
      expect(info.canonical).toBe('Unknownframework');
      expect(info.category).toBeNull();
      expect(info.isValid).toBe(false);
      expect(info.aliases).toEqual([]);
    });

    it('should work with canonical names', () => {
      const info = getFrameworkInfo('Foundation');
      expect(info.canonical).toBe('Foundation');
      expect(info.category).toBe('Foundation');
      expect(info.isValid).toBe(true);
    });
  });

  describe('FRAMEWORK_MAPPINGS consistency', () => {
    it('should have lowercase keys', () => {
      Object.keys(FRAMEWORK_MAPPINGS).forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });
    });

    it('should have proper capitalization in values', () => {
      Object.values(FRAMEWORK_MAPPINGS).forEach(value => {
        expect(value).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });

    it('should allow intentional duplicate values for aliases', () => {
      const values = Object.values(FRAMEWORK_MAPPINGS);
      const uniqueValues = new Set(values);
      // Some frameworks intentionally have multiple aliases mapping to the same canonical name
      expect(uniqueValues.size).toBeGreaterThan(0);
      expect(values.length).toBeGreaterThan(uniqueValues.size);
    });
  });

  describe('FRAMEWORK_CATEGORIES consistency', () => {
    it('should contain valid framework names', () => {
      Object.values(FRAMEWORK_CATEGORIES).flat().forEach(framework => {
        expect(typeof framework).toBe('string');
        expect(framework.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicates across categories', () => {
      const allFrameworks = Object.values(FRAMEWORK_CATEGORIES).flat();
      const uniqueFrameworks = new Set(allFrameworks);
      expect(allFrameworks.length).toBe(uniqueFrameworks.size);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex framework name variations', () => {
      const testCases = [
        { input: 'metal-performance-shaders', expected: 'Metal Performance Shaders' },
        { input: 'app-tracking-transparency', expected: 'App Tracking Transparency' },
        { input: 'natural_language', expected: 'Natural Language' },
        { input: 'WEBKIT', expected: 'WebKit' },
        { input: 'swift playgrounds', expected: 'Swift Playgrounds' }, // Maps to canonical name
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeFrameworkName(input)).toBe(expected);
      });
    });

    it('should maintain consistency between search and normalize', () => {
      const searchResults = searchFrameworks('data');
      searchResults.forEach(framework => {
        const normalized = normalizeFrameworkName(framework.toLowerCase());
        expect(normalized).toBe(framework);
      });
    });
  });
});