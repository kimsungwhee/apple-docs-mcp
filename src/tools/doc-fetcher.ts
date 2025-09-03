import { apiCache, generateEnhancedCacheKey } from '../utils/cache.js';
import { convertToJsonApiUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';
import type { AppleDocJSON } from '../types/apple-docs.js';
import type { ContentSection, ContentItem } from '../types/content-sections.js';
import { logger } from '../utils/logger.js';
import { PROCESSING_LIMITS } from '../utils/constants.js';
import {
  formatDocumentHeader,
  formatDocumentAbstract,
  formatPlatformAvailability,
  formatSeeAlsoSection,
  isSpecificAPIDocument,
} from './doc-formatter.js';



/**
 * Format JSON documentation content with enhanced analysis
 */
function formatJsonDocumentation(
  jsonData: AppleDocJSON,
  originalUrl: string,
  options: EnhancedAnalysisOptions = {},
): { content: Array<{ type: string; text: string }> } {
  let content = '';

  // Add header with title and status
  content += formatDocumentHeader(jsonData);

  // Add abstract
  content += formatDocumentAbstract(jsonData);

  // Check if this is a specific API/symbol or an API collection
  if (isSpecificAPIDocument(jsonData)) {
    content += formatSpecificAPIContent(jsonData);
  } else {
    content += formatAPICollectionContent(jsonData);
  }

  // Add platform availability
  content += formatPlatformAvailability(jsonData);

  // Add See Also section
  content += formatSeeAlsoSection(jsonData);

  // Add enhanced analysis sections
  if (options.includeRelatedApis) {
    const relatedApis = extractRelatedApis(jsonData);
    if (relatedApis.length > 0) {
      content += formatRelatedApisSection(relatedApis);
    }
  }

  if (options.includeReferences) {
    const references = extractReferences(jsonData);
    if (references.length > 0) {
      content += formatReferencesSection(references);
    }
  }

  if (options.includeSimilarApis) {
    const similarApis = extractSimilarApis(jsonData);
    if (similarApis.length > 0) {
      content += formatSimilarApisSection(similarApis);
    }
  }

  if (options.includePlatformAnalysis) {
    const platformAnalysis = analyzePlatformCompatibility(jsonData);
    if (platformAnalysis) {
      content += formatPlatformAnalysisSection(platformAnalysis);
    }
  }

  // Add link to original documentation
  content += `---\n\n[View full documentation on Apple Developer](${originalUrl})`;

  return {
    content: [
      {
        type: 'text' as const,
        text: content,
      },
    ],
  };
}

/**
 * Format specific API content (methods, properties, etc.)
 */
function formatSpecificAPIContent(jsonData: AppleDocJSON): string {
  let content = '';

  if (jsonData.primaryContentSections) {
    jsonData.primaryContentSections.forEach((section) => {
      const typedSection = section as ContentSection;
      switch (typedSection.kind) {
        case 'declarations':
          content += '## Declaration\n\n';
          if (typedSection.declarations?.[0]?.tokens) {
            const declaration = typedSection.declarations[0].tokens
              .map((token) => token.text ?? '')
              .join('');
            content += `\`\`\`swift\n${declaration}\`\`\`\n\n`;
          }
          break;

        case 'parameters':
          content += '## Parameters\n\n';
          if (typedSection.parameters && Array.isArray(typedSection.parameters)) {
            typedSection.parameters.forEach((param) => {
              content += `**${param.name}**: `;
              if (param.content?.[0]?.inlineContent) {
                const paramDesc = param.content[0].inlineContent
                  .map((inline) => (inline as { text?: string })?.text ?? '')
                  .join('');
                content += `${paramDesc}\n\n`;
              }
            });
          }
          break;

        case 'content':
          if (typedSection.content && Array.isArray(typedSection.content)) {
            typedSection.content.forEach((item) => {
              const contentItem = item as ContentItem;
              if (contentItem.type === 'heading') {
                content += `## ${contentItem.text}\n\n`;
              } else if (contentItem.type === 'paragraph' && contentItem.inlineContent) {
                const paragraphText = contentItem.inlineContent
                  .map((inline: any) => {
                    if (inline.type === 'text') {
                      return inline.text ?? '';
                    } else if (inline.type === 'codeVoice') {
                      return `\`${(inline).code ?? ''}\``;
                    } else if (inline.type === 'reference' && (inline).identifier) {
                      const apiName = ((inline).identifier as string).split('/').pop() ?? (inline).identifier;
                      return `\`${apiName}\``;
                    }
                    return '';
                  })
                  .join('');
                if (paragraphText.trim()) {
                  content += `${paragraphText}\n\n`;
                }
              } else if (contentItem.type === 'codeListing' && (contentItem as any).code) {
                content += `\`\`\`${(contentItem as any).syntax ?? 'swift'}\n${(contentItem as any).code.join('\n')}\`\`\`\n\n`;
              }
            });
          }
          break;
      }
    });
  }

  return content;
}

/**
 * Format API collection content (overview + API lists)
 */
function formatAPICollectionContent(jsonData: AppleDocJSON): string {
  let content = '';

  // Add primary content sections (Overview)
  if (jsonData.primaryContentSections && Array.isArray(jsonData.primaryContentSections)) {
    content += '## Overview\n\n';
    jsonData.primaryContentSections.forEach((section) => {
      const typedSection = section as ContentSection;
      if (typedSection.kind === 'content' && typedSection.content) {
        typedSection.content.forEach((item: any) => {
          if (item.type === 'paragraph' && item.inlineContent) {
            const paragraphText = item.inlineContent
              .map((inline: any) => {
                if (inline.type === 'text') {
                  return inline.text ?? '';
                } else if (inline.type === 'reference' && inline.identifier) {
                  // Extract API name from identifier
                  const apiName = inline.identifier.split('/').pop() ?? inline.identifier;
                  return `\`${apiName}\``;
                }
                return '';
              })
              .join('');
            if (paragraphText.trim()) {
              content += `${paragraphText}\n\n`;
            }
          } else if (item.type === 'unorderedList' && item.items) {
            item.items.forEach((listItem: any) => {
              if (listItem.content?.[0]?.inlineContent) {
                const listText = listItem.content[0].inlineContent
                  .map((inline: any) => {
                    if (inline.type === 'text') {
                      return inline.text ?? '';
                    } else if (inline.type === 'reference' && inline.identifier) {
                      const apiName = inline.identifier.split('/').pop() ?? inline.identifier;
                      return `\`${apiName}\``;
                    }
                    return '';
                  })
                  .join('');
                if (listText.trim()) {
                  content += `- ${listText}\n`;
                }
              }
            });
            content += '\n';
          }
        });
      }
    });
  }

  // Add topic sections (API Collections) - this is the most important part
  if (jsonData.topicSections && Array.isArray(jsonData.topicSections)) {
    content += '## APIs and Functions\n\n';

    jsonData.topicSections.forEach((section) => {
      if (section.title && section.identifiers && Array.isArray(section.identifiers)) {
        content += `### ${section.title}\n\n`;

        section.identifiers.forEach((identifier: string) => {
          // Extract the API name from the identifier
          const apiName = identifier.split('/').pop() ?? identifier;
          // Create a documentation URL for the API
          const apiPath = identifier.replace('doc://com.apple.SwiftUI/documentation/', '');
          const apiUrl = `https://developer.apple.com/documentation/${apiPath}`;
          content += `- [\`${apiName}\`](${apiUrl})\n`;
        });
        content += '\n';
      }
    });
  }

  return content;
}

/**
 * Enhanced analysis options
 */
interface EnhancedAnalysisOptions {
  includeRelatedApis?: boolean;
  includeReferences?: boolean;
  includeSimilarApis?: boolean;
  includePlatformAnalysis?: boolean;
}

/**
 * Fetch JSON documentation from Apple Developer Documentation with optional enhanced analysis
 * @param url The URL of the documentation page
 * @param options Enhanced analysis options
 * @param maxDepth Maximum recursion depth (to prevent infinite loops)
 * @returns Formatted documentation content
 */
export async function fetchAppleDocJson(
  url: string,
  options: EnhancedAnalysisOptions | number = {},
  maxDepth: number = 2,
): Promise<any> {
  // Backward compatibility: if second param is number, treat as maxDepth
  if (typeof options === 'number') {
    maxDepth = options;
    options = {};
  }
  try {
    // Validate that this is an Apple Developer URL
    if (!url.includes('developer.apple.com')) {
      throw new Error('URL must be from developer.apple.com');
    }

    // Convert web URL to JSON API URL if needed
    const jsonApiUrl = url.includes('.json') ? url : convertToJsonApiUrl(url);

    if (!jsonApiUrl) {
      throw new Error('Invalid Apple Developer Documentation URL');
    }

    // Generate cache key including options
    const cacheKey = generateEnhancedCacheKey(jsonApiUrl, options as any);

    // Try to get from cache first
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
      logger.debug(`Cache hit for: ${jsonApiUrl}`);
      return cachedResult;
    }

    logger.info(`Fetching Apple doc JSON from: ${jsonApiUrl}`);

    // Fetch the documentation JSON using HTTP client
    const jsonData = await httpClient.getJson<AppleDocJSON>(jsonApiUrl);

    // If the JSON doesn't have primary content but has references to other docs,
    // fetch the first reference if we haven't exceeded max depth
    if (!jsonData.primaryContentSections &&
      jsonData.references &&
      Object.keys(jsonData.references).length > 0 &&
      maxDepth > 0) {

      // Find the main reference to follow (usually first in the list)
      const mainReferenceKey = Object.keys(jsonData.references)[0];
      const mainReference = jsonData.references[mainReferenceKey];

      if (mainReference?.url) {
        // Recursively fetch the referenced documentation
        // Remove leading /documentation/ if present to avoid duplication
        let refPath = mainReference.url;
        if (refPath.startsWith('/documentation/')) {
          refPath = refPath.substring('/documentation/'.length);
        } else if (refPath.startsWith('/')) {
          refPath = refPath.substring(1);
        }
        const refUrl = `https://developer.apple.com/tutorials/data/documentation/${refPath}.json`;
        return await fetchAppleDocJson(refUrl, options, maxDepth - 1);
      }
    }

    // Format the JSON documentation with enhanced analysis
    const result = formatJsonDocumentation(jsonData, url, options);

    // Cache the result
    apiCache.set(cacheKey, result);

    return result;
  } catch (error) {
    let errorMessage: string;

    // Handle AppError objects from http-client
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as any).message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    logger.error('Error fetching Apple doc JSON:', errorMessage);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Failed to get Apple doc content: ${errorMessage}\n\nPlease try accessing the documentation directly at: ${url}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Extract related APIs from JSON data
 */
function extractRelatedApis(jsonData: AppleDocJSON): Array<{title: string, url: string, relationship: string}> {
  const relatedApis: Array<{title: string, url: string, relationship: string}> = [];

  // From relationshipsSections
  if (jsonData.relationshipsSections) {
    for (const section of jsonData.relationshipsSections) {
      if (section.identifiers) {
        for (const identifier of section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION)) {
          if (jsonData.references?.[identifier]) {
            const ref = jsonData.references[identifier];
            relatedApis.push({
              title: ref.title ?? 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              relationship: section.title ?? 'Related',
            });
          }
        }
      }
    }
  }

  // From seeAlsoSections
  if (jsonData.seeAlsoSections) {
    for (const section of jsonData.seeAlsoSections) {
      if (section.identifiers) {
        for (const identifier of section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION)) {
          if (jsonData.references?.[identifier]) {
            const ref = jsonData.references[identifier];
            relatedApis.push({
              title: ref.title ?? 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              relationship: `See Also: ${section.title ?? 'Related'}`,
            });
          }
        }
      }
    }
  }

  return relatedApis.slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_RELATED_APIS); // Limit results
}

