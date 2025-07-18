/**
 * Search result parsing utilities
 */

import type * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  type: string;
  description: string;
  framework?: string;
  beta?: boolean;
}

/**
 * Type mapping for search filters
 */
export const typeMapping: Record<string, string[]> = {
  all: ['documentation', 'documentation-article', 'documentation-tutorial', 'sample-code'],
  documentation: ['documentation', 'documentation-article'],
  sample: ['sample-code'],
};

/**
 * Unsupported document types
 */
const UNSUPPORTED_TYPES = ['general', 'video', 'forums', 'news'];

/**
 * Extract search result type from element classes
 */
export function extractResultType(element: cheerio.Cheerio<any>): string {
  const classes = element.attr('class')?.split(' ') ?? [];

  for (const className of classes) {
    if (className !== 'search-result' && className.trim()) {
      return className;
    }
  }

  return 'other';
}

/**
 * Check if result type is supported
 */
export function isResultTypeSupported(resultType: string, filterType: string): boolean {
  // Apply type filter
  const allowedTypes = typeMapping[filterType] ?? typeMapping['all'];
  if (!allowedTypes.includes(resultType)) {
    return false;
  }

  // Exclude known unsupported types
  if (UNSUPPORTED_TYPES.includes(resultType)) {
    return false;
  }

  return true;
}

/**
 * Extract result title and URL
 */
export function extractTitleAndUrl(resultItem: cheerio.Cheerio<any>): { title: string; url: string } {
  const titleElement = resultItem.find('.result-title');
  const title = titleElement.text().trim();

  const urlElement = titleElement.find('a');
  let url = urlElement.attr('href') ?? '';

  if (url && url.startsWith('/')) {
    url = `https://developer.apple.com${url}`;
  }

  return { title, url };
}

/**
 * Check if URL is supported
 */
export function isUrlSupported(url: string): boolean {
  if (!url) {
    return false;
  }

  // Skip non-documentation URLs
  if (!url.includes('/documentation/')) {
    return false;
  }

  // Skip download links and zip files
  if (url.includes('download.apple.com') || url.includes('.zip')) {
    return false;
  }

  // Skip human interface guidelines
  if (url.includes('/design/human-interface-guidelines/')) {
    return false;
  }

  return true;
}

/**
 * Extract result description
 */
export function extractDescription(resultItem: cheerio.Cheerio<any>): string {
  const descriptionElement = resultItem.find('.result-description');
  return descriptionElement.text().trim();
}

/**
 * Extract framework information
 */
export function extractFramework(resultItem: cheerio.Cheerio<any>, url: string): string | undefined {
  // Try to extract from link text
  const linkText = resultItem.find('.result-link').text().trim();
  const frameworkMatch = linkText.match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+[>›]/);

  if (frameworkMatch) {
    return frameworkMatch[1];
  }

  // Try to extract from URL
  const urlMatch = url.match(/\/documentation\/([^\/]+)/);
  if (urlMatch) {
    const framework = urlMatch[1];
    // Convert underscore to space and capitalize
    return framework.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return undefined;
}

/**
 * Extract beta status
 */
export function extractBetaStatus(resultItem: cheerio.Cheerio<any>): boolean {
  const titleText = resultItem.find('.result-title').text();
  const descriptionText = resultItem.find('.result-description').text();

  return titleText.includes('Beta') || descriptionText.includes('Beta');
}

/**
 * Parse a single search result
 */
export function parseSearchResult(
  element: cheerio.Cheerio<any>,
  filterType: string,
): SearchResult | null {
  const resultType = extractResultType(element);

  if (!isResultTypeSupported(resultType, filterType)) {
    return null;
  }

  const { title, url } = extractTitleAndUrl(element);

  if (!isUrlSupported(url)) {
    return null;
  }

  const description = extractDescription(element);
  const framework = extractFramework(element, url);
  const beta = extractBetaStatus(element);

  return {
    title,
    url,
    type: resultType,
    description,
    framework,
    beta,
  };
}