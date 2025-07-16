import * as cheerio from 'cheerio';
import { searchCache, generateUrlCacheKey } from '../utils/cache.js';

/**
 * Interface for Apple Doc Search Results
 */
export interface AppleDocSearchResult {
  title: string;
  url: string;
  description: string;
  type: string;
  platform?: string;
  isBeta?: boolean;
  isDeprecated?: boolean;
}

/**
 * Parse HTML search results from Apple Developer Documentation
 * 
 * Note: Apple Developer search pages use DOM structure for results,
 * not JavaScript objects. Results are in <li class="search-result"> elements
 * within a <ul class="search-results"> container.
 *
 * @param html HTML content from the search results page
 * @param query Original search query
 * @param searchUrl URL of the search
 * @returns Formatted search results or error response
 */
export function parseSearchResults(html: string, query: string, searchUrl: string) {
  try {
    // Generate cache key for this search
    const cacheKey = generateUrlCacheKey(searchUrl, { query });

    // Try to get from cache first (search results change less frequently)
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult) {
      console.error(`Search cache hit for: ${query}`);
      return cachedResult;
    }

    const $ = cheerio.load(html);
    const results: AppleDocSearchResult[] = [];

    // Find all search result items
    $('.search-result').each((_, element) => {
      const resultItem = $(element);

      // Extract type (documentation, video, etc.)
      const resultType = resultItem.hasClass('documentation') ? 'documentation' :
        resultItem.hasClass('video') ? 'video' :
          resultItem.hasClass('sample') ? 'sample' :
            resultItem.hasClass('general') ? 'general' : 'other';

      // Extract title
      const titleElement = resultItem.find('.result-title');
      const title = titleElement.text().trim();

      // Extract URL
      const urlElement = titleElement.find('a');
      let url = urlElement.attr('href') || '';
      if (url && url.startsWith('/')) {
        url = `https://developer.apple.com${url}`;
      }

      // Extract description
      const description = resultItem.find('.result-description').text().trim();

      // Extract beta/deprecated status
      const isBeta = description.toLowerCase().includes('beta') ||
                     title.toLowerCase().includes('beta') ||
                     resultItem.find('.beta-badge, .badge-beta').length > 0;

      const isDeprecated = description.toLowerCase().includes('deprecated') ||
                          title.toLowerCase().includes('deprecated') ||
                          resultItem.find('.deprecated-badge').length > 0;

      // Extract meaningful platform and source information
      let platform = '';

      // Check for platform badges/tags in various locations
      const platformElement = resultItem.find('.platform, .result-platform, .badge, .tag');
      if (platformElement.length > 0) {
        const platformText = platformElement.text().trim();
        // Only include meaningful platform info (iOS, macOS, watchOS, etc.)
        const meaningfulPlatforms = ['iOS', 'macOS', 'watchOS', 'tvOS', 'visionOS', 'iPadOS'];
        if (meaningfulPlatforms.some(p => platformText.includes(p))) {
          platform = platformText;
        }
      }

      // Extract content source/type from URL if no meaningful platform found
      if (!platform && url) {
        if (url.includes('/videos/play/wwdc')) {
          const year = url.match(/wwdc(\d{4})/)?.[1];
          platform = year ? `WWDC ${year}` : 'WWDC';
        } else if (url.includes('/news/')) {
          platform = 'News';
        } else if (url.includes('/support/')) {
          platform = 'Support';
        } else if (url.includes('/documentation/')) {
          // For API documentation, extract framework from URL if possible
          const frameworkMatch = url.match(/\/documentation\/([^\/]+)/);
          if (frameworkMatch && frameworkMatch[1] !== 'technologies') {
            platform = frameworkMatch[1].charAt(0).toUpperCase() + frameworkMatch[1].slice(1);
          }
        }
      }

      if (title && url) {
        results.push({
          title,
          url,
          description,
          type: resultType,
          platform: platform || undefined,
          isBeta,
          isDeprecated,
        });
      }
    });

    // If no results were found
    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No results found for "${query}". You can view the search page directly at: ${searchUrl}`,
          },
        ],
      };
    }

    // Format results for display
    const formattedResults = results.map(result => {
      const metadata = [];

      // Add status badges
      if (result.isBeta) {
        metadata.push('Beta');
      }
      if (result.isDeprecated) {
        metadata.push('Deprecated');
      }

      // Add content type (cleaner naming)
      const contentTypeMap: Record<string, string> = {
        'documentation': 'Documentation',
        'video': 'Video',
        'sample': 'Sample Code',
        'general': 'Resource',
        'other': 'Reference',
      };

      const contentType = contentTypeMap[result.type] || result.type;
      metadata.push(contentType);

      // Add platform info if available and meaningful
      if (result.platform && result.platform !== 'DOCUMENTATION' && result.platform.toLowerCase() !== 'documentation') {
        metadata.push(result.platform);
      }

      const metadataText = metadata.length > 0 ? `\n*${metadata.join(' | ')}*` : '';
      return `## [${result.title}](${result.url})\n${result.description}${metadataText}\n`;
    }).join('\n');

    const result = {
      content: [
        {
          type: 'text' as const,
          text: `# Search Results for "${query}"\n\n${formattedResults}\n\nView all results: ${searchUrl}`,
        },
      ],
    };

    // Cache the search results
    searchCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error parsing search results:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error parsing search results for "${query}". You can view the search page directly at: ${searchUrl}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Filter search results by content type
 *
 * @param results The search results to filter
 * @param type The type to filter by
 * @returns Filtered results
 */
export function filterResultsByType(results: AppleDocSearchResult[], type: string): AppleDocSearchResult[] {
  if (type === 'all') {
    return results;
  }

  return results.filter(result => {
    if (type === 'api' && result.type === 'documentation') {
      return true;
    }
    if (type === 'guide' && result.type === 'documentation') {
      return true;
    }
    if (type === 'sample' && result.type === 'sample') {
      return true;
    }
    if (type === 'video' && result.type === 'video') {
      return true;
    }
    return false;
  });
}