/**
 * Extract references from JSON data
 */
function extractReferences(jsonData: AppleDocJSON): Array<{title: string, url: string, type: string, abstract?: string}> {
  const references: Array<{title: string, url: string, type: string, abstract?: string}> = [];

  if (jsonData.references) {
    const refEntries = Object.entries(jsonData.references).slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_REFERENCES); // Limit

    for (const [, ref] of refEntries) {
      references.push({
        title: ref.title ?? 'Unknown',
        url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
        type: ref.role ?? ref.kind ?? 'unknown',
        abstract: ref.abstract
          ? ref.abstract.map((a) => (a as { text?: string })?.text ?? '').join(' ').trim()
          : undefined,
      });
    }
  }

  return references;
}

/**
 * Extract similar APIs from JSON data
 */
function extractSimilarApis(jsonData: AppleDocJSON): Array<{title: string, url: string, category: string}> {
  const similarApis: Array<{title: string, url: string, category: string}> = [];

  // From topicSections
  if (jsonData.topicSections) {
    for (const section of jsonData.topicSections) {
      if (section.identifiers) {
        for (const identifier of section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION)) {
          if (jsonData.references?.[identifier]) {
            const ref = jsonData.references[identifier];
            similarApis.push({
              title: ref.title ?? 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              category: section.title ?? 'Related',
            });
          }
        }
      }
    }
  }

  return similarApis.slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_SIMILAR_APIS); // Limit results
}

