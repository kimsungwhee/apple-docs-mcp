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
import { validateInput, createErrorResponse, ErrorType, createStandardErrorResponse } from './utils/error-handler.js';
import { httpClient } from './utils/http-client.js';
import { preloadPopularFrameworks } from './utils/preloader.js';
import { warmUpCaches, schedulePeriodicCacheRefresh } from './utils/cache-warmer.js';
import { logger } from './utils/logger.js';
import { API_LIMITS } from './utils/constants.js';

export default class AppleDeveloperDocsMCPServer {
  private server: Server;

  /**
   * Helper method to handle async operations with consistent error handling
   */
  private async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    try {
      const result = await operation();
      return {
        content: [
          {
            type: 'text' as const,
            text: result as string,
          },
        ],
      };
    } catch (error) {
      return createStandardErrorResponse(error, operationName);
    }
  }

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

        logger.error(`Tool ${name} failed:`, appError);

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

      logger.info(`Searching Apple docs for: ${query}`);

      // 获取搜索结果页面
      const html = await httpClient.getText(searchUrl);

      // 解析并返回搜索结果，传递type参数进行过滤
      return parseSearchResults(html, query, searchUrl, type);
    } catch (error) {
      return createStandardErrorResponse(error, 'searchAppleDocs');
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

      // fetchAppleDocJson 已经返回正确的MCP响应格式，直接返回
      return await fetchAppleDocJson(url, {
        includeRelatedApis,
        includeReferences,
        includeSimilarApis,
        includePlatformAnalysis,
      });
    } catch (error) {
      return createStandardErrorResponse(error, 'getAppleDocContent');
    }
  }

  public async listTechnologies(category?: string, language?: string, includeBeta: boolean = true) {
    return this.handleAsyncOperation(
      () => handleListTechnologies(category, language, includeBeta),
      'listTechnologies',
    );
  }

  public async searchFrameworkSymbols(framework: string, symbolType: string = 'all', namePattern?: string, language: string = 'swift', limit: number = API_LIMITS.DEFAULT_FRAMEWORK_SYMBOLS_LIMIT) {
    return this.handleAsyncOperation(
      () => searchFrameworkSymbols(framework, symbolType, namePattern, language, limit),
      'searchFrameworkSymbols',
    );
  }

  public async getRelatedApis(
    apiUrl: string,
    includeInherited: boolean = true,
    includeConformance: boolean = true,
    includeSeeAlso: boolean = true,
  ) {
    return this.handleAsyncOperation(
      () => handleGetRelatedApis(apiUrl, includeInherited, includeConformance, includeSeeAlso),
      'getRelatedApis',
    );
  }

  public async resolveReferencesBatch(sourceUrl: string, maxReferences: number = API_LIMITS.DEFAULT_REFERENCES_LIMIT, filterByType: string = 'all') {
    return this.handleAsyncOperation(
      () => handleResolveReferencesBatch(sourceUrl, maxReferences, filterByType),
      'resolveReferencesBatch',
    );
  }

  public async getPlatformCompatibility(apiUrl: string, compareMode: string = 'single', includeRelated: boolean = false) {
    return this.handleAsyncOperation(
      () => handleGetPlatformCompatibility(apiUrl, compareMode, includeRelated),
      'getPlatformCompatibility',
    );
  }

  public async findSimilarApis(
    apiUrl: string,
    searchDepth: string = 'medium',
    filterByCategory?: string,
    includeAlternatives: boolean = true,
  ) {
    return this.handleAsyncOperation(
      () => handleFindSimilarApis(apiUrl, searchDepth, filterByCategory, includeAlternatives),
      'findSimilarApis',
    );
  }

  public async getDocumentationUpdates(
    category: string = 'all',
    technology?: string,
    year?: string,
    searchQuery?: string,
    includeBeta: boolean = true,
    limit: number = API_LIMITS.DEFAULT_DOCUMENTATION_UPDATES_LIMIT,
  ) {
    return this.handleAsyncOperation(
      () => handleGetDocumentationUpdates(category, technology, year, searchQuery, includeBeta, limit),
      'getDocumentationUpdates',
    );
  }

  public async getTechnologyOverviews(
    category?: string,
    platform: string = 'all',
    searchQuery?: string,
    includeSubcategories: boolean = true,
    limit: number = API_LIMITS.DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT,
  ) {
    return this.handleAsyncOperation(
      () => handleGetTechnologyOverviews(category, platform, searchQuery, includeSubcategories, limit),
      'getTechnologyOverviews',
    );
  }

  public async getSampleCode(
    framework?: string,
    beta: 'include' | 'exclude' | 'only' = 'include',
    searchQuery?: string,
    limit: number = API_LIMITS.DEFAULT_SAMPLE_CODE_LIMIT,
  ) {
    return this.handleAsyncOperation(
      () => handleGetSampleCode(framework, beta, searchQuery, limit),
      'getSampleCode',
    );
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
      logger.error('Unhandled Rejection, reason:', reason);
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Apple Developer Docs MCP server running on stdio');
    logger.info('Cache system initialized with TTL: API(30m), Index(1h), Technologies(2h)');
    logger.info('Note: Search results are not cached to ensure real-time accuracy');

    // Start framework preloading and cache warming in background
    Promise.all([
      preloadPopularFrameworks(),
      warmUpCaches(),
    ]).catch(error => {
      logger.error('Background initialization failed:', error);
    });

    // Schedule periodic cache refresh (every 30 minutes)
    schedulePeriodicCacheRefresh();
  }
}

// 运行服务器 (仅在非测试环境中)
if (process.env.NODE_ENV !== 'test') {
  const server = new AppleDeveloperDocsMCPServer();
  void server.run().catch((error) => {
    logger.error('Fatal error in main():', error);
    process.exit(1);
  });
}