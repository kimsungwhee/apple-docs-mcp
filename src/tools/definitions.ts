/**
 * Tool definitions for Apple Developer Documentation MCP Server
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { searchFrameworkSymbolsTool } from './search-framework-symbols.js';

/**
 * All available tools
 */
export const toolDefinitions: Tool[] = [
  {
    name: 'search_apple_docs',
    description: 'Search Apple Developer Documentation for APIs, frameworks, guides, samples, and videos. Best for finding specific APIs, classes, or methods. For browsing sample code projects, consider using get_sample_code instead.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for Apple Developer Documentation. Tips: Use specific API names (e.g., "UIViewController"), framework names (e.g., "SwiftUI"), or technical terms. Avoid generic terms like "how to" or "tutorial".',
        },
        type: {
          type: 'string',
          enum: ['all', 'documentation', 'sample'],
          description: 'Type of content to filter (all=show all results, documentation=API references only, sample=code samples only). Note: "sample" returns individual code snippets, not full sample projects - use get_sample_code for browsing complete sample projects.',
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
  {
    name: 'get_documentation_updates',
    description: 'Get the latest Apple Developer Documentation updates, including WWDC announcements, technology updates, and release notes',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'wwdc', 'technology', 'release-notes'],
          description: 'Filter by update category (default: all)',
        },
        technology: {
          type: 'string',
          description: 'Filter by specific technology/framework name (e.g., SwiftUI, UIKit)',
        },
        year: {
          type: 'string',
          description: 'Filter WWDC by year (e.g., 2025, 2024)',
        },
        searchQuery: {
          type: 'string',
          description: 'Search for specific keywords in updates',
        },
        includeBeta: {
          type: 'boolean',
          description: 'Include beta features (default: true)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_technology_overviews',
    description: 'Get Apple Developer Technology Overviews - comprehensive guides for Apple platforms and technologies',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by specific category (e.g., "app-design-and-ui", "games", "ai-machine-learning")',
        },
        platform: {
          type: 'string',
          enum: ['all', 'ios', 'macos', 'watchos', 'tvos', 'visionos'],
          description: 'Filter by platform (default: all)',
        },
        searchQuery: {
          type: 'string',
          description: 'Search for specific keywords in overviews',
        },
        includeSubcategories: {
          type: 'boolean',
          description: 'Include subcategories and nested content (default: true)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_sample_code',
    description: 'Browse and search Apple Developer Sample Code Library. Note: Framework filtering may have limitations - some samples might be categorized under generic groups. For best results, try searching by keywords in addition to or instead of framework filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          description: 'Filter by framework name (case-insensitive). Common frameworks: SwiftUI, UIKit, Foundation, CoreML, ARKit, RealityKit, Core Data, Combine, StoreKit, CloudKit, HealthKit, MapKit, etc. Note: Some frameworks (e.g., WidgetKit, GameKit) may not have dedicated categories and their samples might appear under broader groups like "Graphics" or "Games". Try using searchQuery for better results with these frameworks.',
        },
        beta: {
          type: 'string',
          enum: ['include', 'exclude', 'only'],
          description: 'Beta sample handling (include=show all, exclude=hide beta, only=beta only). Default: include',
        },
        searchQuery: {
          type: 'string',
          description: 'Search keywords in sample titles, descriptions, or content. Can be combined with framework filter for more precise results. Examples: "animation", "widget", "game center", "machine learning". This often works better than framework filtering for finding specific types of samples.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: [],
    },
  },
];