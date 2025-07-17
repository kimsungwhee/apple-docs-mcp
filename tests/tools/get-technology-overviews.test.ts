import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleGetTechnologyOverviews } from '../../src/tools/get-technology-overviews.js';
import { httpClient } from '../../src/utils/http-client.js';
import { technologyOverviewsCache } from '../../src/utils/cache.js';

// Mock dependencies
jest.mock('../../src/utils/http-client.js');
jest.mock('../../src/utils/cache.js', () => ({
  technologyOverviewsCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  generateUrlCacheKey: jest.fn((key, params) => `${key}-${JSON.stringify(params)}`),
}));

describe('get-technology-overviews', () => {
  const mockOverviewsData = {
    topicSections: [
      {
        title: 'Get started',
        identifiers: [
          'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/app-design-and-ui',
          'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/games',
        ],
        anchor: 'Get-started',
      },
      {
        title: 'Discover Apple technologies',
        identifiers: [
          'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/data-management',
          'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/ai-machine-learning',
        ],
        anchor: 'Discover-Apple-technologies',
      },
    ],
    references: {
      'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/app-design-and-ui': {
        type: 'topic',
        title: 'App design and UI',
        url: '/documentation/technologyoverviews/app-design-and-ui',
        abstract: [
          { text: 'Choose a programming approach to build your app, create your app\'s interface, and implement', type: 'text' },
          { text: ' ', type: 'text' },
          { text: 'the fundamental behaviors that your app requires.', type: 'text' },
        ],
        kind: 'article',
        role: 'collectionGroup',
      },
      'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/games': {
        type: 'topic',
        title: 'Games',
        url: '/documentation/technologyoverviews/games',
        abstract: [
          { text: 'Learn to build immersive, engaging gaming experiences on Apple platforms.', type: 'text' },
        ],
        kind: 'article',
        role: 'collectionGroup',
      },
      'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/data-management': {
        type: 'topic',
        title: 'Data management',
        url: '/documentation/technologyoverviews/data-management',
        abstract: [
          { text: 'Store, organize, and access your app\'s data efficiently.', type: 'text' },
        ],
        kind: 'article',
        role: 'collection',
      },
      'doc://com.apple.TechnologyOverviews/documentation/TechnologyOverviews/ai-machine-learning': {
        type: 'topic',
        title: 'AI & Machine Learning',
        url: '/documentation/technologyoverviews/ai-machine-learning',
        abstract: [
          { text: 'Integrate intelligent features into your apps using machine learning models.', type: 'text' },
        ],
        kind: 'article',
        role: 'collection',
      },
    },
  };

  const mockOverviewsIndex = {
    interfaceLanguages: {
      swift: [
        {
          path: '/documentation/technologyoverviews',
          title: 'Technology Overviews',
          type: 'module',
          children: [
            {
              title: 'Get started',
              type: 'groupMarker',
            },
            {
              path: '/documentation/technologyoverviews/app-design-and-ui',
              title: 'App design and UI',
              type: 'collection',
              children: [
                {
                  title: 'App builder',
                  type: 'groupMarker',
                },
                {
                  path: '/documentation/technologyoverviews/swiftui',
                  title: 'SwiftUI apps',
                  type: 'article',
                },
                {
                  path: '/documentation/technologyoverviews/uikit-appkit',
                  title: 'UIKit and AppKit apps',
                  type: 'article',
                },
              ],
            },
            {
              path: '/documentation/technologyoverviews/games',
              title: 'Games',
              type: 'collection',
              children: [
                {
                  path: '/documentation/technologyoverviews/games-technologies',
                  title: 'Game technologies',
                  type: 'article',
                },
              ],
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (technologyOverviewsCache.get as jest.Mock).mockReturnValue(null);
    (httpClient.getJson as jest.Mock).mockImplementation((url: unknown) => {
      const urlStr = url as string;
      if (urlStr.includes('TechnologyOverviews.json')) {
        return Promise.resolve(mockOverviewsData);
      }
      if (urlStr.includes('index/technologyoverviews')) {
        return Promise.resolve(mockOverviewsIndex);
      }
      throw new Error('Unknown URL');
    });
  });

  it('should fetch and format technology overviews', async () => {
    const result = await handleGetTechnologyOverviews();

    expect(httpClient.getJson).toHaveBeenCalledTimes(2);
    expect(result).toContain('Apple Developer Technology Overviews');
    expect(result).toContain('App design and UI');
    expect(result).toContain('Games');
    expect(result).toContain('Data management');
    expect(result).toContain('AI & Machine Learning');
  });

  it('should filter by category', async () => {
    const result = await handleGetTechnologyOverviews('app-design-and-ui');

    expect(result).toContain('App design and UI');
    // The main category should be present
    expect(result).not.toContain('Games');
    expect(result).not.toContain('Data management');
  });

  it('should filter by platform', async () => {
    // Add iOS-specific item to mock data
    const mockWithPlatform = { ...mockOverviewsIndex };
    mockWithPlatform.interfaceLanguages.swift[0].children.push({
      path: '/documentation/technologyoverviews/ios-fundamentals',
      title: 'iOS Fundamentals',
      type: 'article',
    });

    (httpClient.getJson as jest.Mock).mockImplementation((url: unknown) => {
      const urlStr = url as string;
      if (urlStr.includes('TechnologyOverviews.json')) {
        return Promise.resolve(mockOverviewsData);
      }
      if (urlStr.includes('index/technologyoverviews')) {
        return Promise.resolve(mockWithPlatform);
      }
      throw new Error('Unknown URL');
    });

    const result = await handleGetTechnologyOverviews(undefined, 'ios');

    expect(result).toContain('iOS Fundamentals');
  });

  it('should search by query', async () => {
    const result = await handleGetTechnologyOverviews(undefined, 'all', 'machine learning');

    expect(result).toContain('AI & Machine Learning');
    expect(result).not.toContain('App design and UI');
    expect(result).not.toContain('Games');
  });

  it('should respect includeSubcategories flag', async () => {
    const result = await handleGetTechnologyOverviews('app-design-and-ui', 'all', undefined, false);

    expect(result).toContain('App design and UI');
    // Should not include nested items when includeSubcategories is false
    const swiftUICount = (result.match(/SwiftUI apps/g) || []).length;
    expect(swiftUICount).toBeLessThanOrEqual(1);
  });

  it('should limit results', async () => {
    const result = await handleGetTechnologyOverviews(undefined, 'all', undefined, true, 2);

    // Should limit top-level items to 2
    // Count top-level items (those with "### [" at the start of line)
    const topLevelItems = result.split('\n').filter(line => line.match(/^### \[/));
    expect(topLevelItems.length).toBeLessThanOrEqual(2);
  });

  it('should use cache when available', async () => {
    const cachedResult = '# Cached Technology Overviews\n\nThis is cached content.';
    (technologyOverviewsCache.get as jest.Mock).mockReturnValue(cachedResult);

    const result = await handleGetTechnologyOverviews();

    expect(httpClient.getJson).not.toHaveBeenCalled();
    expect(result).toBe(cachedResult);
  });

  it('should store results in cache', async () => {
    await handleGetTechnologyOverviews();

    expect(technologyOverviewsCache.set).toHaveBeenCalled();
    const [cacheKey, cachedValue] = (technologyOverviewsCache.set as jest.Mock).mock.calls[0];
    expect(cacheKey).toContain('technology-overviews');
    expect(cachedValue).toContain('Apple Developer Technology Overviews');
  });

  it('should handle empty results', async () => {
    // Mock empty data
    (httpClient.getJson as jest.Mock).mockImplementation((url: unknown) => {
      const urlStr = url as string;
      if (urlStr.includes('TechnologyOverviews.json')) {
        return Promise.resolve({ topicSections: [], references: {} });
      }
      if (urlStr.includes('index/technologyoverviews')) {
        return Promise.resolve({ interfaceLanguages: { swift: [] } });
      }
      throw new Error('Unknown URL');
    });

    const result = await handleGetTechnologyOverviews();

    expect(result).toBe('No technology overviews found matching the specified criteria.');
  });

  it('should handle errors gracefully', async () => {
    (httpClient.getJson as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await handleGetTechnologyOverviews();

    expect(result).toContain('Error: Failed to fetch technology overviews');
    expect(result).toContain('Network error');
  });

  it('should properly format hierarchical structure', async () => {
    const result = await handleGetTechnologyOverviews();

    // Check for proper formatting
    expect(result).toContain('### [App design and UI]');
    expect(result).toContain('*Type:');
    // Should have proper markdown structure
    expect(result).toMatch(/^# Apple Developer Technology Overviews/);
  });

  it('should handle abstract text concatenation', async () => {
    const result = await handleGetTechnologyOverviews();

    // Check that multi-part abstract is properly concatenated
    expect(result).toContain('Choose a programming approach to build your app, create your app\'s interface, and implement the fundamental behaviors that your app requires.');
  });

  it('should group overviews by section', async () => {
    const result = await handleGetTechnologyOverviews();

    // Check proper grouping - sections should be formatted with title case
    const getStartedIndex = result.indexOf('## Get Started');
    const discoverIndex = result.indexOf('## Discover Apple Technologies');

    expect(getStartedIndex).toBeGreaterThan(-1);
    expect(discoverIndex).toBeGreaterThan(-1);
    expect(getStartedIndex).toBeLessThan(discoverIndex);
  });

  it('should include type badges', async () => {
    const result = await handleGetTechnologyOverviews();

    // Check for type information
    expect(result).toContain('*Type:');
  });

  it('should include footer link', async () => {
    const result = await handleGetTechnologyOverviews();

    expect(result).toContain('[Explore all Technology Overviews](https://developer.apple.com/documentation/technologyoverviews)');
  });
});