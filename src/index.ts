#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { parseSearchResults } from './tools/search-parser.js';
import { fetchAppleDocJson } from './tools/doc-fetcher.js';
import { handleListTechnologies } from './tools/list-technologies.js';
import { searchFrameworkSymbols } from './tools/search-framework-symbols.js';
import { toolDefinitions } from './tools/definitions.js';
import { handleToolCall } from './tools/handlers.js';
import { handleGetRelatedApis } from './tools/get-related-apis.js';
import { handleResolveReferencesBatch } from './tools/resolve-references-batch.js';
import { handleGetPlatformCompatibility } from './tools/get-platform-compatibility.js';
import { handleFindSimilarApis } from './tools/find-similar-apis.js';
import { handleGetDocumentationUpdates } from './tools/get-documentation-updates.js';
import { handleGetTechnologyOverviews } from './tools/get-technology-overviews.js';
import { handleGetSampleCode } from './tools/get-sample-code.js';
import { APPLE_URLS } from './utils/constants.js';
import { isValidAppleDeveloperUrl } from './utils/url-converter.js';
import { validateInput, createErrorResponse, handleFetchError, ErrorType } from './utils/error-handler.js';
import { httpClient } from './utils/http-client.js';
import { preloadPopularFrameworks } from './utils/preloader.js';
import { warmUpCaches, schedulePeriodicCacheRefresh } from './utils/cache-warmer.js';

export default class AppleDeveloperDocsMCPServer {
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
    // const cacheStatsSchema = z.object({});

    // 处理工具列表请求
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: toolDefinitions,
      };
    });

    // 处理工具调用请求
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        return await handleToolCall(name, args, this);
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

  public async searchAppleDocs(query: string, type: string = 'all') {
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

  public async getAppleDocContent(
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
          type: ErrorType.INVALID_INPUT,
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

  public async listTechnologies(category?: string, language?: string, includeBeta: boolean = true) {
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

  public async searchFrameworkSymbols(framework: string, symbolType: string = 'all', namePattern?: string, language: string = 'swift', limit: number = 50) {
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

  public async getRelatedApis(
    apiUrl: string,
    includeInherited: boolean = true,
    includeConformance: boolean = true,
    includeSeeAlso: boolean = true,
  ) {
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

  public async resolveReferencesBatch(sourceUrl: string, maxReferences: number = 20, filterByType: string = 'all') {
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

  public async getPlatformCompatibility(apiUrl: string, compareMode: string = 'single', includeRelated: boolean = false) {
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

  public async findSimilarApis(
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

  public async getDocumentationUpdates(
    category: string = 'all',
    technology?: string,
    year?: string,
    searchQuery?: string,
    includeBeta: boolean = true,
    limit: number = 50,
  ) {
    try {
      const result = await handleGetDocumentationUpdates(category, technology, year, searchQuery, includeBeta, limit);
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
            text: `Error: Failed to get documentation updates: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  public async getTechnologyOverviews(
    category?: string,
    platform: string = 'all',
    searchQuery?: string,
    includeSubcategories: boolean = true,
    limit: number = 50,
  ) {
    try {
      const result = await handleGetTechnologyOverviews(category, platform, searchQuery, includeSubcategories, limit);
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
            text: `Error: Failed to get technology overviews: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  public async getSampleCode(
    framework?: string,
    beta: 'include' | 'exclude' | 'only' = 'include',
    searchQuery?: string,
    limit: number = 50,
  ) {
    try {
      const result = await handleGetSampleCode(framework, beta, searchQuery, limit);
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
            text: `Error: Failed to get sample code: ${errorMessage}`,
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
    
    // Start framework preloading and cache warming in background
    Promise.all([
      preloadPopularFrameworks(),
      warmUpCaches(),
    ]).catch(error => {
      console.error('Background initialization failed:', error);
    });
    
    // Schedule periodic cache refresh (every 30 minutes)
    schedulePeriodicCacheRefresh();
  }
}

// 运行服务器 (仅在非测试环境中)
if (process.env.NODE_ENV !== 'test') {
  const server = new AppleDeveloperDocsMCPServer();
  void server.run().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}