import * as cheerio from 'cheerio';
import type { SearchResult } from './search-result-parser.js';
import { parseSearchResult } from './search-result-parser.js';
import { API_LIMITS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Formats search results for display
 */
export function formatSearchResults(
  results: SearchResult[],
  query: string,
  filterType: string,
  searchUrl: string,
): string {
  let content = '';

  // Add header
  content += '# Apple Documentation Search Results\n\n';
  content += `**Query:** "${query}"\n`;
  content += `**Filter:** ${filterType}\n`;
  content += `**Results found:** ${results.length}\n\n`;

  if (results.length === 0) {
    content += formatNoResultsMessage(query, filterType, searchUrl);
    return content;
  }

  // Group results by type
  const groupedResults = groupResultsByType(results);

  // Format each group
  Object.entries(groupedResults).forEach(([type, typeResults]) => {
    content += formatResultGroup(type, typeResults);
  });

  // Add footer
  content += formatSearchFooter(searchUrl);

  return content;
}

/**
 * Format no results message
 */
function formatNoResultsMessage(query: string, filterType: string, searchUrl: string): string {
  let content = '## No Results Found\n\n';
  content += `No ${filterType === 'all' ? '' : filterType + ' '}results found for "${query}".\n\n`;
  content += '### Suggestions:\n';
  content += '- Try using different keywords\n';
  content += '- Check spelling\n';
  content += '- Use more general terms\n';
  content += '- Try searching for framework names (e.g., "SwiftUI", "UIKit")\n\n';
  content += `[View search on Apple Developer](${searchUrl})`;
  return content;
}

/**
 * Group results by type
 */
function groupResultsByType(results: SearchResult[]): Record<string, SearchResult[]> {
  const groups: Record<string, SearchResult[]> = {};

  results.forEach(result => {
    const displayType = getDisplayType(result.type);
    if (!groups[displayType]) {
      groups[displayType] = [];
    }
    groups[displayType].push(result);
  });

  return groups;
}

/**
 * Get display type for result
 */
function getDisplayType(type: string): string {
  const typeDisplayNames: Record<string, string> = {
    'documentation': '📚 API Documentation',
    'documentation-article': '📄 Articles',
    'documentation-tutorial': '📖 Tutorials',
    'sample-code': '💻 Sample Code',
    'guide': '📋 Guides',
  };

  return typeDisplayNames[type] || '📝 Other';
}

/**
 * Format a group of results
 */
function formatResultGroup(type: string, results: SearchResult[]): string {
  let content = `## ${type}\n\n`;

  results.forEach((result, index) => {
    content += formatSingleResult(result, index + 1);
  });

  return content;
}

/**
 * Format a single search result
 */
function formatSingleResult(result: SearchResult, index: number): string {
  let content = `### ${index}. ${result.title}`;

  // Add badges
  const badges = [];
  if (result.beta) {
    badges.push('🧪 Beta');
  }
  if (badges.length > 0) {
    content += ` ${badges.join(' ')}`;
  }

  content += '\n\n';

  // Add metadata
  if (result.framework) {
    content += `**Framework:** ${result.framework}\n`;
  }
  content += `**Type:** ${result.type.replace(/-/g, ' ')}\n`;

  // Add description
  if (result.description) {
    content += `**Description:** ${result.description}\n`;
  }

  // Add URL
  content += `**URL:** ${result.url}\n\n`;

  return content;
}

/**
 * Format search footer
 */
function formatSearchFooter(searchUrl: string): string {
  return `---\n\n[View all results on Apple Developer](${searchUrl})`;
}

/**
 * Parse search results with reduced complexity
 */
export function parseSearchResults(
  html: string,
  query: string,
  searchUrl: string,
  filterType: string = 'all',
): { content: Array<{ type: string; text: string }> } {
  try {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Parse each search result (with limit)
    $('.search-result').each((_, element) => {
      if (results.length >= API_LIMITS.MAX_SEARCH_RESULTS) {
        return false; // Stop parsing when limit reached
      }
      const result = parseSearchResult($(element), filterType);
      if (result) {
        results.push(result);
      }
      return true; // Continue parsing
    });

    // Format results
    const formattedContent = formatSearchResults(results, query, filterType, searchUrl);

    return {
      content: [{
        type: 'text',
        text: formattedContent,
      }],
    };
  } catch (error) {
    logger.error('Error parsing search results:', error);
    return {
      content: [{
        type: 'text',
        text: `Error parsing search results: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
    };
  }
}