/**
 * Search result parsing utilities
 */


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
 * A result as Apple's search API streams it
 */
export interface ApiSearchResult {
  value?: {
    metadata?: {
      title?: string;
      permalink?: string;
      kind?: string;
      description?: string;
      hierarchy?: string;
    };
  };
}

/**
 * Result types by the API's `kind`; every other kind (a symbol, an overview) is API reference
 */
const KIND_TYPES: Record<string, string> = {
  article: 'documentation-article',
  tutorial: 'documentation-tutorial',
  sampleCode: 'sample-code',
};

/**
 * Parse a single search result
 */
export function parseSearchResult(result: ApiSearchResult, filterType: string): SearchResult | null {
  const { title, permalink, kind, description, hierarchy } = result.value?.metadata ?? {};
  const type = KIND_TYPES[kind ?? ''] ?? 'documentation';

  if (!title || !permalink || !isResultTypeSupported(type, filterType) || !isUrlSupported(permalink)) {
    return null;
  }

  return {
    title,
    url: permalink,
    type,
    description: description ?? '',
    framework: hierarchy?.split(' > ')[0],
  };
}
