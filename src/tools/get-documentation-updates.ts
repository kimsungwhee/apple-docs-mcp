import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { updatesCache, generateUrlCacheKey } from '../utils/cache.js';
import { APPLE_URLS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';

export const getDocumentationUpdatesTool: Tool = {
  name: 'get_documentation_updates',
  description: 'Get the latest Apple Developer Documentation updates, including WWDC announcements, technology updates, and release notes',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['all', 'wwdc', 'technology', 'release-notes'],
        description: 'Filter by update category (default: all)',
      },
      technology: {
        type: 'string',
        description: 'Filter by specific technology/framework name (e.g., SwiftUI, UIKit)',
      },
      year: {
        type: 'string',
        description: 'Filter WWDC by year (e.g., 2025, 2024)',
      },
      searchQuery: {
        type: 'string',
        description: 'Search for specific keywords in updates',
      },
      includeBeta: {
        type: 'boolean',
        description: 'Include beta features (default: true)',
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
 * Interface for Updates data
 */
interface UpdatesData {
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
    images?: Array<{ type: string; identifier: string }>;
    kind?: string;
    role?: string;
  }>;
}

/**
 * Interface for Updates Index data
 */
interface UpdatesIndexData {
  interfaceLanguages: {
    swift: UpdatesIndexSection[];
  };
}

interface UpdatesIndexSection {
  path: string;
  title: string;
  type: string;
  beta?: boolean;
  children?: UpdatesIndexSection[];
}

/**
 * Handle get documentation updates
 */
export async function handleGetDocumentationUpdates(
  category: string = 'all',
  technology?: string,
  year?: string,
  searchQuery?: string,
  includeBeta: boolean = true,
  limit: number = 50,
): Promise<string> {
  try {
    logger.info('Fetching documentation updates...');

    // Generate cache key
    const cacheKey = generateUrlCacheKey('documentation-updates', {
      category,
      technology,
      year,
      searchQuery,
      includeBeta,
      limit,
    });

    // Try to get from cache first
    const cachedResult = updatesCache.get<string>(cacheKey);
    if (cachedResult) {
      logger.debug('Updates cache hit');
      return cachedResult;
    }

    // Fetch both updates data files
    const [updatesData, updatesIndex] = await Promise.all([
      httpClient.getJson<UpdatesData>(APPLE_URLS.UPDATES_JSON),
      httpClient.getJson<UpdatesIndexData>(APPLE_URLS.UPDATES_INDEX_JSON),
    ]);

    // Parse and filter updates
    const updates = parseUpdates(updatesData, updatesIndex);
    const filteredUpdates = applyUpdatesFilters(updates, {
      category,
      technology,
      year,
      searchQuery,
      includeBeta,
      limit,
    });

    // Format output
    const result = formatUpdatesList(filteredUpdates);

    // Cache the result
    updatesCache.set(cacheKey, result);

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    logger.error('Error fetching documentation updates:', error);
    return `Error: Failed to fetch documentation updates: ${errorMessage}`;
  }
}

/**
 * Parse updates data
 */
function parseUpdates(updatesData: UpdatesData, updatesIndex: UpdatesIndexData) {
  const updates: UpdateItem[] = [];

  // Process main updates sections
  if (updatesData.topicSections) {
    updatesData.topicSections.forEach(section => {
      const sectionCategory = getSectionCategory(section.title);

      section.identifiers.forEach(identifier => {
        const reference = updatesData.references[identifier];
        if (reference) {
          const updateItem: UpdateItem = {
            title: reference.title,
            url: reference.url ? `https://developer.apple.com${reference.url}` : '',
            description: reference.abstract?.[0]?.text ?? '',
            category: sectionCategory,
            type: reference.kind ?? 'update',
            identifier,
            images: reference.images,
          };

          // Extract year from WWDC titles
          if (sectionCategory === 'wwdc' && reference.title) {
            const yearMatch = reference.title.match(/WWDC(\d{2,4})/);
            if (yearMatch) {
              updateItem.year = yearMatch[1].length === 2 ? `20${yearMatch[1]}` : yearMatch[1];
            }
          }

          updates.push(updateItem);
        }
      });
    });
  }

  // Process index data for additional details and beta information
  if (updatesIndex.interfaceLanguages?.swift) {
    processIndexSection(updatesIndex.interfaceLanguages.swift, updates);
  }

  return updates;
}

/**
 * Process index section recursively
 */
function processIndexSection(sections: UpdatesIndexSection[], updates: UpdateItem[]) {
  sections.forEach(section => {
    // Find corresponding update item
    const matchingUpdate = updates.find(u =>
      u.url.includes(section.path) ||
      u.title === section.title,
    );

    if (matchingUpdate) {
      matchingUpdate.beta = section.beta ?? false;
      matchingUpdate.technology = extractTechnologyFromPath(section.path);
    }

    // Process children
    if (section.children) {
      processIndexSection(section.children, updates);
    }
  });
}

/**
 * Get section category
 */
function getSectionCategory(title: string): UpdateCategory {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('wwdc')) {
    return 'wwdc';
  }
  if (lowerTitle.includes('release notes')) {
    return 'release-notes';
  }
  if (lowerTitle.includes('technology')) {
    return 'technology';
  }
  return 'other';
}

