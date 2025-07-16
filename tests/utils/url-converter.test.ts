/**
 * Tests for URL converter utilities
 */

import { convertToJsonApiUrl, isValidAppleDeveloperUrl, extractApiNameFromUrl } from '../../src/utils/url-converter.js';

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