/**
 * Document formatting utilities
 */

import type { AppleDocJSON } from '../types/apple-docs.js';

/**
 * Format document header with title and status
 */
export function formatDocumentHeader(jsonData: AppleDocJSON): string {
  let content = '';

  // Add title with status information
  const title = jsonData.metadata?.title ?? jsonData.title ?? 'Documentation';
  const statusInfo = [];

  // Check for beta/deprecated status
  const isBeta = jsonData.metadata?.platforms?.some((p) => p.beta) ?? false;
  const isDeprecated = jsonData.metadata?.platforms?.some((p) => p.deprecated) ?? false;

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

  return content;
}

/**
 * Format document abstract
 */
export function formatDocumentAbstract(jsonData: AppleDocJSON): string {
  if (!jsonData.abstract || !Array.isArray(jsonData.abstract)) {
    return '';
  }

  const abstractText = jsonData.abstract
    .map((item) => (item as { text?: string })?.text ?? '')
    .join(' ')
    .trim();

  return abstractText ? `${abstractText}\n\n` : '';
}

/**
 * Format platform availability section
 */
export function formatPlatformAvailability(jsonData: AppleDocJSON): string {
  if (!jsonData.metadata?.platforms || !Array.isArray(jsonData.metadata.platforms)) {
    return '';
  }

  let content = '## Platform Availability\n\n';

  jsonData.metadata.platforms.forEach((platform) => {
    content += formatPlatformLine(platform);
  });

  return content + '\n';
}

/**
 * Format a single platform line
 */
function formatPlatformLine(platform: any): string {
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

  let platformLine = `- **${platform.name}** ${platform.introducedAt ?? 'Unknown'}+`;

  if (platform.deprecatedAt) {
    platformLine += ` | Deprecated in ${platform.deprecatedAt}`;
  }
  if (platform.obsoletedAt) {
    platformLine += ` | Obsoleted in ${platform.obsoletedAt}`;
  }
  if (platformStatus.length > 0) {
    platformLine += ` | Status: ${platformStatus.join(', ')}`;
  }

  return `${platformLine}\n`;
}

/**
 * Format See Also section
 */
export function formatSeeAlsoSection(jsonData: AppleDocJSON): string {
  if (!jsonData.seeAlsoSections || !Array.isArray(jsonData.seeAlsoSections)) {
    return '';
  }

  let content = '## See Also\n\n';

  jsonData.seeAlsoSections.forEach((seeAlso) => {
    if (seeAlso.title && seeAlso.identifiers) {
      content += `### ${seeAlso.title}\n\n`;
      content += formatSeeAlsoIdentifiers(seeAlso.identifiers);
    }
  });

  return content;
}

/**
 * Format See Also identifiers
 */
function formatSeeAlsoIdentifiers(identifiers: string[]): string {
  let content = '';

  identifiers.forEach((identifier: string) => {
    const apiName = identifier.split('/').pop() ?? identifier;
    const apiPath = identifier.replace('doc://com.apple.SwiftUI/documentation/', '');
    const apiUrl = `https://developer.apple.com/documentation/${apiPath}`;
    content += `- [\`${apiName}\`](${apiUrl})\n`;
  });

  return content + '\n';
}

/**
 * Check if document is a specific API
 */
export function isSpecificAPIDocument(jsonData: AppleDocJSON): boolean {
  return jsonData.primaryContentSections?.some(
    (section) => (section as { kind?: string })?.kind === 'declarations',
  ) ?? false;
}