/**
 * Extract technology from path
 */
function extractTechnologyFromPath(path: string): string | undefined {
  const match = path.match(/\/documentation\/updates\/([^/]+)/i);
  if (match?.[1]) {
    // Convert to proper case
    return match[1].replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return undefined;
}

/**
 * Apply filters to updates
 */
function applyUpdatesFilters(
  updates: UpdateItem[],
  filters: {
    category?: string;
    technology?: string;
    year?: string;
    searchQuery?: string;
    includeBeta?: boolean;
    limit?: number;
  },
): UpdateItem[] {
  let filtered = [...updates];

  // Category filter
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(update => update.category === filters.category);
  }

  // Technology filter
  if (filters.technology) {
    const techLower = filters.technology.toLowerCase();
    filtered = filtered.filter(update =>
      (update.technology?.toLowerCase().includes(techLower)) ||
      update.title.toLowerCase().includes(techLower) ||
      update.description.toLowerCase().includes(techLower),
    );
  }

  // Year filter (for WWDC)
  if (filters.year) {
    filtered = filtered.filter(update => update.year === filters.year);
  }

  // Search query filter
  if (filters.searchQuery) {
    const queryLower = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(update =>
      update.title.toLowerCase().includes(queryLower) ||
      update.description.toLowerCase().includes(queryLower),
    );
  }

  // Beta filter
  if (!filters.includeBeta) {
    filtered = filtered.filter(update => !update.beta);
  }

  // Apply limit
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Format updates list
 */
function formatUpdatesList(updates: UpdateItem[]): string {
  if (updates.length === 0) {
    return 'No documentation updates found matching the specified criteria.';
  }

  let content = '# Apple Developer Documentation Updates\n\n';

  // Group by category
  const grouped = updates.reduce((acc, update) => {
    const category = update.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(update);
    return acc;
  }, {} as Record<string, UpdateItem[]>);

  // Format each category
  const categoryTitles: Record<string, string> = {
    'wwdc': 'WWDC',
    'technology': 'Technology Updates',
    'release-notes': 'Release Notes',
    'other': 'Other Updates',
  };

  Object.entries(grouped).forEach(([category, items]) => {
    content += `## ${categoryTitles[category] ?? category}\n\n`;

    items.forEach(item => {
      // Build title with badges
      let titleLine = `### [${item.title}](${item.url})`;

      const badges = [];
      if (item.beta) {
        badges.push('Beta');
      }
      if (item.images?.some(img => img.identifier === 'new.svg')) {
        badges.push('New');
      }

      if (badges.length > 0) {
        titleLine += ` *${badges.join(' | ')}*`;
      }

      content += titleLine + '\n';

      // Add description
      if (item.description) {
        content += `${item.description}\n`;
      }

      // Add metadata
      const metadata = [];
      if (item.technology && item.category !== 'technology') {
        metadata.push(`Technology: ${item.technology}`);
      }
      if (item.year && item.category === 'wwdc') {
        metadata.push(`Year: ${item.year}`);
      }

      if (metadata.length > 0) {
        content += `*${metadata.join(' | ')}*\n`;
      }

      content += '\n';
    });
  });

  content += '\n---\n\n[View all updates on Apple Developer](https://developer.apple.com/documentation/updates)';

  return content;
}

/**
 * Update item interface
 */
interface UpdateItem {
  title: string;
  url: string;
  description: string;
  category: UpdateCategory;
  type: string;
  identifier: string;
  technology?: string;
  year?: string;
  beta?: boolean;
  images?: Array<{ type: string; identifier: string }>;
}

type UpdateCategory = 'wwdc' | 'technology' | 'release-notes' | 'other';