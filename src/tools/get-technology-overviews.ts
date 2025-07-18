import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { technologyOverviewsCache, generateUrlCacheKey } from '../utils/cache.js';
import { APPLE_URLS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';


export const getTechnologyOverviewsTool: Tool = {
  name: 'get_technology_overviews',
  description: 'Get Apple Developer Technology Overviews - comprehensive guides for Apple platforms and technologies',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by specific category (e.g., "app-design-and-ui", "games", "ai-machine-learning")',
      },
      platform: {
        type: 'string',
        enum: ['all', 'ios', 'macos', 'watchos', 'tvos', 'visionos'],
        description: 'Filter by platform (default: all)',
      },
      searchQuery: {
        type: 'string',
        description: 'Search for specific keywords in overviews',
      },
      includeSubcategories: {
        type: 'boolean',
        description: 'Include subcategories and nested content (default: true)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50)',
      },
    },
    required: [],
  },
};

/**
 * Interface for Technology Overviews data
 */
interface TechnologyOverviewsData {
  topicSections: Array<{
    title: string;
    identifiers: string[];
    anchor: string;
  }>;
  references: Record<string, {
    type: string;
    title: string;
    url: string;
    abstract?: Array<{ text: string; type: string }>;
    kind?: string;
    role?: string;
  }>;
}

/**
 * Interface for Technology Overviews Index data
 */
interface TechnologyOverviewsIndexData {
  interfaceLanguages: {
    swift: TechnologyOverviewsIndexSection[];
  };
}

interface TechnologyOverviewsIndexSection {
  path: string;
  title: string;
  type: string;
  children?: TechnologyOverviewsIndexSection[];
}

/**
 * Handle get technology overviews
 */
export async function handleGetTechnologyOverviews(
  category?: string,
  platform: string = 'all',
  searchQuery?: string,
  includeSubcategories: boolean = true,
  limit: number = 50,
): Promise<string> {
  try {
    console.error('Fetching technology overviews...');

    // Generate cache key
    const cacheKey = generateUrlCacheKey('technology-overviews', {
      category,
      platform,
      searchQuery,
      includeSubcategories,
      limit,
    });

    // Try to get from cache first
    const cachedResult = technologyOverviewsCache.get<string>(cacheKey);
    if (cachedResult) {
      console.error('Technology overviews cache hit');
      return cachedResult;
    }

    // Fetch both data files
    const [overviewsData, overviewsIndex] = await Promise.all([
      httpClient.getJson<TechnologyOverviewsData>(APPLE_URLS.TECHNOLOGY_OVERVIEWS_JSON),
      httpClient.getJson<TechnologyOverviewsIndexData>(APPLE_URLS.TECHNOLOGY_OVERVIEWS_INDEX_JSON),
    ]);

    // Parse and filter overviews
    const overviews = parseOverviews(overviewsData, overviewsIndex);
    const filteredOverviews = applyOverviewsFilters(overviews, {
      category,
      platform,
      searchQuery,
      includeSubcategories,
      limit,
    });

    // Format output
    const result = formatOverviewsList(filteredOverviews);

    // Cache the result
    technologyOverviewsCache.set(cacheKey, result);

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Error fetching technology overviews:', error);
    return `Error: Failed to fetch technology overviews: ${errorMessage}`;
  }
}

/**
 * Parse overviews data
 */
function parseOverviews(overviewsData: TechnologyOverviewsData, overviewsIndex: TechnologyOverviewsIndexData) {
  const overviews: OverviewItem[] = [];

  // Process main overview sections
  if (overviewsData.topicSections) {
    overviewsData.topicSections.forEach(section => {
      section.identifiers.forEach(identifier => {
        const reference = overviewsData.references[identifier];
        if (reference) {
          // Construct description from abstract array
          let description = '';
          if (reference.abstract && Array.isArray(reference.abstract)) {
            description = reference.abstract
              .map(part => part.text || '')
              .join('')
              .trim();
          }

          const overviewItem: OverviewItem = {
            title: reference.title,
            url: reference.url ? `https://developer.apple.com${reference.url}` : '',
            description,
            category: extractCategoryFromUrl(reference.url),
            type: reference.kind ?? 'overview',
            identifier,
            sectionTitle: section.title,
            depth: 0,
          };

          overviews.push(overviewItem);
        }
      });
    });
  }

  // Process index data for hierarchical structure
  if (overviewsIndex.interfaceLanguages?.swift) {
    processIndexSection(overviewsIndex.interfaceLanguages.swift, overviews, 0, null);
  }

  return overviews;
}

/**
 * Process index section recursively
 */
function processIndexSection(sections: TechnologyOverviewsIndexSection[], overviews: OverviewItem[], depth: number, parentSection: string | null) {
  let currentSection = parentSection;

  sections.forEach(section => {
    // Track current section from group markers
    if (section.type === 'groupMarker') {
      currentSection = section.title;
      // Process children with same depth but updated section
      if (section.children) {
        processIndexSection(section.children, overviews, depth, currentSection);
      }
      return;
    }

    // Check if this section already exists in overviews
    const existingOverview = overviews.find(o =>
      o.url.includes(section.path) || o.title === section.title,
    );

    if (existingOverview) {
      // Update with additional info
      existingOverview.path = section.path;
      existingOverview.depth = depth;
      existingOverview.type = section.type;
      if (currentSection && !existingOverview.sectionTitle) {
        existingOverview.sectionTitle = currentSection;
      }
    } else {
      // Add new overview item
      const newOverview: OverviewItem = {
        title: section.title,
        url: `https://developer.apple.com${section.path}`,
        description: '',
        category: extractCategoryFromUrl(section.path),
        type: section.type,
        identifier: section.path,
        path: section.path,
        depth,
        sectionTitle: currentSection || '',
      };
      overviews.push(newOverview);
    }

    // Process children
    if (section.children) {
      processIndexSection(section.children, overviews, depth + 1, currentSection);
    }
  });
}

