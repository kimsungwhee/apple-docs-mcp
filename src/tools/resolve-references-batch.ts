import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { convertToJsonApiUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';

export const resolveReferencesBatchTool: Tool = {
  name: 'resolve_references_batch',
  description: 'Batch resolve all references from a specific Apple Developer Documentation page to get detailed information about related APIs and types',
  inputSchema: {
    type: 'object',
    properties: {
      sourceUrl: {
        type: 'string',
        description: 'The Apple Developer Documentation URL to extract and resolve references from',
      },
      maxReferences: {
        type: 'number',
        description: 'Maximum number of references to resolve (default: 20, max: 50)',
        minimum: 1,
        maximum: 50,
      },
      filterByType: {
        type: 'string',
        enum: ['all', 'symbol', 'collection', 'article', 'protocol', 'class', 'struct', 'enum'],
        description: 'Filter references by type (default: all)',
      },
    },
    required: ['sourceUrl'],
  },
};

/**
 * 解析的引用信息接口
 */
interface ResolvedReference {
  identifier: string;
  title: string;
  url: string;
  type: string;
  role: string;
  abstract?: string;
  kind?: string;
  symbolKind?: string;
  platforms?: Array<{
    name: string;
    introducedAt?: string;
    beta?: boolean;
    deprecated?: boolean;
  }>;
  fragments?: Array<{
    kind: string;
    text: string;
  }>;
}

interface ReferenceData {
  title: string;
  url?: string;
  type?: string;
  role?: string;
  kind?: string;
  abstract?: any[];
  fragments?: any[];
  platforms?: any[];
  symbolKind?: string;
  navigatorTitle?: any[];
}

interface AppleDocData {
  references?: Record<string, ReferenceData>;
  metadata?: {
    title?: string;
  };
}

/**
 * 批量解析引用
 */
export async function handleResolveReferencesBatch(
  sourceUrl: string,
  maxReferences: number = 20,
  filterByType: string = 'all',
): Promise<string> {
  try {
    console.error(`Resolving references from: ${sourceUrl}`);

    // 将网页URL转换为JSON API URL
    const jsonApiUrl = convertToJsonApiUrl(sourceUrl);
    
    if (!jsonApiUrl) {
      throw new Error('Invalid Apple Developer Documentation URL');
    }

    const data = await httpClient.getJson<AppleDocData>(jsonApiUrl);

    if (!data.references || Object.keys(data.references).length === 0) {
      return `No references found in: ${sourceUrl}`;
    }

    // 过滤和限制引用数量
    const filteredReferences = filterReferences(data.references, filterByType);
    const limitedReferences = Object.entries(filteredReferences).slice(0, maxReferences);

    // 解析引用信息
    const resolvedReferences: ResolvedReference[] = [];

    for (const [identifier, refData] of limitedReferences) {
      const resolved = await resolveReference(identifier, refData);
      if (resolved) {
        resolvedReferences.push(resolved);
      }
    }

    // 格式化输出
    return formatResolvedReferences(sourceUrl, resolvedReferences, data.metadata?.title);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to resolve references: ${errorMessage}`;
  }
}



/**
 * 过滤引用
 */
function filterReferences(
  references: Record<string, ReferenceData>,
  filterByType: string,
): Record<string, ReferenceData> {
  if (filterByType === 'all') {
    return references;
  }

  const filtered: Record<string, ReferenceData> = {};

  for (const [identifier, refData] of Object.entries(references)) {
    const matchesFilter =
      refData.role === filterByType ||
      refData.kind === filterByType ||
      refData.type === filterByType ||
      refData.symbolKind === filterByType;

    if (matchesFilter) {
      filtered[identifier] = refData;
    }
  }

  return filtered;
}

/**
 * 解析单个引用
 */
async function resolveReference(
  identifier: string,
  refData: ReferenceData,
): Promise<ResolvedReference | null> {
  try {
    // 基本信息
    const resolved: ResolvedReference = {
      identifier,
      title: refData.title || 'Unknown',
      url: refData.url ? `https://developer.apple.com${refData.url}` : '#',
      type: refData.type || 'unknown',
      role: refData.role || 'unknown',
      kind: refData.kind,
      symbolKind: refData.symbolKind,
    };

    // 处理摘要
    if (refData.abstract && Array.isArray(refData.abstract)) {
      resolved.abstract = refData.abstract
        .map(item => item.text || '')
        .join(' ')
        .trim();
    }

    // 处理代码片段
    if (refData.fragments && Array.isArray(refData.fragments)) {
      resolved.fragments = refData.fragments.map(fragment => ({
        kind: fragment.kind || 'text',
        text: fragment.text || '',
      }));
    }

    // 处理平台信息
    if (refData.platforms && Array.isArray(refData.platforms)) {
      resolved.platforms = refData.platforms.map(platform => ({
        name: platform.name || 'Unknown',
        introducedAt: platform.introducedAt,
        beta: platform.beta || false,
        deprecated: platform.deprecated || false,
      }));
    }

    return resolved;

  } catch (error) {
    console.error(`Failed to resolve reference ${identifier}:`, error);
    return null;
  }
}

