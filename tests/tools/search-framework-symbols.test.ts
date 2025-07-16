import { jest } from '@jest/globals';
import { searchFrameworkSymbols } from '../../src/tools/search-framework-symbols.js';
import { mockData, createTestFrameworkIndex } from '../helpers/test-helpers.js';

// Mock dependencies
jest.mock('../../src/utils/cache.js');
jest.mock('../../src/utils/http-client.js');

import { indexCache } from '../../src/utils/cache.js';
import { httpClient } from '../../src/utils/http-client.js';

describe('searchFrameworkSymbols', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful searches', () => {
    it('should search for classes in UIKit framework', async () => {
      // Mock cache miss
      (indexCache.get as jest.Mock).mockReturnValue(null);
      
      // Mock HTTP response
      (httpClient.getJson as jest.Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'swift', 10);

      expect(httpClient.getJson).toHaveBeenCalledWith(
        'https://developer.apple.com/tutorials/data/index/uikit'
      );
      expect(result).toContain('UIView');
      expect(result).toContain('UIViewController');
      expect(result).toContain('Found:** 4 classs');
      expect(indexCache.set).toHaveBeenCalled();
    });

    it('should search with wildcard pattern', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', '*View', 'swift', 10);

      expect(result).toContain('UIView');
      expect(result).toContain('UITableView');
      expect(result).toContain('UIStackView');
      expect(result).not.toContain('UIViewController');
      expect(result).toContain('matching "*View"');
    });

    it('should search all symbol types', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'all', undefined, 'swift', 10);

      expect(result).toContain('## Classs (4)');
      expect(result).toContain('## Structs (1)');
      expect(result).toContain('UIView');
      expect(result).toContain('List');
    });

    it('should use cache when available', async () => {
      const cachedResult = '# Cached Result';
      (indexCache.get as jest.Mock).mockReturnValue(cachedResult);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'swift', 10);

      expect(result).toBe(cachedResult);
      expect(httpClient.getJson).not.toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        path: `/documentation/uikit/class${i}`,
        title: `Class${i}`,
        type: 'class',
        beta: false,
        deprecated: false,
        children: [],
      }));

      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(
        createTestFrameworkIndex(manyItems)
      );

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'swift', 5);

      // Count occurrences of class links
      const classLinks = (result.match(/\[.*?\]/g) || []).length;
      expect(classLinks).toBe(5);
    });

    it('should support Objective-C language', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'occ', 10);

      expect(result).toContain('UIView');
      expect(result).toContain('Found:** 1 classs');
    });
  });

  describe('error cases', () => {
    it('should handle invalid framework gracefully', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockRejectedValue(new Error('404 Not Found'));

      const result = await searchFrameworkSymbols('invalidframework', 'class', undefined, 'swift', 10);

      expect(result).toContain('Error searching classes: 404 Not Found');
    });

    it('should handle empty framework name', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockRejectedValue(new Error('Invalid URL'));

      const result = await searchFrameworkSymbols('', 'class', undefined, 'swift', 10);

      expect(result).toContain('Error searching classes');
    });

    it('should handle unsupported language', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue({
        interfaceLanguages: {
          swift: mockData.frameworkIndex.interfaceLanguages.swift,
        },
      });

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'java', 10);

      expect(result).toContain('Language "java" not available');
      expect(result).toContain('Available languages: swift');
    });

    it('should handle no results gracefully', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue({
        interfaceLanguages: {
          swift: [
            {
              path: '/documentation/uikit/uiview',
              title: 'UIView',
              type: 'class',  // Not a macro
              beta: false,
              deprecated: false,
              children: [],
            }
          ]
        }
      });

      const result = await searchFrameworkSymbols('uikit', 'macro', undefined, 'swift', 10);

      expect(result).toContain('No macros found in uikit framework');
    });

    it('should handle network errors', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'swift', 10);

      expect(result).toContain('Error searching classes: Network error');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in pattern', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', 'UI[View]*', 'swift', 10);

      // Special characters should be escaped, so no matches
      expect(result).toContain('No classs found matching pattern "UI[View]*"');
    });

    it('should handle deeply nested items', async () => {
      const nestedIndex = createTestFrameworkIndex([
        {
          path: '/documentation/uikit/views',
          title: 'Views',
          type: 'collection',
          children: [
            {
              path: '/documentation/uikit/views/basic',
              title: 'Basic Views',
              type: 'collection',
              children: [
                {
                  path: '/documentation/uikit/uiview',
                  title: 'UIView',
                  type: 'class',
                  children: [],
                },
              ],
            },
          ],
        },
      ]);

      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(nestedIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'swift', 10);

      expect(result).toContain('UIView');
      expect(result).toContain('Found:** 1 classs');
    });

    it('should handle framework name case variations', async () => {
      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(mockData.frameworkIndex);

      // Test different case variations
      const result1 = await searchFrameworkSymbols('UIKit', 'class', undefined, 'swift', 1);
      const result2 = await searchFrameworkSymbols('UIKIT', 'class', undefined, 'swift', 1);
      const result3 = await searchFrameworkSymbols('uikit', 'class', undefined, 'swift', 1);

      // All should call the same lowercase URL
      expect(httpClient.getJson).toHaveBeenCalledWith(
        'https://developer.apple.com/tutorials/data/index/uikit'
      );
      expect(httpClient.getJson).toHaveBeenCalledTimes(3);
    });

    it('should handle items with beta and deprecated flags', async () => {
      const flaggedIndex = createTestFrameworkIndex([
        {
          path: '/documentation/uikit/betaclass',
          title: 'BetaClass',
          type: 'class',
          beta: true,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/deprecatedclass',
          title: 'DeprecatedClass',
          type: 'class',
          beta: false,
          deprecated: true,
          children: [],
        },
      ]);

      (indexCache.get as jest.Mock).mockReturnValue(null);
      (httpClient.getJson as jest.Mock).mockResolvedValue(flaggedIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 'swift', 10);

      expect(result).toContain('BetaClass**');
      expect(result).toContain('*(Beta, Class)*');
      expect(result).toContain('DeprecatedClass**');
      expect(result).toContain('*(Deprecated, Class)*');
    });
  });
});