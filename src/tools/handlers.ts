/**
 * Tool handlers for Apple Developer Documentation MCP Server
 */

import {
  searchAppleDocsSchema,
  getAppleDocContentSchema,
  listTechnologiesSchema,
  searchFrameworkSymbolsSchema,
  getRelatedApisSchema,
  resolveReferencesBatchSchema,
  getPlatformCompatibilitySchema,
  findSimilarApisSchema,
  getDocumentationUpdatesSchema,
  getTechnologyOverviewsSchema,
  getSampleCodeSchema,
} from '../schemas/index.js';

/**
 * Tool handler function type
 */
export type ToolHandler = (
  args: unknown,
  server: any
) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

/**
 * Map of tool names to their handlers
 */
export const toolHandlers: Record<string, ToolHandler> = {
  get_performance_report: async () => {
    const { httpClient } = await import('../utils/http-client.js');
    const { getCacheWarmUpStatus } = await import('../utils/cache-warmer.js');
    const { getPreloadStats } = await import('../utils/preloader.js');
    const { globalRateLimiter } = await import('../utils/rate-limiter.js');
    
    let report = '# Performance Report\n\n';
    
    // HTTP Client Performance
    report += httpClient.getPerformanceReport();
    report += '\n\n';
    
    // Cache Warm-up Status
    const warmUpStatus = getCacheWarmUpStatus();
    report += '## Cache Warm-up Status\n\n';
    report += `- **Total Cache Entries:** ${warmUpStatus.totalCacheEntries}\n`;
    report += `- **API Cache:** ${warmUpStatus.apiCacheSize} entries\n`;
    report += `- **Technologies Cache:** ${warmUpStatus.technologiesCacheSize} entries\n`;
    report += `- **Updates Cache:** ${warmUpStatus.updatesCacheSize} entries\n`;
    report += `- **Overviews Cache:** ${warmUpStatus.overviewsCacheSize} entries\n\n`;
    
    // Framework Preload Status
    const preloadStats = getPreloadStats();
    report += '## Framework Preload Status\n\n';
    report += `- **Preloaded Frameworks:** ${preloadStats.preloadedFrameworks.join(', ')}\n`;
    report += `- **Index Cache Hit Rate:** ${preloadStats.cacheHitRate}\n\n`;
    
    // Rate Limiter Status
    const rateLimiterStats = globalRateLimiter.getStats();
    report += '## Rate Limiter Status\n\n';
    report += `- **Current Requests:** ${rateLimiterStats.currentRequests}/${rateLimiterStats.maxRequests}\n`;
    report += `- **Utilization:** ${rateLimiterStats.utilizationRate}\n`;
    report += `- **Window:** ${rateLimiterStats.windowMs / 1000}s\n`;
    
    return {
      content: [
        {
          type: 'text',
          text: report,
        },
      ],
    };
  },
  
  get_cache_stats: async () => {
    const { apiCache, searchCache, indexCache, technologiesCache, updatesCache, sampleCodeCache, technologyOverviewsCache } = await import('../utils/cache.js');
    
    const stats = {
      apiCache: apiCache.getStats(),
      searchCache: searchCache.getStats(),
      indexCache: indexCache.getStats(),
      technologiesCache: technologiesCache.getStats(),
      updatesCache: updatesCache.getStats(),
      sampleCodeCache: sampleCodeCache.getStats(),
      technologyOverviewsCache: technologyOverviewsCache.getStats(),
    };
    
    let report = '# Cache Statistics Report\n\n';
    
    Object.entries(stats).forEach(([name, stat]) => {
      report += `## ${name}\n`;
      report += `- Size: ${stat.size}/${stat.maxSize}\n`;
      report += `- Hit Rate: ${stat.hitRate}\n`;
      report += `- Hits: ${stat.hits}\n`;
      report += `- Misses: ${stat.misses}\n\n`;
    });
    
    return {
      content: [
        {
          type: 'text',
          text: report,
        },
      ],
    };
  },

  search_apple_docs: async (args, server) => {
    const validatedArgs = searchAppleDocsSchema.parse(args);
    return await server.searchAppleDocs(validatedArgs.query, validatedArgs.type);
  },

  get_apple_doc_content: async (args, server) => {
    const validatedArgs = getAppleDocContentSchema.parse(args);
    return await server.getAppleDocContent(
      validatedArgs.url,
      validatedArgs.includeRelatedApis,
      validatedArgs.includeReferences,
      validatedArgs.includeSimilarApis,
      validatedArgs.includePlatformAnalysis,
    );
  },

  list_technologies: async (args, server) => {
    const validatedArgs = listTechnologiesSchema.parse(args);
    return await server.listTechnologies(
      validatedArgs.category,
      validatedArgs.language,
      validatedArgs.includeBeta,
    );
  },

  search_framework_symbols: async (args, server) => {
    const validatedArgs = searchFrameworkSymbolsSchema.parse(args);
    return await server.searchFrameworkSymbols(
      validatedArgs.framework,
      validatedArgs.symbolType,
      validatedArgs.namePattern,
      validatedArgs.language,
      validatedArgs.limit,
    );
  },

  get_related_apis: async (args, server) => {
    const validatedArgs = getRelatedApisSchema.parse(args);
    return await server.getRelatedApis(
      validatedArgs.apiUrl,
      validatedArgs.includeInherited,
      validatedArgs.includeConformance,
      validatedArgs.includeSeeAlso,
    );
  },

  resolve_references_batch: async (args, server) => {
    const validatedArgs = resolveReferencesBatchSchema.parse(args);
    return await server.resolveReferencesBatch(
      validatedArgs.sourceUrl,
      validatedArgs.maxReferences,
      validatedArgs.filterByType,
    );
  },

  get_platform_compatibility: async (args, server) => {
    const validatedArgs = getPlatformCompatibilitySchema.parse(args);
    return await server.getPlatformCompatibility(
      validatedArgs.apiUrl,
      validatedArgs.compareMode,
      validatedArgs.includeRelated,
    );
  },

  find_similar_apis: async (args, server) => {
    const validatedArgs = findSimilarApisSchema.parse(args);
    return await server.findSimilarApis(
      validatedArgs.apiUrl,
      validatedArgs.searchDepth,
      validatedArgs.filterByCategory,
      validatedArgs.includeAlternatives,
    );
  },

  get_documentation_updates: async (args, server) => {
    const validatedArgs = getDocumentationUpdatesSchema.parse(args);
    return await server.getDocumentationUpdates(
      validatedArgs.category,
      validatedArgs.technology,
      validatedArgs.year,
      validatedArgs.searchQuery,
      validatedArgs.includeBeta,
      validatedArgs.limit,
    );
  },

  get_technology_overviews: async (args, server) => {
    const validatedArgs = getTechnologyOverviewsSchema.parse(args);
    return await server.getTechnologyOverviews(
      validatedArgs.category,
      validatedArgs.platform,
      validatedArgs.searchQuery,
      validatedArgs.includeSubcategories,
      validatedArgs.limit,
    );
  },

  get_sample_code: async (args, server) => {
    const validatedArgs = getSampleCodeSchema.parse(args);
    return await server.getSampleCode(
      validatedArgs.framework,
      validatedArgs.beta,
      validatedArgs.searchQuery,
      validatedArgs.limit,
    );
  },
};

/**
 * Handle tool call with the appropriate handler
 */
export async function handleToolCall(
  toolName: string,
  args: unknown,
  server: any,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return await handler(args, server) as { content: Array<{ type: string; text: string }>; isError?: boolean };
}