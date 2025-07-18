import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleListTechnologies } from '../../src/tools/list-technologies.js';
import { httpClient } from '../../src/utils/http-client.js';
import { technologiesCache } from '../../src/utils/cache.js';

jest.mock('../../src/utils/http-client.js');
jest.mock('../../src/utils/cache.js', () => ({
  technologiesCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  generateUrlCacheKey: jest.fn().mockImplementation((url, params) => `${url}-${JSON.stringify(params)}`),
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('list-technologies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleListTechnologies', () => {
    const mockTechnologiesResponse = {
      sections: [
        {
          kind: 'technologies',
          groups: [
            {
              name: 'Featured',
              technologies: [
                {
                  title: 'SwiftUI',
                  identifier: 'swiftui',
                  tags: [],
                  languages: ['swift'],
                  destination: {
                    identifier: 'doc://com.apple.documentation/documentation/swiftui'
                  }
                },
                {
                  title: 'UIKit', 
                  identifier: 'uikit',
                  tags: [],
                  languages: ['swift', 'occ'],
                  destination: {
                    identifier: 'doc://com.apple.documentation/documentation/uikit'
                  }
                }
              ]
            },
            {
              name: 'App Frameworks',
              technologies: [
                {
                  title: 'Foundation',
                  identifier: 'foundation',
                  tags: [],
                  languages: ['swift', 'occ'],
                  destination: {
                    identifier: 'doc://com.apple.documentation/documentation/foundation'
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    it('should list all technologies without filters', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockTechnologiesResponse);

      const result = await handleListTechnologies();

      expect(mockHttpClient.getJson).toHaveBeenCalledWith(
        'https://developer.apple.com/tutorials/data/documentation/technologies.json'
      );
      expect(result).toContain('# Apple Developer Technologies');
      expect(result).toContain('## Featured');
      expect(result).toContain('[SwiftUI]');
      expect(result).toContain('## App Frameworks');
      expect(result).toContain('[Foundation]');
    });

    it('should filter by category', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockTechnologiesResponse);

      const result = await handleListTechnologies('app frameworks');

      expect(result).toContain('## App Frameworks');
      expect(result).toContain('[Foundation]');
      expect(result).not.toContain('## Featured');
      expect(result).not.toContain('[SwiftUI]');
    });

    it('should handle case-insensitive category filtering', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockTechnologiesResponse);

      const result = await handleListTechnologies('APP FRAMEWORKS');

      expect(result).toContain('## App Frameworks');
      expect(result).toContain('[Foundation]');
    });

    it('should filter by language', async () => {
      const mockResponseWithLanguage = {
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'Featured',
                technologies: [
                  {
                    title: 'SwiftUI',
                    identifier: 'swiftui',
                    tags: [],
                    languages: ['swift'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/swiftui'
                    }
                  },
                  {
                    title: 'Core Foundation',
                    identifier: 'corefoundation',
                    tags: [],
                    languages: ['occ'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/corefoundation'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(mockResponseWithLanguage);

      const result = await handleListTechnologies(undefined, 'swift');

      expect(result).toContain('[SwiftUI]');
      expect(result).not.toContain('Core Foundation');
    });

    it('should exclude beta technologies when includeBeta is false', async () => {
      const mockResponseWithBeta = {
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'Featured',
                technologies: [
                  {
                    title: 'SwiftUI',
                    identifier: 'swiftui',
                    tags: ['Beta'],
                    languages: ['swift'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/swiftui'
                    }
                  },
                  {
                    title: 'UIKit',
                    identifier: 'uikit',
                    tags: [],
                    languages: ['swift', 'occ'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/uikit'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(mockResponseWithBeta);

      const result = await handleListTechnologies(undefined, undefined, false);

      expect(result).not.toContain('SwiftUI');
      expect(result).toContain('[UIKit]');
    });

    it('should handle empty response', async () => {
      mockHttpClient.getJson.mockResolvedValue({ sections: [] });

      const result = await handleListTechnologies();

      expect(result).toContain('No technologies found matching the specified criteria.');
    });

    it('should handle fetch errors', async () => {
      mockHttpClient.getJson.mockRejectedValue(new Error('Network error'));

      const result = await handleListTechnologies();
      
      expect(result).toContain('Error: Failed to list technologies:');
      expect(result).toContain('Network error');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockHttpClient.getJson.mockResolvedValue({ invalid: 'response' });

      const result = await handleListTechnologies();

      expect(result).toContain('No technologies found matching the specified criteria.');
    });

    it('should return detailed technology information when available', async () => {
      const detailedResponse = {
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'Graphics & Games',
                technologies: [
                  {
                    title: 'Metal',
                    identifier: 'metal',
                    tags: ['Graphics', 'Games'],
                    languages: ['swift', 'occ'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/metal'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(detailedResponse);

      const result = await handleListTechnologies();

      expect(result).toContain('[Metal]');
      expect(result).toContain('Languages: swift, occ');
      expect(result).toContain('Categories: Graphics, Games');
    });

    it('should respect limit parameter', async () => {
      const limitTestResponse = {
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'UI Frameworks',
                technologies: [
                  {
                    title: 'SwiftUI',
                    identifier: 'swiftui',
                    tags: ['UI'],
                    languages: ['swift']
                  },
                  {
                    title: 'UIKit',
                    identifier: 'uikit',
                    tags: ['UI'],
                    languages: ['swift', 'occ']
                  },
                  {
                    title: 'AppKit',
                    identifier: 'appkit',
                    tags: ['UI'],
                    languages: ['swift', 'occ']
                  }
                ]
              },
              {
                name: 'Data Frameworks',
                technologies: [
                  {
                    title: 'Core Data',
                    identifier: 'coredata',
                    tags: ['Data'],
                    languages: ['swift', 'occ']
                  },
                  {
                    title: 'CloudKit',
                    identifier: 'cloudkit',
                    tags: ['Data'],
                    languages: ['swift', 'occ']
                  }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(limitTestResponse);

      // Test with limit of 2
      const result = await handleListTechnologies(undefined, undefined, true, 2);

      // Should contain first 2 technologies
      expect(result).toContain('SwiftUI');
      expect(result).toContain('UIKit');
      
      // Should NOT contain the 3rd and beyond technologies
      expect(result).not.toContain('AppKit');
      expect(result).not.toContain('Core Data');
      expect(result).not.toContain('CloudKit');
      
      // Should show correct count
      expect(result).toContain('Found 2 technologies');
    });

    it('should handle limit parameter across multiple groups', async () => {
      const multiGroupResponse = {
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'Group A',
                technologies: [
                  { title: 'Tech 1', identifier: 'tech1', tags: [], languages: ['swift'] },
                  { title: 'Tech 2', identifier: 'tech2', tags: [], languages: ['swift'] }
                ]
              },
              {
                name: 'Group B',
                technologies: [
                  { title: 'Tech 3', identifier: 'tech3', tags: [], languages: ['swift'] },
                  { title: 'Tech 4', identifier: 'tech4', tags: [], languages: ['swift'] }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(multiGroupResponse);

      // Test with limit of 3 (should span across groups)
      const result = await handleListTechnologies(undefined, undefined, true, 3);

      // Should contain first 3 technologies total
      expect(result).toContain('Tech 1');
      expect(result).toContain('Tech 2');
      expect(result).toContain('Tech 3');
      
      // Should NOT contain the 4th technology
      expect(result).not.toContain('Tech 4');
      
      // Should show correct count
      expect(result).toContain('Found 3 technologies');
    });

    it('should handle zero limit', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockTechnologiesResponse);

      const result = await handleListTechnologies(undefined, undefined, true, 0);

      expect(result).toContain('No technologies found matching the specified criteria.');
    });
  });
});