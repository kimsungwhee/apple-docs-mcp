import { apiCache, generateEnhancedCacheKey } from '../utils/cache.js';
import { convertToJsonApiUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';

/**
 * Interface for Apple Documentation JSON reference
 */
interface AppleDocReference {
  title: string;
  url: string;
  type?: string;
  role?: string;
  kind?: string;
  abstract?: any[];
}

/**
 * Interface for Apple Documentation JSON
 */
interface AppleDocJSON {
  references?: Record<string, AppleDocReference>;
  identifier?: string;
  title?: string;
  url?: string;
  abstract?: any[];
  primaryContentSections?: any[];
  topicSections?: any[];
  topics?: any[];
  relationshipsSections?: Array<{
    title?: string;
    identifiers?: string[];
  }>;
  seeAlsoSections?: Array<{
    title?: string;
    identifiers?: string[];
  }>;
  availability?: any;
  metadata?: {
    title?: string;
    roleHeading?: string;
    sourceLanguage?: string;
    platforms?: any[];
    symbolKind?: string;
  };
}



/**
 * Format JSON documentation content with enhanced analysis
 */
function formatJsonDocumentation(
  jsonData: AppleDocJSON,
  originalUrl: string,
  options: EnhancedAnalysisOptions = {},
): any {
  let content = '';

  // Add title with status information
  const title = jsonData.metadata?.title || jsonData.title || 'Documentation';
  const statusInfo = [];

  // Check for beta/deprecated status in various places
  const isBeta = jsonData.metadata?.platforms?.some((p: any) => p.beta) || false;
  const isDeprecated = jsonData.metadata?.platforms?.some((p: any) => p.deprecated) || false;

  if (isBeta) {
    statusInfo.push('**Beta**');
  }
  if (isDeprecated) {
    statusInfo.push('**Deprecated**');
  }

  const statusText = statusInfo.length > 0 ? ` (${statusInfo.join(', ')})` : '';
  content += `# ${title}${statusText}\n\n`;

  // Add role/type information with symbol kind
  if (jsonData.metadata?.roleHeading) {
    let roleInfo = `**${jsonData.metadata.roleHeading}**`;
    if (jsonData.metadata?.symbolKind) {
      roleInfo += ` (${jsonData.metadata.symbolKind})`;
    }
    content += `${roleInfo}\n\n`;
  }

  // Add abstract
  if (jsonData.abstract && Array.isArray(jsonData.abstract)) {
    const abstractText = jsonData.abstract
      .map(item => item.text || '')
      .join(' ')
      .trim();
    if (abstractText) {
      content += `${abstractText}\n\n`;
    }
  }

  // Check if this is a specific API/symbol (has declarations) or an API collection
  const isSpecificAPI = jsonData.primaryContentSections?.some((section: any) => section.kind === 'declarations');

  if (isSpecificAPI) {
    // Handle specific API documentation
    content += formatSpecificAPIContent(jsonData);
  } else {
    // Handle API collection documentation
    content += formatAPICollectionContent(jsonData);
  }

  // Add availability information
  if (jsonData.metadata?.platforms && Array.isArray(jsonData.metadata.platforms)) {
    content += '## Platform Availability\n\n';
    jsonData.metadata.platforms.forEach((platform: any) => {
      const platformStatus = [];
      if (platform.beta) {
        platformStatus.push('Beta');
      }
      if (platform.deprecated) {
        platformStatus.push('Deprecated');
      }
      if (platform.unavailable) {
        platformStatus.push('Unavailable');
      }

      let platformLine = `- **${platform.name}** ${platform.introducedAt || 'Unknown'}+`;

      if (platform.deprecatedAt) {
        platformLine += ` | Deprecated in ${platform.deprecatedAt}`;
      }
      if (platform.obsoletedAt) {
        platformLine += ` | Obsoleted in ${platform.obsoletedAt}`;
      }
      if (platformStatus.length > 0) {
        platformLine += ` | Status: ${platformStatus.join(', ')}`;
      }

      content += `${platformLine}\n`;
    });
    content += '\n';
  }

  // Add See Also section for specific APIs
  if (jsonData.seeAlsoSections && Array.isArray(jsonData.seeAlsoSections)) {
    content += '## See Also\n\n';
    jsonData.seeAlsoSections.forEach((seeAlso: any) => {
      if (seeAlso.title && seeAlso.identifiers) {
        content += `### ${seeAlso.title}\n\n`;
        seeAlso.identifiers.forEach((identifier: string) => {
          const apiName = identifier.split('/').pop() || identifier;
          const apiPath = identifier.replace('doc://com.apple.SwiftUI/documentation/', '');
          const apiUrl = `https://developer.apple.com/documentation/${apiPath}`;
          content += `- [\`${apiName}\`](${apiUrl})\n`;
        });
        content += '\n';
      }
    });
  }

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
    jsonData.primaryContentSections.forEach((section: any) => {
      switch (section.kind) {
        case 'declarations':
          content += '## Declaration\n\n';
          if (section.declarations?.[0]?.tokens) {
            const declaration = section.declarations[0].tokens
              .map((token: any) => token.text || '')
              .join('');
            content += `\`\`\`swift\n${declaration}\`\`\`\n\n`;
          }
          break;

        case 'parameters':
          content += '## Parameters\n\n';
          if (section.parameters && Array.isArray(section.parameters)) {
            section.parameters.forEach((param: any) => {
              content += `**${param.name}**: `;
              if (param.content?.[0]?.inlineContent) {
                const paramDesc = param.content[0].inlineContent
                  .map((inline: any) => inline.text || '')
                  .join('');
                content += `${paramDesc}\n\n`;
              }
            });
          }
          break;

        case 'content':
          if (section.content && Array.isArray(section.content)) {
            section.content.forEach((item: any) => {
              if (item.type === 'heading') {
                content += `## ${item.text}\n\n`;
              } else if (item.type === 'paragraph' && item.inlineContent) {
                const paragraphText = item.inlineContent
                  .map((inline: any) => {
                    if (inline.type === 'text') {
                      return inline.text || '';
                    } else if (inline.type === 'codeVoice') {
                      return `\`${inline.code}\``;
                    } else if (inline.type === 'reference' && inline.identifier) {
                      const apiName = inline.identifier.split('/').pop() || inline.identifier;
                      return `\`${apiName}\``;
                    }
                    return '';
                  })
                  .join('');
                if (paragraphText.trim()) {
                  content += `${paragraphText}\n\n`;
                }
              } else if (item.type === 'codeListing' && item.code) {
                content += `\`\`\`${item.syntax || 'swift'}\n${item.code.join('\n')}\`\`\`\n\n`;
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
    jsonData.primaryContentSections.forEach(section => {
      if (section.kind === 'content' && section.content) {
        section.content.forEach((item: any) => {
          if (item.type === 'paragraph' && item.inlineContent) {
            const paragraphText = item.inlineContent
              .map((inline: any) => {
                if (inline.type === 'text') {
                  return inline.text || '';
                } else if (inline.type === 'reference' && inline.identifier) {
                  // Extract API name from identifier
                  const apiName = inline.identifier.split('/').pop() || inline.identifier;
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
                      return inline.text || '';
                    } else if (inline.type === 'reference' && inline.identifier) {
                      const apiName = inline.identifier.split('/').pop() || inline.identifier;
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

    jsonData.topicSections.forEach((section: any) => {
      if (section.title && section.identifiers && Array.isArray(section.identifiers)) {
        content += `### ${section.title}\n\n`;

        section.identifiers.forEach((identifier: string) => {
          // Extract the API name from the identifier
          const apiName = identifier.split('/').pop() || identifier;
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

    // Generate cache key including options
    const cacheKey = generateEnhancedCacheKey(jsonApiUrl, options as any);

    // Try to get from cache first
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for: ${jsonApiUrl}`);
      return cachedResult;
    }

    console.error(`Fetching Apple doc JSON from: ${jsonApiUrl}`);

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

      if (mainReference && mainReference.url) {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching Apple doc JSON:', errorMessage);

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
        for (const identifier of section.identifiers.slice(0, 3)) {
          if (jsonData.references?.[identifier]) {
            const ref = jsonData.references[identifier];
            relatedApis.push({
              title: ref.title || 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              relationship: section.title || 'Related',
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
        for (const identifier of section.identifiers.slice(0, 3)) {
          if (jsonData.references?.[identifier]) {
            const ref = jsonData.references[identifier];
            relatedApis.push({
              title: ref.title || 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              relationship: `See Also: ${section.title || 'Related'}`,
            });
          }
        }
      }
    }
  }

  return relatedApis.slice(0, 10); // Limit results
}

/**
 * Extract references from JSON data
 */
function extractReferences(jsonData: AppleDocJSON): Array<{title: string, url: string, type: string, abstract?: string}> {
  const references: Array<{title: string, url: string, type: string, abstract?: string}> = [];

  if (jsonData.references) {
    const refEntries = Object.entries(jsonData.references).slice(0, 15); // Limit

    for (const [, ref] of refEntries) {
      references.push({
        title: ref.title || 'Unknown',
        url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
        type: ref.role || ref.kind || 'unknown',
        abstract: ref.abstract ? ref.abstract.map((a: any) => a.text || '').join(' ').trim() : undefined,
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
        for (const identifier of section.identifiers.slice(0, 3)) {
          if (jsonData.references?.[identifier]) {
            const ref = jsonData.references[identifier];
            similarApis.push({
              title: ref.title || 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              category: section.title || 'Related',
            });
          }
        }
      }
    }
  }

  return similarApis.slice(0, 8); // Limit results
}

/**
 * Analyze platform compatibility
 */
function analyzePlatformCompatibility(jsonData: AppleDocJSON): any {
  if (!jsonData.metadata?.platforms) {
    return null;
  }

  const platforms = jsonData.metadata.platforms;
  const supportedPlatforms = platforms.map((p: any) => p.name).join(', ');
  const betaPlatforms = platforms.filter((p: any) => p.beta).map((p: any) => p.name);
  const deprecatedPlatforms = platforms.filter((p: any) => p.deprecated).map((p: any) => p.name);

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
    for (const ref of refs.slice(0, 5)) {
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
function formatSimilarApisSection(similarApis: Array<{title: string, url: string, category: string}>): string {
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
function formatPlatformAnalysisSection(analysis: any): string {
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
  for (const platform of analysis.platforms) {
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