#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { parseSearchResults } from './tools/search-parser.js';
import { fetchAppleDocJson } from './tools/doc-fetcher.js';
import { handleListTechnologies } from './tools/list-technologies.js';
import { searchFrameworkSymbols, searchFrameworkSymbolsTool } from './tools/search-framework-symbols.js';
import { handleGetRelatedApis } from './tools/get-related-apis.js';
import { handleResolveReferencesBatch } from './tools/resolve-references-batch.js';
import { handleGetPlatformCompatibility } from './tools/get-platform-compatibility.js';
import { handleFindSimilarApis } from './tools/find-similar-apis.js';
import { APPLE_URLS } from './utils/constants.js';
import { isValidAppleDeveloperUrl } from './utils/url-converter.js';
import { validateInput, createErrorResponse, handleFetchError } from './utils/error-handler.js';
import { httpClient } from './utils/http-client.js';

class AppleDeveloperDocsMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'apple-docs-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools() {
    // 定义 Zod 验证模式
    const searchAppleDocsSchema = z.object({
      query: z.string().describe('Search query for Apple Developer Documentation'),
      type: z.enum(['all', 'documentation', 'sample']).default('all')
        .describe('Type of content to search for (documentation=API reference, sample=code samples)'),
    });

    const getAppleDocContentSchema = z.object({
      url: z.string().describe('URL of the Apple Developer Documentation page'),
      includeRelatedApis: z.boolean().default(false).describe('Include related APIs analysis'),
      includeReferences: z.boolean().default(false).describe('Include references resolution'),
      includeSimilarApis: z.boolean().default(false).describe('Include similar APIs discovery'),
      includePlatformAnalysis: z.boolean().default(false).describe('Include platform compatibility analysis'),
    });

    const listTechnologiesSchema = z.object({
      category: z.string().optional().describe('Filter by technology category'),
      language: z.enum(['swift', 'occ']).optional().describe('Filter by programming language'),
      includeBeta: z.boolean().default(true).describe('Include beta technologies'),
    });

    const searchFrameworkSymbolsSchema = z.object({
      framework: z.string().describe('Framework name (e.g., "swiftui", "uikit", "foundation")'),
      symbolType: z.enum(['all', 'class', 'struct', 'enum', 'protocol', 'method', 'property', 'init', 'func', 'var', 'let', 'typealias']).default('all').describe('Type of symbol to search for'),
      namePattern: z.string().optional().describe('Optional name pattern to filter results (supports * wildcard)'),
      language: z.enum(['swift', 'occ']).default('swift').describe('Programming language'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of results to return'),
    });

    const getRelatedApisSchema = z.object({
      apiUrl: z.string().describe('The Apple Developer Documentation API URL to find related APIs for'),
      includeInherited: z.boolean().default(true).describe('Include inherited APIs'),
      includeConformance: z.boolean().default(true).describe('Include conformance relationships'),
      includeSeeAlso: z.boolean().default(true).describe('Include "See Also" related APIs'),
    });

    const resolveReferencesBatchSchema = z.object({
      sourceUrl: z.string().describe('The Apple Developer Documentation URL to extract and resolve references from'),
      maxReferences: z.number().min(1).max(50).default(20).describe('Maximum number of references to resolve'),
      filterByType: z.enum(['all', 'symbol', 'collection', 'article', 'protocol', 'class', 'struct', 'enum']).default('all').describe('Filter references by type'),
    });

    const getPlatformCompatibilitySchema = z.object({
      apiUrl: z.string().describe('The Apple Developer Documentation API URL to analyze platform compatibility for'),
      compareMode: z.enum(['single', 'framework']).default('single').describe('Analysis mode: single API or entire framework comparison'),
      includeRelated: z.boolean().default(false).describe('Include platform compatibility of related APIs'),
    });

    const findSimilarApisSchema = z.object({
      apiUrl: z.string().describe('The Apple Developer Documentation API URL to find similar APIs for'),
      searchDepth: z.enum(['shallow', 'medium', 'deep']).default('medium').describe('Search depth for similarity analysis'),
      filterByCategory: z.string().optional().describe('Filter results by category/topic'),
      includeAlternatives: z.boolean().default(true).describe('Include alternative APIs from the same topic section'),
    });

    // const cacheStatsSchema = z.object({});

    // 处理工具列表请求
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_apple_docs',
            description: 'Search Apple Developer Documentation for APIs, frameworks, guides, samples, and videos',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for Apple Developer Documentation',
                },
                type: {
                  type: 'string',
                  enum: ['all', 'documentation', 'sample'],
                  description: 'Type of content to filter (all=show all results, documentation=API references only, sample=code samples only)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_apple_doc_content',
            description: 'Get detailed content from a specific Apple Developer Documentation page with optional enhanced analysis (related APIs, references, similar APIs, platform compatibility)',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL of the Apple Developer Documentation page',
                },
                includeRelatedApis: {
                  type: 'boolean',
                  description: 'Include related APIs analysis (default: false)',
                },
                includeReferences: {
                  type: 'boolean',
                  description: 'Include references resolution (default: false)',
                },
                includeSimilarApis: {
                  type: 'boolean',
                  description: 'Include similar APIs discovery (default: false)',
                },
                includePlatformAnalysis: {
                  type: 'boolean',
                  description: 'Include platform compatibility analysis (default: false)',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'list_technologies',
            description: 'List all available Apple Developer technologies and frameworks, organized by category',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by technology category (optional)',
                },
                language: {
                  type: 'string',
                  enum: ['swift', 'occ'],
                  description: 'Filter by programming language (optional)',
                },
                includeBeta: {
                  type: 'boolean',
                  description: 'Include beta technologies (default: true)',
                },
              },
              required: [],
            },
          },
          searchFrameworkSymbolsTool,
          {
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
          },
          {
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
          },
          {
            name: 'get_platform_compatibility',
            description: 'Analyze platform compatibility for Apple Developer APIs, showing version support, beta status, and deprecation information across different platforms',
            inputSchema: {
              type: 'object',
              properties: {
                apiUrl: {
                  type: 'string',
                  description: 'The Apple Developer Documentation API URL to analyze platform compatibility for',
                },
                compareMode: {
                  type: 'string',
                  enum: ['single', 'framework'],
                  description: 'Analysis mode: single API or entire framework comparison (default: single)',
                },
                includeRelated: {
                  type: 'boolean',
                  description: 'Include platform compatibility of related APIs (default: false)',
                },
              },
              required: ['apiUrl'],
            },
          },
          {
            name: 'find_similar_apis',
            description: 'Find similar and related APIs based on Apple\'s official recommendations, including "See Also" sections and topic groupings',
            inputSchema: {
              type: 'object',
              properties: {
                apiUrl: {
                  type: 'string',
                  description: 'The Apple Developer Documentation API URL to find similar APIs for',
                },
                searchDepth: {
                  type: 'string',
                  enum: ['shallow', 'medium', 'deep'],
                  description: 'Search depth: shallow (direct references), medium (+ topic sections), deep (+ related APIs) (default: medium)',
                },
                filterByCategory: {
                  type: 'string',
                  description: 'Filter results by category/topic (optional)',
                },
                includeAlternatives: {
                  type: 'boolean',
                  description: 'Include alternative APIs from the same topic section (default: true)',
                },
              },
              required: ['apiUrl'],
            },
          },

        ],
      };
    });

    // 处理工具调用请求
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_apple_docs': {
            const validatedArgs = searchAppleDocsSchema.parse(args);
            return await this.searchAppleDocs(validatedArgs.query, validatedArgs.type);
          }
          case 'get_apple_doc_content': {
            const validatedArgs = getAppleDocContentSchema.parse(args);
            return await this.getAppleDocContent(
              validatedArgs.url,
              validatedArgs.includeRelatedApis,
              validatedArgs.includeReferences,
              validatedArgs.includeSimilarApis,
              validatedArgs.includePlatformAnalysis,
            );
          }
          case 'list_technologies': {
            const validatedArgs = listTechnologiesSchema.parse(args);
            return await this.listTechnologies(validatedArgs.category, validatedArgs.language, validatedArgs.includeBeta);
          }
          case 'search_framework_symbols': {
            const validatedArgs = searchFrameworkSymbolsSchema.parse(args);
            return await this.searchFrameworkSymbols(validatedArgs.framework, validatedArgs.symbolType, validatedArgs.namePattern, validatedArgs.language, validatedArgs.limit);
          }
          case 'get_related_apis': {
            const validatedArgs = getRelatedApisSchema.parse(args);
            return await this.getRelatedApis(validatedArgs.apiUrl, validatedArgs.includeInherited, validatedArgs.includeConformance, validatedArgs.includeSeeAlso);
          }
          case 'resolve_references_batch': {
            const validatedArgs = resolveReferencesBatchSchema.parse(args);
            return await this.resolveReferencesBatch(validatedArgs.sourceUrl, validatedArgs.maxReferences, validatedArgs.filterByType);
          }
          case 'get_platform_compatibility': {
            const validatedArgs = getPlatformCompatibilitySchema.parse(args);
            return await this.getPlatformCompatibility(validatedArgs.apiUrl, validatedArgs.compareMode, validatedArgs.includeRelated);
          }
          case 'find_similar_apis': {
            const validatedArgs = findSimilarApisSchema.parse(args);
            return await this.findSimilarApis(validatedArgs.apiUrl, validatedArgs.searchDepth, validatedArgs.filterByCategory, validatedArgs.includeAlternatives);
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const appError = error instanceof Error
          ? { type: 'UNKNOWN' as const, message: error.message, originalError: error }
          : { type: 'UNKNOWN' as const, message: 'An unknown error occurred' };

        console.error(`Tool ${name} failed:`, appError);

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${appError.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async searchAppleDocs(query: string, type: string = 'all') {
    try {
      // 输入验证
      const queryValidation = validateInput(query, 'Search query');
      if (queryValidation) {
        return createErrorResponse(queryValidation);
      }

      // 创建 Apple Developer Documentation 搜索 URL
      const searchUrl = `${APPLE_URLS.SEARCH}?q=${encodeURIComponent(query)}`;

      console.error(`Searching Apple docs for: ${query}`);

      // 获取搜索结果页面
      const html = await httpClient.getText(searchUrl);

      // 解析并返回搜索结果，传递type参数进行过滤
      return parseSearchResults(html, query, searchUrl, type);
    } catch (error) {
      const appError = handleFetchError(error, `${APPLE_URLS.SEARCH}?q=${encodeURIComponent(query)}`);
      return createErrorResponse(appError);
    }
  }

  private async getAppleDocContent(
    url: string,
    includeRelatedApis: boolean = false,
    includeReferences: boolean = false,
    includeSimilarApis: boolean = false,
    includePlatformAnalysis: boolean = false,
  ) {
    try {
      // 输入验证
      const urlValidation = validateInput(url, 'URL');
      if (urlValidation) {
        return createErrorResponse(urlValidation);
      }

      // 验证是否为有效的Apple Developer URL
      if (!isValidAppleDeveloperUrl(url)) {
        return createErrorResponse({
          type: 'INVALID_INPUT' as any,
          message: 'URL must be from developer.apple.com',
          suggestions: [
            'Ensure the URL starts with https://developer.apple.com',
            'Check that the URL is a valid Apple Developer Documentation link',
          ],
        });
      }

      // 使用增强的 JSON 获取方法来获取文档内容
      return fetchAppleDocJson(url, {
        includeRelatedApis,
        includeReferences,
        includeSimilarApis,
        includePlatformAnalysis,
      });
    } catch (error) {
      const appError = handleFetchError(error, url);
      return createErrorResponse(appError);
    }
  }

  private async listTechnologies(category?: string, language?: string, includeBeta: boolean = true) {
    try {
      const result = await handleListTechnologies(category, language, includeBeta);
      return {
        content: [
          {
            type: 'text' as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Failed to list technologies: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async searchFrameworkSymbols(framework: string, symbolType: string = 'all', namePattern?: string, language: string = 'swift', limit: number = 50) {
    try {
      const result = await searchFrameworkSymbols(framework, symbolType, namePattern, language, limit);
      return {
        content: [
          {
            type: 'text' as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Failed to search framework symbols: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getRelatedApis(apiUrl: string, includeInherited: boolean = true, includeConformance: boolean = true, includeSeeAlso: boolean = true) {
    try {
      const result = await handleGetRelatedApis(apiUrl, includeInherited, includeConformance, includeSeeAlso);
      return {
        content: [
          {
            type: 'text' as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Failed to get related APIs: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async resolveReferencesBatch(sourceUrl: string, maxReferences: number = 20, filterByType: string = 'all') {
    try {
      const result = await handleResolveReferencesBatch(sourceUrl, maxReferences, filterByType);
      return {
        content: [
          {
            type: 'text' as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Failed to resolve references: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getPlatformCompatibility(apiUrl: string, compareMode: string = 'single', includeRelated: boolean = false) {
    try {
      const result = await handleGetPlatformCompatibility(apiUrl, compareMode, includeRelated);
      return {
        content: [
          {
            type: 'text' as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Failed to analyze platform compatibility: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async findSimilarApis(
    apiUrl: string,
    searchDepth: string = 'medium',
    filterByCategory?: string,
    includeAlternatives: boolean = true,
  ) {
    try {
      const result = await handleFindSimilarApis(apiUrl, searchDepth, filterByCategory, includeAlternatives);
      return {
        content: [
          {
            type: 'text' as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Failed to find similar APIs: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }



  private setupErrorHandling() {
    // 处理 SIGINT 以优雅关闭服务器
    process.on('SIGINT', () => {
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      process.exit(0);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection, reason:', reason);
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Apple Developer Docs MCP server running on stdio');
    console.error('Cache system initialized with TTL: API(30m), Index(1h), Technologies(2h)');
    console.error('Note: Search results are not cached to ensure real-time accuracy');
  }
}

// 运行服务器
const server = new AppleDeveloperDocsMCPServer();
void server.run().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});