/**
 * Analyze platform compatibility
 */
function analyzePlatformCompatibility(
  jsonData: AppleDocJSON,
): {
  supportedPlatforms: string;
  betaPlatforms: string[];
  deprecatedPlatforms: string[];
  crossPlatform: boolean;
  platforms: any[];
} | null {
  if (!jsonData.metadata?.platforms) {
    return null;
  }

  const platforms = jsonData.metadata.platforms;
  const supportedPlatforms = platforms.map((p) => p.name).join(', ');
  const betaPlatforms = platforms.filter((p) => p.beta).map((p) => p.name).filter((name): name is string => name !== undefined);
  const deprecatedPlatforms = platforms.filter((p) => p.deprecated).map((p) => p.name).filter((name): name is string => name !== undefined);

  return {
    supportedPlatforms,
    betaPlatforms,
    deprecatedPlatforms,
    crossPlatform: platforms.length > 1,
    platforms,
  };
}

/**
 * Format related APIs section
 */
function formatRelatedApisSection(relatedApis: Array<{title: string, url: string, relationship: string}>): string {
  let content = '\n## Related APIs\n\n';

  for (const api of relatedApis) {
    content += `- [**${api.title}**](${api.url}) - *${api.relationship}*\n`;
  }

  return content + '\n';
}

