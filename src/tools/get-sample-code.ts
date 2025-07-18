import { APPLE_URLS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { sampleCodeCache, generateUrlCacheKey } from '../utils/cache.js';
import { normalizeFrameworkName } from '../utils/framework-mapper.js';

// Types for sample code responses
interface SampleCodeMetadata {
  role: string;
  title: string;
  images?: Array<{
    type: string;
    identifier: string;
  }>;
  color?: {
    standardColorIdentifier: string;
  };
  customMetadata?: {
    'show-on-this-page'?: string;
  };
}

interface SampleCodeSection {
  anchor: string;
  title: string;
  identifiers: string[];
}

interface SampleCodeContent {
  metadata: SampleCodeMetadata;
  abstract?: Array<{
    type: string;
    text: string;
  }>;
  primaryContentSections?: Array<{
    kind: string;
    content: Array<{
      type: string;
      text?: string;
      anchor?: string;
      level?: number;
      inlineContent?: Array<{
        type: string;
        text: string;
      }>;
      items?: string[];
      style?: string;
    }>;
  }>;
  topicSections?: SampleCodeSection[];
}

interface SampleCodeIndexNode {
  path?: string;
  title: string;
  type: string;
  children?: SampleCodeIndexNode[];
  external?: boolean;
  beta?: boolean;
}

interface SampleCodeIndex {
  interfaceLanguages: {
    [key: string]: SampleCodeIndexNode[];
  };
}

interface ParsedSampleCode {
  id: string;
  title: string;
  framework?: string;
  description?: string;
  beta: boolean;
  featured?: boolean;
  url: string;
  path: string;
  depth: number;
}

interface SampleCodeFilters {
  framework?: string;
  beta?: 'include' | 'exclude' | 'only';
  searchQuery?: string;
}


/**
 * Handles the get_sample_code tool request
 */
export async function handleGetSampleCode(
  framework?: string,
  beta: 'include' | 'exclude' | 'only' = 'include',
  searchQuery?: string,
  limit: number = 50,
): Promise<string> {
  // Generate cache key
  const cacheKey = generateUrlCacheKey('sample-code', {
    framework,
    beta,
    searchQuery,
    limit,
  });

  // Try to get from cache first
  const cachedResult = sampleCodeCache.get<string>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Fetch both JSON files
  const [contentResponse, indexResponse] = await Promise.all([
    httpClient.get(APPLE_URLS.SAMPLE_CODE_JSON),
    httpClient.get(APPLE_URLS.SAMPLE_CODE_INDEX_JSON),
  ]);

  if (!contentResponse.ok) {
    throw new Error(`Failed to fetch sample code content: ${contentResponse.statusText}`);
  }
  if (!indexResponse.ok) {
    throw new Error(`Failed to fetch sample code index: ${indexResponse.statusText}`);
  }

  const contentData = await contentResponse.json() as SampleCodeContent;
  const indexData = await indexResponse.json() as SampleCodeIndex;


  // Parse the sample codes
  const sampleCodes = parseSampleCodes(contentData, indexData);

  // Apply filters
  const filters: SampleCodeFilters = {
    framework,
    beta,
    searchQuery,
  };
  const filteredSampleCodes = applySampleCodeFilters(sampleCodes, filters);

  // Sort by relevance (featured first, then alphabetically)
  const sortedSampleCodes = filteredSampleCodes.sort((a, b) => {
    if (a.featured && !b.featured) {
      return -1;
    }
    if (!a.featured && b.featured) {
      return 1;
    }
    return a.title.localeCompare(b.title);
  });

  // Apply limit
  const limitedSampleCodes = sortedSampleCodes.slice(0, limit);

  // Format the result
  const result = formatSampleCodeResult(limitedSampleCodes, {
    framework,
    beta,
    searchQuery,
    totalFound: filteredSampleCodes.length,
    showing: limitedSampleCodes.length,
  });

  // Cache the result
  sampleCodeCache.set(cacheKey, result);
  return result;
}

/**
 * Parses sample codes from the content and index data
 */
function parseSampleCodes(content: SampleCodeContent, index: SampleCodeIndex): ParsedSampleCode[] {
  const sampleCodes: ParsedSampleCode[] = [];
  const featuredIds = new Set<string>();

  // Extract featured sample codes from primary content sections
  if (content.primaryContentSections) {
    for (const section of content.primaryContentSections) {
      if (section.kind === 'content' && section.content) {
        for (const contentItem of section.content) {
          if (contentItem.type === 'links' && contentItem.items) {
            for (const item of contentItem.items) {
              featuredIds.add(item);
            }
          }
        }
      }
    }
  }

  // Extract framework mapping from topic sections
  const frameworkMap = new Map<string, string>();
  if (content.topicSections) {
    for (const section of content.topicSections) {
      for (const identifier of section.identifiers) {
        frameworkMap.set(identifier, section.title);
      }
    }
  }

  // Process index data
  for (const [, nodes] of Object.entries(index.interfaceLanguages)) {
    processSampleCodeNodes(nodes, sampleCodes, frameworkMap, featuredIds, '', 0);
  }

  // Deduplicate sample codes based on path
  return deduplicateSampleCodes(sampleCodes);
}

/**
 * Deduplicates sample codes based on path
 */
function deduplicateSampleCodes(sampleCodes: ParsedSampleCode[]): ParsedSampleCode[] {
  const uniqueCodes = new Map<string, ParsedSampleCode>();

  for (const code of sampleCodes) {
    const existing = uniqueCodes.get(code.path);
    if (!existing) {
      uniqueCodes.set(code.path, code);
    } else {
      // Merge properties, preferring non-empty values
      uniqueCodes.set(code.path, {
        ...existing,
        framework: code.framework || existing.framework,
        featured: code.featured || existing.featured,
        beta: code.beta || existing.beta,
        depth: Math.min(code.depth, existing.depth),
      });
    }
  }

  return Array.from(uniqueCodes.values());
}

/**
 * Recursively processes sample code nodes
 */
function processSampleCodeNodes(
  nodes: SampleCodeIndexNode[],
  sampleCodes: ParsedSampleCode[],
  frameworkMap: Map<string, string>,
  featuredIds: Set<string>,
  currentFramework: string,
  depth: number,
): void {
  for (const node of nodes) {
    if (node.type === 'groupMarker') {
      // This is a framework/category marker
      const framework = normalizeFrameworkName(node.title);
      if (node.children) {
        processSampleCodeNodes(node.children, sampleCodes, frameworkMap, featuredIds, framework, depth + 1);
      }
    } else if (node.type === 'sampleCode' && node.path) {
      // Try to extract framework from path first
      const frameworkFromPath = extractFrameworkFromPath(node.path);

      // Convert path to doc URL format for matching with framework map
      const docUrl = pathToDocUrl(node.path);
      const frameworkFromMap = frameworkMap.get(docUrl);

      // Priority: path > map > groupMarker
      const framework = normalizeFrameworkName(
        frameworkFromPath || frameworkFromMap || currentFramework,
      );

      sampleCodes.push({
        id: node.path,
        title: node.title,
        framework: framework || undefined,
        description: undefined, // Could be extracted from the content if needed
        beta: node.beta || false,
        featured: featuredIds.has(docUrl),
        url: `https://developer.apple.com${node.path}`,
        path: node.path,
        depth,
      });
    } else if (node.children) {
      // Process children with the same framework
      processSampleCodeNodes(node.children, sampleCodes, frameworkMap, featuredIds, currentFramework, depth + 1);
    }
  }
}

/**
 * Extract framework name from URL path
 */
function extractFrameworkFromPath(path: string): string | null {
  // Match pattern like /documentation/framework/...
  const match = path.match(/^\/documentation\/([^\/]+)\//);
  if (match) {
    const framework = match[1];
    // Don't return generic paths like 'samplecode'
    if (framework === 'samplecode' || framework === 'documentation') {
      return null;
    }
    return normalizeFrameworkName(framework);
  }
  return null;
}

/**
 * Converts a path to doc URL format
 */
function pathToDocUrl(path: string): string {
  // Convert /documentation/framework/sample-name to doc://com.apple.documentation/documentation/framework/sample-name
  return `doc://com.apple.documentation${path}`;
}

/**
 * Applies filters to sample codes
 */
function applySampleCodeFilters(sampleCodes: ParsedSampleCode[], filters: SampleCodeFilters): ParsedSampleCode[] {
  return sampleCodes.filter((code) => {
    // Framework filter - normalize both for comparison
    if (filters.framework) {
      const normalizedFilterFramework = normalizeFrameworkName(filters.framework);
      const normalizedCodeFramework = normalizeFrameworkName(code.framework || '');

      // Check for exact match or inclusion
      const frameworkLower = normalizedFilterFramework.toLowerCase();
      const codeFrameworkLower = normalizedCodeFramework.toLowerCase();

      // Also check if the filter term appears in the title or path
      const titleLower = code.title.toLowerCase();
      const pathLower = code.path.toLowerCase();

      const frameworkMatch = frameworkLower === codeFrameworkLower ||
                           codeFrameworkLower.includes(frameworkLower) ||
                           titleLower.includes(frameworkLower) ||
                           pathLower.includes(frameworkLower);

      if (!frameworkMatch) {
        return false;
      }
    }

    // Beta filter
    if (filters.beta === 'exclude' && code.beta) {
      return false;
    } else if (filters.beta === 'only' && !code.beta) {
      return false;
    }

    // Search query filter - enhanced matching
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();

      // Score-based matching for better relevance
      let matchScore = 0;

      // Title match (highest weight)
      const titleLower = code.title.toLowerCase();
      if (titleLower === query) {
        matchScore += 10; // Exact match
      } else if (titleLower.startsWith(query)) {
        matchScore += 5; // Starts with query
      } else if (titleLower.includes(query)) {
        matchScore += 3; // Contains query
      }

      // Framework match
      const frameworkLower = (code.framework || '').toLowerCase();
      if (frameworkLower.includes(query)) {
        matchScore += 2;
      }

      // Path match (check if query is in the path)
      const pathLower = code.path.toLowerCase();
      if (pathLower.includes(query)) {
        matchScore += 1;
      }

      // Description match (if available)
      const descriptionLower = (code.description || '').toLowerCase();
      if (descriptionLower.includes(query)) {
        matchScore += 1;
      }

      // Only include if there's at least one match
      if (matchScore === 0) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Formats the sample code result
 */
function formatSampleCodeResult(
  sampleCodes: ParsedSampleCode[],
  options: {
    framework?: string;
    beta?: string;
    searchQuery?: string;
    totalFound: number;
    showing: number;
  },
): string {
  const lines: string[] = [];

  // Header
  lines.push('# Apple Sample Code Library');
  lines.push('');

  // Filter summary
  const filterParts: string[] = [];
  if (options.framework) {
    filterParts.push(`Framework: ${normalizeFrameworkName(options.framework)}`);
  }
  if (options.beta && options.beta !== 'include') {
    filterParts.push(`Beta: ${options.beta}`);
  }
  if (options.searchQuery) {
    filterParts.push(`Search: "${options.searchQuery}"`);
  }

  if (filterParts.length > 0) {
    lines.push('## Filters Applied');
    lines.push(filterParts.join(', '));
    lines.push('');
  }

  // Results summary
  lines.push(`Found ${options.totalFound} sample code projects${options.showing < options.totalFound ? `, showing ${options.showing}` : ''}`);
  lines.push('');

  if (sampleCodes.length === 0) {
    lines.push('No sample code projects found matching your criteria.');
    return lines.join('\n');
  }

  // Group by framework/category with normalization
  const byCategory = new Map<string, ParsedSampleCode[]>();
  const noCategory: ParsedSampleCode[] = [];

  for (const code of sampleCodes) {
    const category = code.framework || '';
    if (category) {
      // Group WWDC samples together
      const normalizedCategory = category.match(/^WWDC\d+$/i) ? category.toUpperCase() : category;
      if (!byCategory.has(normalizedCategory)) {
        byCategory.set(normalizedCategory, []);
      }
      byCategory.get(normalizedCategory)!.push(code);
    } else {
      noCategory.push(code);
    }
  }

  // Sort categories with WWDC years first (newest to oldest), then alphabetically
  const sortedCategories = Array.from(byCategory.keys()).sort((a, b) => {
    const aIsWWDC = a.match(/^WWDC(\d+)$/);
    const bIsWWDC = b.match(/^WWDC(\d+)$/);

    if (aIsWWDC && bIsWWDC) {
      // Sort WWDC by year descending
      return parseInt(bIsWWDC[1]) - parseInt(aIsWWDC[1]);
    } else if (aIsWWDC) {
      return -1; // WWDC comes first
    } else if (bIsWWDC) {
      return 1;
    }

    return a.localeCompare(b); // Alphabetical for non-WWDC
  });

  // Display featured samples first if any
  const featuredSamples = sampleCodes.filter((c) => c.featured);
  if (featuredSamples.length > 0) {
    lines.push('## ⭐ Featured Samples');
    lines.push('');
    for (const code of featuredSamples) {
      lines.push(formatSampleCodeItem(code, false)); // Don't show framework in featured section
    }
    lines.push('');
  }

  // Display by category
  for (const category of sortedCategories) {
    const codes = byCategory.get(category)!;
    const nonFeaturedCodes = codes.filter(c => !c.featured);

    if (nonFeaturedCodes.length > 0) {
      lines.push(`## ${category}`);
      lines.push('');
      for (const code of nonFeaturedCodes) {
        lines.push(formatSampleCodeItem(code, false)); // Framework already shown in section header
      }
      lines.push('');
    }
  }

  // Display samples without category
  if (noCategory.length > 0) {
    const nonFeaturedOther = noCategory.filter(c => !c.featured);
    if (nonFeaturedOther.length > 0) {
      lines.push('## Other');
      lines.push('');
      for (const code of nonFeaturedOther) {
        lines.push(formatSampleCodeItem(code, false));
      }
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Formats a single sample code item
 */
function formatSampleCodeItem(code: ParsedSampleCode, showFramework: boolean = true): string {
  const badges: string[] = [];
  if (code.beta) {
    badges.push('🧪 Beta');
  }

  // Don't duplicate the featured badge as it's already in the section header
  const badgeStr = badges.length > 0 ? ` ${badges.join(' ')}` : '';

  // Framework info (only if requested and not in a framework-specific section)
  const frameworkStr = showFramework && code.framework ? ` (${code.framework})` : '';

  let line = `### [${code.title}](${code.url})${badgeStr}${frameworkStr}`;
  if (code.description) {
    line += `\n${code.description}`;
  }

  return line;
}