/**
 * 格式化解析结果
 */
function formatResolvedReferences(
  sourceUrl: string,
  references: ResolvedReference[],
  sourceTitle?: string,
): string {
  if (references.length === 0) {
    return `No references could be resolved from: ${sourceUrl}`;
  }

  const title = sourceTitle || new URL(sourceUrl).pathname.split('/').pop() || 'Document';
  let content = `# References from ${title}\n\n`;
  content += `**Source:** [${sourceUrl}](${sourceUrl})\n\n`;
  content += `**Resolved ${references.length} references:**\n\n`;

  // 按类型分组
  const groupedReferences = groupReferencesByRole(references);

  for (const [role, refs] of Object.entries(groupedReferences)) {
    content += `## ${formatRoleTitle(role)} (${refs.length})\n\n`;

    for (const ref of refs) {
      content += formatSingleReference(ref);
    }
  }

  content += `---\n\n*Total: ${references.length} references resolved*`;

  return content;
}

/**
 * 按角色分组引用
 */
function groupReferencesByRole(references: ResolvedReference[]): Record<string, ResolvedReference[]> {
  const groups: Record<string, ResolvedReference[]> = {};

  for (const ref of references) {
    const role = ref.role || 'unknown';
    if (!groups[role]) {
      groups[role] = [];
    }
    groups[role].push(ref);
  }

  return groups;
}

/**
 * 格式化角色标题
 */
function formatRoleTitle(role: string): string {
  const roleTitles: Record<string, string> = {
    'symbol': 'API Symbols',
    'collection': 'Collections',
    'article': 'Articles',
    'sampleCode': 'Sample Code',
    'overview': 'Overviews',
    'collectionGroup': 'Collection Groups',
    'unknown': 'Other References',
  };

  return roleTitles[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * 格式化单个引用
 */
function formatSingleReference(ref: ResolvedReference): string {
  let content = `### [${ref.title}](${ref.url})\n`;

  // 添加代码片段（如果是符号）
  if (ref.fragments && ref.fragments.length > 0) {
    const codeSignature = ref.fragments.map(f => f.text).join('');
    if (codeSignature.trim()) {
      content += `\`\`\`swift\n${codeSignature}\`\`\`\n\n`;
    }
  }

  // 添加摘要
  if (ref.abstract) {
    content += `${ref.abstract}\n\n`;
  }

  // 添加元数据
  const metadata = [];
  if (ref.kind) {
    metadata.push(`Kind: ${ref.kind}`);
  }
  if (ref.symbolKind) {
    metadata.push(`Symbol: ${ref.symbolKind}`);
  }
  if (metadata.length > 0) {
    content += `*${metadata.join(' | ')}*\n\n`;
  }

  // 添加平台信息
  if (ref.platforms && ref.platforms.length > 0) {
    const platformInfo = ref.platforms.map(p => {
      let info = p.name;
      if (p.introducedAt) {
        info += ` ${p.introducedAt}+`;
      }
      if (p.beta) {
        info += ' (Beta)';
      }
      if (p.deprecated) {
        info += ' (Deprecated)';
      }
      return info;
    }).join(', ');
    content += `**Platforms:** ${platformInfo}\n\n`;
  }

  return content;
}