/**
 * Extract category from URL
 */
function extractCategoryFromUrl(url: string): string {
  const match = url.match(/\/documentation\/technologyoverviews\/([^/]+)/i);
  return match?.[1] ?? 'general';
}

/**
 * Apply filters to overviews
 */
function applyOverviewsFilters(
  overviews: OverviewItem[],
  filters: {
    category?: string;
    platform?: string;
    searchQuery?: string;
    includeSubcategories?: boolean;
    limit?: number;
  },
): OverviewItem[] {
  let filtered = [...overviews];

  // Category filter
  if (filters.category) {
    const categoryLower = filters.category.toLowerCase();

    // First, find all items that match the category
    const categoryItems = overviews.filter(overview => {
      return overview.category.toLowerCase() === categoryLower ||
             overview.title.toLowerCase() === categoryLower.replace(/-/g, ' ') ||
             overview.path?.toLowerCase().includes(`/${categoryLower}`);
    });

    // If we found category items, also include their children
    if (categoryItems.length > 0) {
      const categoryPaths = categoryItems.map(item => item.path || item.url);

      filtered = overviews.filter(overview => {
        // Include the category items themselves
        if (categoryItems.includes(overview)) {
          return true;
        }

        // Include children of category items
        if (overview.path || overview.url) {
          const overviewPath = (overview.path || overview.url).replace('https://developer.apple.com', '');
          return categoryPaths.some(categoryPath => {
            const cleanCategoryPath = categoryPath.replace('https://developer.apple.com', '');
            return overviewPath.startsWith(cleanCategoryPath) && overviewPath !== cleanCategoryPath;
          });
        }

        return false;
      });
    } else {
      // No matching category found
      filtered = [];
    }
  }

  // Platform filter
  if (filters.platform && filters.platform !== 'all') {
    const platformLower = filters.platform.toLowerCase();
    filtered = filtered.filter(overview =>
      overview.title.toLowerCase().includes(platformLower) ||
      overview.description.toLowerCase().includes(platformLower) ||
      overview.path?.toLowerCase().includes(platformLower),
    );
  }

  // Search query filter
  if (filters.searchQuery) {
    const queryLower = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(overview =>
      overview.title.toLowerCase().includes(queryLower) ||
      overview.description.toLowerCase().includes(queryLower),
    );
  }

  // If not including subcategories, filter out deep items
  if (!filters.includeSubcategories) {
    // Keep only top-level items (depth 0 or 1)
    filtered = filtered.filter(overview => overview.depth <= 1);
  }

  // Apply limit (limit top-level items, but include their children)
  if (filters.limit && filters.limit > 0) {
    // Count top-level items
    let topLevelCount = 0;
    const limitedResults: OverviewItem[] = [];

    for (const item of filtered) {
      if (item.depth === 0) {
        if (topLevelCount >= filters.limit) {
          break;
        }
        topLevelCount++;
      }
      limitedResults.push(item);
    }

    filtered = limitedResults;
  }

  return filtered;
}

/**
 * Format overviews list
 */
function formatOverviewsList(overviews: OverviewItem[]): string {
  if (overviews.length === 0) {
    return 'No technology overviews found matching the specified criteria.';
  }

  let content = '# Apple Developer Technology Overviews\n\n';
  content += '*Comprehensive guides for Apple platforms and technologies*\n\n';

  // Group by category and depth for better organization
  const grouped = groupOverviewsByCategory(overviews);

  // Format each category
  Object.entries(grouped).forEach(([category, items]) => {
    const categoryTitle = formatCategoryTitle(category);
    content += `## ${categoryTitle}\n\n`;

    // Sort items by depth and title
    items.sort((a, b) => {
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      return a.title.localeCompare(b.title);
    });

    // Format items with proper indentation
    items.forEach(item => {
      const indent = '  '.repeat(item.depth);

      // Title with link
      content += `${indent}### [${item.title}](${item.url})\n`;

      // Type badge
      if (item.type && item.type !== 'overview') {
        content += `${indent}*Type: ${formatType(item.type)}*\n`;
      }

      // Description
      if (item.description) {
        content += `${indent}${item.description}\n`;
      }

      content += '\n';
    });
  });

  content += '\n---\n\n[Explore all Technology Overviews](https://developer.apple.com/documentation/technologyoverviews)';

  return content;
}

/**
 * Group overviews by category
 */
function groupOverviewsByCategory(overviews: OverviewItem[]): Record<string, OverviewItem[]> {
  return overviews.reduce((acc, overview) => {
    // Use sectionTitle for top-level items, otherwise use the parent category
    let groupKey = overview.sectionTitle;

    // If no section title or it's a nested item, try to group by top-level category
    if (!groupKey && overview.depth > 0) {
      // Extract top-level category from the path
      const pathParts = overview.category.split('-');
      groupKey = formatCategoryTitle(pathParts[0]);
    }

    // Default to formatted category
    if (!groupKey) {
      groupKey = formatCategoryTitle(overview.category);
    }

    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(overview);
    return acc;
  }, {} as Record<string, OverviewItem[]>);
}

/**
 * Format category title
 */
function formatCategoryTitle(category: string): string {
  return category
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format type
 */
function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    'collection': 'Collection',
    'article': 'Article',
    'module': 'Module',
    'groupMarker': 'Group',
  };
  return typeMap[type] ?? type;
}

/**
 * Overview item interface
 */
interface OverviewItem {
  title: string;
  url: string;
  description: string;
  category: string;
  type: string;
  identifier: string;
  path?: string;
  depth: number;
  sectionTitle: string;
}