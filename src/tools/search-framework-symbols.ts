import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { indexCache, generateUrlCacheKey } from '../utils/cache.js';
import { APPLE_URLS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';

/**
 * MCP Tool Definition
 */
export const searchFrameworkSymbolsTool: Tool = {
  name: 'search_framework_symbols',
  description: 'Search for symbols (classes, structs, protocols, etc.) in a specific Apple framework using the framework index',
  inputSchema: {
    type: 'object',
    properties: {
      framework: {
        type: 'string',
        description: 'Framework name (e.g., "uikit", "swiftui", "foundation")',
      },
      symbolType: {
        type: 'string',
        enum: ['all', 'class', 'struct', 'enum', 'protocol', 'method', 'property', 'init', 'func', 'var', 'let', 'typealias'],
        description: 'Type of symbol to search for (default: all)',
      },
      namePattern: {
        type: 'string',
        description: 'Optional name pattern to filter results (supports * wildcard, e.g., "*View")',
      },
      language: {
        type: 'string',
        enum: ['swift', 'occ'],
        description: 'Programming language (default: swift)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50)',
        minimum: 1,
        maximum: 200,
      },
    },
    required: ['framework'],
  },
};

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
 * 搜索框架中的符号（类、结构体、协议等）
 */
// Function to find symbols recursively (defined outside to reduce complexity)
function findSymbolsRecursive(
  items: IndexItem[],
  symbolType: string,
  namePattern: string | undefined,
  limit: number,
  symbols: IndexItem[],
  depth: number = 0,
): boolean {
  if (depth > 6) {
    return false;
  }

  for (const item of items) {
    if (symbols.length >= limit) {
      return true; // Limit reached
    }

    // Check if symbol type matches
    if (symbolType === 'all' || item.type === symbolType) {
      // Check name pattern if provided
      if (!namePattern || matchesPattern(item.title, namePattern)) {
        symbols.push(item);
      }
    }

    if (item.children && symbols.length < limit) {
      const limitReached = findSymbolsRecursive(
        item.children,
        symbolType,
        namePattern,
        limit,
        symbols,
        depth + 1,
      );
      if (limitReached) {
        return true;
      }
    }
  }

  return false;
}

export async function searchFrameworkSymbols(
  framework: string,
  symbolType: string = 'all',
  namePattern?: string,
  language: string = 'swift',
  limit: number = 50,
): Promise<string> {
  try {
    console.error(`Searching ${symbolType} symbols in ${framework} framework`);

    // 获取框架索引
    const indexUrl = `${APPLE_URLS.TUTORIALS_DATA}index/${framework.toLowerCase()}`;
    const cacheKey = generateUrlCacheKey(indexUrl, { framework, symbolType, namePattern, language, limit });

    // Check cache
    const cachedResult = indexCache.get<string>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const data = await httpClient.getJson<FrameworkIndex>(indexUrl);

    // Get language-specific index
    const indexItems = data.interfaceLanguages?.[language] || [];

    if (indexItems.length === 0) {
      const availableLanguages = Object.keys(data.interfaceLanguages || {});
      return `Language "${language}" not available for ${framework}. Available languages: ${availableLanguages.join(', ')}`;
    }

    // Find all symbols recursively
    const symbols: IndexItem[] = [];
    findSymbolsRecursive(indexItems, symbolType, namePattern, limit, symbols);

    // Format results
    const typeLabel = symbolType === 'all' ? 'Symbols' : formatTypeLabel(symbolType) + 's';
    let result = `# ${framework} Framework ${typeLabel}\n\n`;

    if (symbols.length === 0) {
      const typeText = symbolType === 'all' ? 'symbols' : formatTypeLabel(symbolType).toLowerCase() + 's';
      result += `No ${typeText} found`;
      if (namePattern) {
        result += ` matching pattern "${namePattern}"`;
      }
      result += ` in ${framework} framework.\n`;

      // Suggest exploring collections
      const collections = findCollections(indexItems);
      if (collections.length > 0) {
        result += '\n## Try exploring these collections:\n\n';
        for (const col of collections.slice(0, 5)) {
          result += `- [${col.title}](https://developer.apple.com${col.path})\n`;
        }
      }
    } else {
      result += `**Found:** ${symbols.length} ${symbolType === 'all' ? 'symbols' : symbolType + 's'}`;
      if (namePattern) {
        result += ` matching "${namePattern}"`;
      }
      result += '\n\n';

      // Group by type if searching all
      if (symbolType === 'all') {
        const grouped = groupByType(symbols);
        for (const [type, items] of Object.entries(grouped)) {
          result += `## ${formatTypeLabel(type)}s (${items.length})\n\n`;
          for (const item of items) {
            result += formatSymbolItem(item);
          }
          result += '\n';
        }
      } else {
        // List symbols
        for (const symbol of symbols) {
          result += formatSymbolItem(symbol);
        }
      }
    }

    // Cache result
    indexCache.set(cacheKey, result);

    return result;

  } catch (error) {
    return `Error searching classes: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function formatSymbolItem(item: IndexItem): string {
  const url = `https://developer.apple.com${item.path}`;
  let result = `- [**${item.title}**](${url})`;

  const metadata = [];
  if (item.beta) {
    metadata.push('Beta');
  }
  if (item.deprecated) {
    metadata.push('Deprecated');
  }
  if (item.type && item.type !== 'groupMarker') {
    metadata.push(formatTypeLabel(item.type));
  }

  if (metadata.length > 0) {
    result += ` *(${metadata.join(', ')})*`;
  }

  return result + '\n';
}

function groupByType(symbols: IndexItem[]): Record<string, IndexItem[]> {
  const groups: Record<string, IndexItem[]> = {};

  for (const symbol of symbols) {
    if (!groups[symbol.type]) {
      groups[symbol.type] = [];
    }
    groups[symbol.type].push(symbol);
  }

  return groups;
}

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
    'func': 'Function',
    'var': 'Variable',
    'let': 'Constant',
    'operator': 'Operator',
    'macro': 'Macro',
    'namespace': 'Namespace',
  };

  return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function matchesPattern(name: string, pattern: string): boolean {
  const regexPattern = pattern
    .split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(name);
}

function findCollections(items: IndexItem[]): IndexItem[] {
  const collections: IndexItem[] = [];

  function search(itemList: IndexItem[]) {
    for (const item of itemList) {
      if (item.type === 'collection') {
        collections.push(item);
      }
      if (item.children) {
        search(item.children);
      }
    }
  }

  search(items);
  return collections;
}