/**
 * Search and indexing related types
 */

/**
 * Apple documentation search result
 */
export interface AppleDocSearchResult {
  title: string;
  url: string;
  description: string;
  type: string;
  platform?: string;
  isBeta?: boolean;
  isDeprecated?: boolean;
}

/**
 * Framework index structure
 */
export interface FrameworkIndex {
  interfaceLanguages: Record<string, unknown>;
  references?: Record<string, FrameworkReference>;
  relationships?: {
    modules?: Array<{
      title?: string;
      children?: IndexItem[];
    }>;
  };
}

/**
 * Framework reference item
 */
export interface FrameworkReference {
  title: string;
  url: string;
  type?: string;
  abstract?: unknown[];
  fragments?: Array<{
    kind: string;
    text: string;
  }>;
}

/**
 * Index item in framework hierarchy
 */
export interface IndexItem {
  title: string;
  type: string;
  path?: string;
  children?: IndexItem[];
}

/**
 * Symbol search result
 */
export interface SymbolSearchResult {
  name: string;
  type: string;
  path: string;
  framework: string;
  language: string;
  abstract?: string;
}