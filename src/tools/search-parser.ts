import type { ApiSearchResult, SearchResult } from './search-result-parser.js';
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

  // Check if query might be video-related
  const videoSuggestion = getVideoSuggestion(query);
  if (videoSuggestion) {
    content += videoSuggestion;
  }

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
  content += '- Try searching for framework names (e.g., "SwiftUI", "UIKit")\n';

  // Add video-specific suggestion if applicable
  const videoSuggestion = getVideoSuggestion(query);
  if (videoSuggestion) {
    content += '- For WWDC videos, use the dedicated WWDC tools\n';
  }

  content += `\n[View search on Apple Developer](${searchUrl})`;
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
 * Check if query might be video-related and provide WWDC tool suggestions
 */
function getVideoSuggestion(query: string): string | null {
  const videoKeywords = [
    'video', 'wwdc', 'session', 'presentation', 'talk', 'keynote',
    'demo', 'tutorial', 'walkthrough', 'overview', 'introduction',
    'deep dive', 'best practices', 'tips', 'tricks',
  ];

  const queryLower = query.toLowerCase();
  const hasVideoKeyword = videoKeywords.some(keyword => queryLower.includes(keyword));

  // Also check for year patterns (e.g., "2024", "2025", "wwdc24")
  const hasYearPattern = /\b(20[2-9][0-9]|wwdc[2-9][0-9])\b/i.test(query);

  if (hasVideoKeyword || hasYearPattern) {
    return `## 💡 Looking for WWDC Videos?

This search covers documentation and samples, but not WWDC videos. For WWDC content, try these tools:

- **\`list_wwdc_videos\`** - Browse WWDC videos by year, topic, or code availability
- **\`search_wwdc_content\`** - Search through video transcripts and code examples
- **\`browse_wwdc_topics\`** - Explore videos organized by topic categories

---

`;
  }

  return null;
}

/**
 * Replays the JSON lines Apple's search API streams, as its search page does: each `search` event takes `removeLast`
 * characters off the results document, then appends `append`
 */
export function parseSearchResults(
  jsonl: string,
  query: string,
  searchUrl: string,
  filterType: string = 'all',
): { content: Array<{ type: string; text: string }> } {
  try {
    let document = '';
    for (const line of jsonl.split('\n')) {
      if (!line.trim()) {
        continue;
      }
      const event = JSON.parse(line) as { kind?: string; diff?: { append?: string; removeLast?: number } };
      if (event.kind === 'search') {
        const { append = '', removeLast = 0 } = event.diff ?? {};
        document = document.slice(0, Math.max(0, document.length - removeLast)) + append;
      }
    }
    const apiResults: ApiSearchResult[] = document ? JSON.parse(document).results : [];
    const results = apiResults
      .map(result => parseSearchResult(result, filterType))
      .filter((result): result is SearchResult => result !== null)
      .slice(0, API_LIMITS.MAX_SEARCH_RESULTS);

    return {
      content: [{
        type: 'text',
        text: formatSearchResults(results, query, filterType, searchUrl),
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
