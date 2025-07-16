import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { indexCache, generateUrlCacheKey } from '../utils/cache.js';
import { APPLE_URLS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';

export const getFrameworkIndexTool: Tool = {
  name: 'get_framework_index',
  description: 'Get the complete API structure tree for a specific framework, showing all available APIs organized hierarchically',
  inputSchema: {
    type: 'object',
    properties: {
      framework: {
        type: 'string',
        description: 'Framework name (e.g., "swiftui", "uikit", "foundation")',
      },
      language: {
        type: 'string',
        enum: ['swift', 'occ'],
        description: 'Programming language (default: swift)',
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum depth to display in the tree (default: 3)',
        minimum: 1,
        maximum: 10,
      },
      filterType: {
        type: 'string',
        enum: ['all', 'symbol', 'article', 'class', 'struct', 'enum', 'protocol', 'method', 'property', 'init', 'case', 'associatedtype', 'typealias', 'sampleCode', 'overview', 'collection'],
        description: 'Filter by API type (default: all)',
      },
    },
    required: ['framework'],
  },
};

/**
 * 索引项接口
 */
interface IndexItem {
  path: string;
  title: string;
  type: string;
  beta?: boolean;
  deprecated?: boolean;
  external?: boolean;
  children?: IndexItem[];
}

interface FrameworkIndex {
  interfaceLanguages: {
    [language: string]: IndexItem[];
  };
}

/**
 * 获取框架索引
 */
export async function handleGetFrameworkIndex(
  framework: string,
  language: string = 'swift',
  maxDepth: number = 3,
  filterType: string = 'all',
): Promise<string> {
  try {
    console.error(`Fetching framework index for: ${framework}`);

    // 构建索引 URL
    const indexUrl = `${APPLE_URLS.TUTORIALS_DATA}index/${framework.toLowerCase()}`;

    // Generate cache key
    const cacheKey = generateUrlCacheKey(indexUrl, { language, maxDepth, filterType });

    // Try to get from cache first
    const cachedResult = indexCache.get<string>(cacheKey);
    if (cachedResult) {
      console.error(`Index cache hit for: ${framework}`);
      return cachedResult;
    }

    const data = await httpClient.getJson<FrameworkIndex>(indexUrl);

    // 检查语言支持
    if (!data.interfaceLanguages?.[language]) {
      const availableLanguages = Object.keys(data.interfaceLanguages || {});
      return `Language "${language}" not available for ${framework}. Available languages: ${availableLanguages.join(', ')}`;
    }

    // 获取指定语言的索引
    const indexItems = data.interfaceLanguages[language];

    // 应用过滤器
    const filteredItems = applyIndexFilters(indexItems, filterType, maxDepth);

    // 格式化输出
    const result = formatFrameworkIndex(framework, language, filteredItems, maxDepth);

    // Cache the result
    indexCache.set(cacheKey, result);

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to get framework index: ${errorMessage}`;
  }
}

/**
 * 应用索引过滤器
 */
function applyIndexFilters(
  items: IndexItem[],
  filterType: string,
  maxDepth: number,
  currentDepth: number = 0,
): IndexItem[] {
  if (currentDepth >= maxDepth) {
    return [];
  }

  return items
    .filter(item => {
      // 类型过滤
      if (filterType !== 'all') {
        if (item.type !== filterType) {
          return false;
        }
      }
      return true;
    })
    .map(item => {
      const filteredItem: IndexItem = {
        path: item.path,
        title: item.title,
        type: item.type,
        beta: item.beta,
        deprecated: item.deprecated,
        external: item.external,
      };

      // 递归处理子项
      if (item.children && currentDepth < maxDepth - 1) {
        const filteredChildren = applyIndexFilters(item.children, filterType, maxDepth, currentDepth + 1);
        if (filteredChildren.length > 0) {
          filteredItem.children = filteredChildren;
        }
      }

      return filteredItem;
    });
}

/**
 * 格式化框架索引
 */
function formatFrameworkIndex(
  framework: string,
  language: string,
  items: IndexItem[],
  maxDepth: number,
): string {
  if (items.length === 0) {
    return `No items found for ${framework} framework.`;
  }

  let content = `# ${framework} Framework API Index\n\n`;

  // 添加配置信息
  content += `**Configuration:** Language: ${language} | Max Depth: ${maxDepth}\n\n`;

  // 统计信息
  const stats = calculateIndexStats(items);
  let statsText = `**Statistics:** ${stats.total} total APIs`;
  if (stats.beta > 0) {
    statsText += `, ${stats.beta} beta`;
  }
  if (stats.deprecated > 0) {
    statsText += `, ${stats.deprecated} deprecated`;
  }
  content += `${statsText}\n\n`;

  // 格式化索引树
  content += formatIndexTree(items, 0);

  content += `\n---\n\n[View ${framework} documentation](https://developer.apple.com/documentation/${framework.toLowerCase()})`;

  return content;
}

/**
 * 计算索引统计信息
 */
function calculateIndexStats(items: IndexItem[]): { total: number; beta: number; deprecated: number } {
  let total = 0;
  let beta = 0;
  let deprecated = 0;

  function countItems(itemList: IndexItem[]) {
    for (const item of itemList) {
      total++;
      if (item.beta) {
        beta++;
      }
      if (item.deprecated) {
        deprecated++;
      }
      if (item.children) {
        countItems(item.children);
      }
    }
  }

  countItems(items);
  return { total, beta, deprecated };
}

/**
 * 格式化索引树
 */
function formatIndexTree(items: IndexItem[], depth: number): string {
  let content = '';
  const indent = '  '.repeat(depth);

  for (const item of items) {
    // 跳过 groupMarker 类型
    if (item.type === 'groupMarker') {
      if (item.children && item.children.length > 0) {
        content += `${indent}**${item.title}**\n\n`;
        content += formatIndexTree(item.children, depth);
      }
      continue;
    }

    // 格式化项目
    const url = item.path ? `https://developer.apple.com${item.path}` : '#';
    content += `${indent}- `;

    // 构建状态信息
    const statusInfo = [];
    if (item.beta) {
      statusInfo.push('Beta');
    }
    if (item.deprecated) {
      statusInfo.push('Deprecated');
    }
    if (item.external) {
      statusInfo.push('External');
    }

    // 添加标题和类型
    let titleWithInfo = `[**${item.title}**](${url})`;

    // 添加类型信息
    const metadata = [];
    if (item.type && item.type !== 'groupMarker') {
      metadata.push(formatTypeLabel(item.type));
    }
    if (statusInfo.length > 0) {
      metadata.push(statusInfo.join(', '));
    }

    if (metadata.length > 0) {
      titleWithInfo += ` *(${metadata.join(' | ')})*`;
    }

    content += titleWithInfo + '\n';

    // 递归处理子项
    if (item.children && item.children.length > 0) {
      content += formatIndexTree(item.children, depth + 1);
    }
  }

  return content;
}

/**
 * 格式化类型标签
 */
function formatTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    'symbol': 'Symbol',
    'module': 'Module',
    'class': 'Class',
    'struct': 'Struct',
    'enum': 'Enum',
    'protocol': 'Protocol',
    'method': 'Method',
    'property': 'Property',
    'init': 'Initializer',
    'case': 'Case',
    'associatedtype': 'Associated Type',
    'typealias': 'Type Alias',
    'article': 'Article',
    'sampleCode': 'Sample Code',
    'overview': 'Overview',
    'collection': 'Collection',
    'dictionary': 'Dictionary',
    'func': 'Function',
    'var': 'Variable',
    'let': 'Constant',
    'operator': 'Operator',
    'macro': 'Macro',
    'namespace': 'Namespace',
    'buildSetting': 'Build Setting',
    'httpRequest': 'HTTP Request',
    'restEndpoint': 'REST Endpoint',
    'dictionarySymbol': 'Dictionary Symbol',
    'unknownSymbol': 'Unknown Symbol',
  };

  return typeLabels[type] || type;
}