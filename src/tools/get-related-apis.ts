import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { convertToJsonApiUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';

export const getRelatedApisTool: Tool = {
  name: 'get_related_apis',
  description: 'Get related APIs for a specific Apple Developer Documentation API, including inheritance relationships, conformance types, and similar APIs',
  inputSchema: {
    type: 'object',
    properties: {
      apiUrl: {
        type: 'string',
        description: 'The Apple Developer Documentation API URL to find related APIs for',
      },
      includeInherited: {
        type: 'boolean',
        description: 'Include inherited APIs (default: true)',
      },
      includeConformance: {
        type: 'boolean',
        description: 'Include conformance relationships (default: true)',
      },
      includeSeeAlso: {
        type: 'boolean',
        description: 'Include "See Also" related APIs (default: true)',
      },
    },
    required: ['apiUrl'],
  },
};

/**
 * 关联API信息接口
 */
interface RelatedAPI {
  title: string;
  url: string;
  identifier: string;
  type: string;
  relationship: string;
  abstract?: string;
}

interface RelationshipSection {
  type: string;
  title: string;
  identifiers: string[];
}

interface SeeAlsoSection {
  title: string;
  identifiers: string[];
}

interface AppleDocData {
  relationshipsSections?: RelationshipSection[];
  seeAlsoSections?: SeeAlsoSection[];
  references?: Record<string, any>;
  topicSections?: Array<{
    title: string;
    identifiers: string[];
  }>;
}

/**
 * 获取相关API
 */
export async function handleGetRelatedApis(
  apiUrl: string,
  includeInherited: boolean = true,
  includeConformance: boolean = true,
  includeSeeAlso: boolean = true,
): Promise<string> {
  try {
    console.error(`Fetching related APIs for: ${apiUrl}`);

    // 将网页URL转换为JSON API URL
    const jsonApiUrl = convertToJsonApiUrl(apiUrl);

    const data = await httpClient.getJson<AppleDocData>(jsonApiUrl);

    // 收集所有相关API
    const relatedApis: RelatedAPI[] = [];

    // 处理关系部分（继承、一致性等）
    if (data.relationshipsSections) {
      for (const section of data.relationshipsSections) {
        const shouldInclude =
          (includeInherited && (section.type === 'inheritsFrom' || section.type === 'inheritedBy')) ||
          (includeConformance && (section.type === 'conformsTo' || section.type === 'conformingTypes'));

        if (shouldInclude && section.identifiers) {
          for (const identifier of section.identifiers) {
            const api = extractApiFromIdentifier(identifier, section.title, data.references);
            if (api) {
              relatedApis.push(api);
            }
          }
        }
      }
    }

    // 处理"另请参阅"部分
    if (includeSeeAlso && data.seeAlsoSections) {
      for (const section of data.seeAlsoSections) {
        if (section.identifiers) {
          for (const identifier of section.identifiers) {
            const api = extractApiFromIdentifier(identifier, `See Also: ${section.title}`, data.references);
            if (api) {
              relatedApis.push(api);
            }
          }
        }
      }
    }

    // 处理主题部分的相关API
    if (data.topicSections) {
      for (const section of data.topicSections) {
        if (section.identifiers && section.identifiers.length > 0) {
          // 只取前3个，避免过多
          const limitedIdentifiers = section.identifiers.slice(0, 3);
          for (const identifier of limitedIdentifiers) {
            const api = extractApiFromIdentifier(identifier, `Related: ${section.title}`, data.references);
            if (api) {
              relatedApis.push(api);
            }
          }
        }
      }
    }

    // 去重
    const uniqueApis = deduplicateApis(relatedApis);

    // 格式化输出
    return formatRelatedApis(apiUrl, uniqueApis);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to get related APIs: ${errorMessage}`;
  }
}



/**
 * 从标识符提取API信息
 */
function extractApiFromIdentifier(
  identifier: string,
  relationship: string,
  references?: Record<string, any>,
): RelatedAPI | null {
  // 先从references中查找
  if (references?.[identifier]) {
    const ref = references[identifier];
    return {
      title: ref.title || 'Unknown',
      url: ref.url ? `https://developer.apple.com${ref.url}` : '#',
      identifier,
      type: ref.kind || ref.type || 'unknown',
      relationship,
      abstract: ref.abstract ? ref.abstract.map((a: any) => a.text || '').join(' ').trim() : undefined,
    };
  }

  // 如果references中没有，尝试解析标识符
  if (identifier.startsWith('doc://')) {
    const parts = identifier.split('/');
    const apiName = parts[parts.length - 1] || 'Unknown';
    const pathPart = identifier.replace(/^doc:\/\/[^\/]+\/documentation\//, '');

    return {
      title: apiName,
      url: `https://developer.apple.com/documentation/${pathPart}`,
      identifier,
      type: 'symbol',
      relationship,
    };
  }

  return null;
}

/**
 * 去重API列表
 */
function deduplicateApis(apis: RelatedAPI[]): RelatedAPI[] {
  const seen = new Set<string>();
  return apis.filter(api => {
    if (seen.has(api.identifier)) {
      return false;
    }
    seen.add(api.identifier);
    return true;
  });
}

/**
 * 格式化相关API输出
 */
function formatRelatedApis(originalUrl: string, relatedApis: RelatedAPI[]): string {
  if (relatedApis.length === 0) {
    return `No related APIs found for: ${originalUrl}`;
  }

  const apiName = new URL(originalUrl).pathname.split('/').pop() || 'API';
  let content = `# Related APIs for ${apiName}\n\n`;
  content += `**Source:** [${originalUrl}](${originalUrl})\n\n`;
  content += `**Found ${relatedApis.length} related APIs:**\n\n`;

  // 按关系类型分组
  const groupedApis = groupApisByRelationship(relatedApis);

  for (const [relationship, apis] of Object.entries(groupedApis)) {
    content += `## ${relationship}\n\n`;

    for (const api of apis) {
      content += `### [${api.title}](${api.url})\n`;

      if (api.abstract) {
        content += `${api.abstract}\n\n`;
      }

      content += `*Type: ${api.type}*\n\n`;
    }
  }

  content += `---\n\n*Total: ${relatedApis.length} related APIs*`;

  return content;
}

/**
 * 按关系类型分组API
 */
function groupApisByRelationship(apis: RelatedAPI[]): Record<string, RelatedAPI[]> {
  const groups: Record<string, RelatedAPI[]> = {};

  for (const api of apis) {
    if (!groups[api.relationship]) {
      groups[api.relationship] = [];
    }
    groups[api.relationship].push(api);
  }

  return groups;
}