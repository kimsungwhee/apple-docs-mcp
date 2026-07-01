/**
 * Tests for URL converter utilities
 */

import {
  convertToDesignJsonApiUrl,
  convertToJsonApiUrl,
  extractApiNameFromUrl,
  isAppleDesignUrl,
  isValidAppleDeveloperUrl,
} from '../../src/utils/url-converter.js';

describe('URL Converter', () => {
  describe('convertToJsonApiUrl', () => {
    it('should convert documentation URL to JSON API URL', () => {
      const webUrl = 'https://developer.apple.com/documentation/swiftui/view';
      const expected = 'https://developer.apple.com/tutorials/data/documentation/swiftui/view.json';
      
      expect(convertToJsonApiUrl(webUrl)).toBe(expected);
    });

    it('should handle URLs with trailing slash', () => {
      const webUrl = 'https://developer.apple.com/documentation/swiftui/view/';
      const expected = 'https://developer.apple.com/tutorials/data/documentation/swiftui/view.json';
      
      expect(convertToJsonApiUrl(webUrl)).toBe(expected);
    });

    it('should convert tutorial URL to JSON API URL', () => {
      const webUrl = 'https://developer.apple.com/tutorials/swiftui/creating-and-combining-views';
      const expected = 'https://developer.apple.com/tutorials/data/swiftui/creating-and-combining-views.json';
      
      expect(convertToJsonApiUrl(webUrl)).toBe(expected);
    });

    it('should return original URL if not recognized format', () => {
      const webUrl = 'https://developer.apple.com/news/some-article';
      
      expect(convertToJsonApiUrl(webUrl)).toBe(webUrl);
    });

    it('should convert Human Interface Guidelines root URL to JSON API URL', () => {
      const webUrl = 'https://developer.apple.com/design/human-interface-guidelines';
      const expected = 'https://developer.apple.com/tutorials/data/design/human-interface-guidelines.json';

      expect(convertToJsonApiUrl(webUrl)).toBe(expected);
      expect(convertToDesignJsonApiUrl(webUrl)).toBe(expected);
    });

    it('should convert Human Interface Guidelines child URL to JSON API URL', () => {
      const webUrl = 'https://developer.apple.com/design/human-interface-guidelines/layout';
      const expected = 'https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json';

      expect(convertToJsonApiUrl(webUrl)).toBe(expected);
      expect(convertToDesignJsonApiUrl(webUrl)).toBe(expected);
    });

    it('should convert Human Interface Guidelines URL with trailing slash', () => {
      const webUrl = 'https://developer.apple.com/design/human-interface-guidelines/layout/';
      const expected = 'https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json';

      expect(convertToJsonApiUrl(webUrl)).toBe(expected);
      expect(convertToDesignJsonApiUrl(webUrl)).toBe(expected);
    });

    it('should convert Human Interface Guidelines URL with anchor', () => {
      const webUrl = 'https://developer.apple.com/design/human-interface-guidelines/layout#columns';
      const expected = 'https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json';

      expect(convertToJsonApiUrl(webUrl)).toBe(expected);
      expect(convertToDesignJsonApiUrl(webUrl)).toBe(expected);
    });
  });

  describe('isValidAppleDeveloperUrl', () => {
    it('should return true for valid Apple Developer URLs', () => {
      const validUrls = [
        'https://developer.apple.com/documentation/swiftui',
        'https://developer.apple.com/tutorials/swiftui',
        'https://developer.apple.com/news/some-article',
      ];

      validUrls.forEach(url => {
        expect(isValidAppleDeveloperUrl(url)).toBe(true);
      });
    });

    it('should return false for invalid URLs', () => {
      const invalidUrls = [
        'https://apple.com/documentation/swiftui',
        'https://google.com/search',
        'not-a-url',
        '',
      ];

      invalidUrls.forEach(url => {
        expect(isValidAppleDeveloperUrl(url)).toBe(false);
      });
    });
  });

  describe('isAppleDesignUrl', () => {
    it('should return true for Apple Design URLs', () => {
      const validUrls = [
        'https://developer.apple.com/design',
        'https://developer.apple.com/design/',
        'https://developer.apple.com/design/resources/',
        'https://developer.apple.com/design/human-interface-guidelines/layout',
      ];

      validUrls.forEach(url => {
        expect(isAppleDesignUrl(url)).toBe(true);
      });
    });

    it('should return false for non-design URLs', () => {
      const invalidUrls = [
        'https://developer.apple.com/documentation/swiftui',
        'https://developer.apple.com/news/',
        'https://apple.com/design/',
        'not-a-url',
      ];

      invalidUrls.forEach(url => {
        expect(isAppleDesignUrl(url)).toBe(false);
      });
    });
  });

  describe('extractApiNameFromUrl', () => {
    it('should extract API name from URL', () => {
      const testCases = [
        {
          url: 'https://developer.apple.com/documentation/swiftui/view',
          expected: 'view'
        },
        {
          url: 'https://developer.apple.com/documentation/foundation/nsstring',
          expected: 'nsstring'
        },
        {
          url: 'https://developer.apple.com/documentation/swiftui/view/',
          expected: ''
        }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = extractApiNameFromUrl(url);
        if (expected === '') {
          expect(result).toBe('Unknown API');
        } else {
          expect(result).toBe(expected);
        }
      });
    });

    it('should return "Unknown API" for invalid URLs', () => {
      expect(extractApiNameFromUrl('not-a-url')).toBe('Unknown API');
    });
  });
});
