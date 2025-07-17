import { APPLE_URLS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { sampleCodeCache, generateUrlCacheKey } from '../utils/cache.js';

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
  try {
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
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
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
  } catch (error) {
    throw error;
  }
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

  return sampleCodes;
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
      const framework = node.title;
      if (node.children) {
        processSampleCodeNodes(node.children, sampleCodes, frameworkMap, featuredIds, framework, depth + 1);
      }
    } else if (node.type === 'sampleCode' && node.path) {
      // Convert path to doc URL format for matching with framework map
      const docUrl = pathToDocUrl(node.path);
      const framework = frameworkMap.get(docUrl) || currentFramework;

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
    // Framework filter
    if (filters.framework) {
      const frameworkLower = filters.framework.toLowerCase();
      const codeFramework = (code.framework || '').toLowerCase();
      if (!codeFramework.includes(frameworkLower)) {
        return false;
      }
    }

    // Beta filter
    if (filters.beta === 'exclude' && code.beta) {
      return false;
    } else if (filters.beta === 'only' && !code.beta) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const titleMatch = code.title.toLowerCase().includes(query);
      const frameworkMatch = (code.framework || '').toLowerCase().includes(query);
      const descriptionMatch = (code.description || '').toLowerCase().includes(query);

      if (!titleMatch && !frameworkMatch && !descriptionMatch) {
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
    filterParts.push(`Framework: ${options.framework}`);
  }
  if (options.beta && options.beta !== 'include') {
    filterParts.push(`Beta: ${options.beta}`);
  }
  if (options.searchQuery) {
    filterParts.push(`Search: "${options.searchQuery}"`);
  }

  if (filterParts.length > 0) {
    lines.push(`## Filters Applied`);
    lines.push(filterParts.join(', '));
    lines.push('');
  }

  // Results summary
  lines.push(`Found ${options.totalFound} sample code projects, showing ${options.showing}`);
  lines.push('');

  if (sampleCodes.length === 0) {
    lines.push('No sample code projects found matching your criteria.');
    return lines.join('\n');
  }

  // Group by framework
  const byFramework = new Map<string, ParsedSampleCode[]>();
  const noFramework: ParsedSampleCode[] = [];

  for (const code of sampleCodes) {
    if (code.framework) {
      if (!byFramework.has(code.framework)) {
        byFramework.set(code.framework, []);
      }
      byFramework.get(code.framework)!.push(code);
    } else {
      noFramework.push(code);
    }
  }

  // Sort frameworks alphabetically
  const sortedFrameworks = Array.from(byFramework.keys()).sort();

  // Display featured samples first if any
  const featuredSamples = sampleCodes.filter((c) => c.featured);
  if (featuredSamples.length > 0) {
    lines.push('## ⭐ Featured Samples');
    lines.push('');
    for (const code of featuredSamples) {
      lines.push(formatSampleCodeItem(code));
    }
    lines.push('');
  }

  // Display by framework
  for (const framework of sortedFrameworks) {
    const codes = byFramework.get(framework)!;
    lines.push(`## ${framework}`);
    lines.push('');
    for (const code of codes) {
      if (!code.featured) {
        // Skip featured items as they're shown above
        lines.push(formatSampleCodeItem(code));
      }
    }
    lines.push('');
  }

  // Display samples without framework
  if (noFramework.length > 0) {
    lines.push('## Other');
    lines.push('');
    for (const code of noFramework) {
      if (!code.featured) {
        lines.push(formatSampleCodeItem(code));
      }
    }
  }

  return lines.join('\n').trim();
}

/**
 * Formats a single sample code item
 */
function formatSampleCodeItem(code: ParsedSampleCode): string {
  const badges: string[] = [];
  if (code.beta) badges.push('🧪 Beta');
  if (code.featured) badges.push('⭐ Featured');

  const badgeStr = badges.length > 0 ? ` ${badges.join(' ')}` : '';
  const indent = '  '.repeat(Math.max(0, code.depth - 1));

  let line = `${indent}### [${code.title}](${code.url})${badgeStr}`;
  if (code.description) {
    line += `\n${indent}${code.description}`;
  }

  return line;
}