/**
 * Format references section
 */
function formatReferencesSection(references: Array<{title: string, url: string, type: string, abstract?: string}>): string {
  let content = '\n## Key References\n\n';

  // Group by type
  const groupedRefs: Record<string, typeof references> = {};
  for (const ref of references) {
    if (!groupedRefs[ref.type]) {
      groupedRefs[ref.type] = [];
    }
    groupedRefs[ref.type].push(ref);
  }

  for (const [type, refs] of Object.entries(groupedRefs)) {
    content += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
    for (const ref of refs.slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_REFS_PER_TYPE)) {
      content += `- [**${ref.title}**](${ref.url})`;
      if (ref.abstract) {
        content += ` - ${ref.abstract.substring(0, 100)}${ref.abstract.length > 100 ? '...' : ''}`;
      }
      content += '\n';
    }
    content += '\n';
  }

  return content;
}

/**
 * Format similar APIs section
 */
function formatSimilarApisSection(
  similarApis: Array<{title: string, url: string, category: string}>,
): string {
  let content = '\n## Similar APIs\n\n';

  // Group by category
  const groupedApis: Record<string, typeof similarApis> = {};
  for (const api of similarApis) {
    if (!groupedApis[api.category]) {
      groupedApis[api.category] = [];
    }
    groupedApis[api.category].push(api);
  }

  for (const [category, apis] of Object.entries(groupedApis)) {
    content += `### ${category}\n\n`;
    for (const api of apis) {
      content += `- [**${api.title}**](${api.url})\n`;
    }
    content += '\n';
  }

  return content;
}

/**
 * Format platform analysis section
 */
function formatPlatformAnalysisSection(
  analysis: {
    supportedPlatforms: string;
    betaPlatforms: string[];
    deprecatedPlatforms: string[];
    crossPlatform?: boolean;
    platforms?: any[];
  },
): string {
  let content = '\n## Platform Compatibility Analysis\n\n';

  content += `**Supported Platforms:** ${analysis.supportedPlatforms}\n`;
  content += `**Cross-Platform Support:** ${analysis.crossPlatform ? 'Yes' : 'No'}\n`;

  if (analysis.betaPlatforms.length > 0) {
    content += `**Beta Platforms:** ${analysis.betaPlatforms.join(', ')}\n`;
  }

  if (analysis.deprecatedPlatforms.length > 0) {
    content += `**Deprecated Platforms:** ${analysis.deprecatedPlatforms.join(', ')}\n`;
  }

  content += '\n**Detailed Platform Information:**\n\n';
  for (const platform of analysis.platforms ?? []) {
    content += `- **${platform.name}**`;
    if (platform.introducedAt) {
      content += ` ${platform.introducedAt}+`;
    }
    if (platform.beta) {
      content += ' (Beta)';
    }
    if (platform.deprecated) {
      content += ' (Deprecated)';
    }
    content += '\n';
  }

  return content + '\n';
}