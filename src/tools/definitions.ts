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
    description: 'List all available Apple Developer technologies and frameworks, organized by category. Returns structured information including framework names, identifiers, supported languages, and beta status.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by technology category. Common categories: "App frameworks" (SwiftUI, UIKit), "Graphics" (Metal, Core Graphics), "Games" (GameKit, SpriteKit), "Data and networking" (CloudKit, Network), "Machine learning" (Core ML, Create ML), "Media" (AVFoundation, Core Audio), "System" (Foundation, Combine). Case-sensitive.',
        },
        language: {
          type: 'string',
          enum: ['swift', 'occ'],
          description: 'Filter by programming language (swift = Swift, occ = Objective-C). Only shows technologies that support the specified language.',
        },
        includeBeta: {
          type: 'boolean',
          description: 'Include beta technologies (default: true). Beta status is determined by the presence of "Beta" in the tags field.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of technologies to return (default: 200). Results are limited per category group.',
        },
      },
      required: [],
    },
  },
  searchFrameworkSymbolsTool,
  {
    name: 'get_related_apis',
    description: 'Get related APIs for a specific Apple Developer Documentation API. Discovers inheritance hierarchies, protocol conformances, and Apple-recommended related APIs. Useful for understanding API relationships and finding alternatives.',
    inputSchema: {
      type: 'object',
      properties: {
        apiUrl: {
          type: 'string',
          description: 'The Apple Developer Documentation API URL to analyze. Must be a valid developer.apple.com documentation URL.',
        },
        includeInherited: {
          type: 'boolean',
          description: 'Include inherited APIs from parent classes/protocols (default: true). Shows methods, properties, and types inherited from superclasses.',
        },
        includeConformance: {
          type: 'boolean',
          description: 'Include protocol conformance relationships (default: true). Shows which protocols the type conforms to and required implementations.',
        },
        includeSeeAlso: {
          type: 'boolean',
          description: 'Include "See Also" related APIs (default: true). These are Apple-curated related APIs, often alternatives or complementary functionality.',
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
    description: 'Find similar and related APIs based on Apple\'s official recommendations. Analyzes "See Also" sections, topic groupings, and related documentation to suggest alternatives and complementary APIs. Great for discovering better or newer alternatives to APIs.',
    inputSchema: {
      type: 'object',
      properties: {
        apiUrl: {
          type: 'string',
          description: 'The Apple Developer Documentation API URL to find similar APIs for. Must be a valid developer.apple.com documentation URL.',
        },
        searchDepth: {
          type: 'string',
          enum: ['shallow', 'medium', 'deep'],
          description: 'Search depth controls how extensively to search. "shallow" = only direct "See Also" references (fastest), "medium" = includes APIs from the same topic sections, "deep" = also analyzes related APIs\' references (most comprehensive but slower). Default: medium',
        },
        filterByCategory: {
          type: 'string',
          description: 'Filter results by category/topic name. Useful to focus on specific aspects like "Animation", "Data Management", "User Interface", etc. Case-sensitive partial matching.',
        },
        includeAlternatives: {
          type: 'boolean',
          description: 'Include alternative APIs from the same topic section (default: true). These are APIs that serve similar purposes and might be better choices for specific use cases.',
        },
      },
      required: ['apiUrl'],
    },
  },
  {
    name: 'get_documentation_updates',
    description: 'Get the latest Apple Developer Documentation updates, organized by WWDC sessions, technology updates, and release notes. Great for tracking new features, API changes, and platform updates.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'wwdc', 'technology', 'release-notes'],
          description: 'Filter by update category. "wwdc" = WWDC session videos and content, "technology" = framework and API updates, "release-notes" = version-specific changes. Default: all',
        },
        technology: {
          type: 'string',
          description: 'Filter by specific technology/framework name. Use exact names like "SwiftUI", "UIKit", "Core Data", "ARKit", etc. Case-sensitive. Works best with official framework names from list_technologies.',
        },
        year: {
          type: 'string',
          description: 'Filter WWDC content by year (e.g., "2025", "2024", "2023"). Only applies when category is "wwdc" or "all". Format: 4-digit year.',
        },
        searchQuery: {
          type: 'string',
          description: 'Search for specific keywords in update titles and descriptions. Examples: "async", "performance", "widgets", "machine learning". Case-insensitive partial matching.',
        },
        includeBeta: {
          type: 'boolean',
          description: 'Include beta features and pre-release content (default: true). Beta content is identified by "Beta" tags in the metadata.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50). Results are sorted by relevance and recency.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_technology_overviews',
    description: 'Get Apple Developer Technology Overviews - comprehensive guides, tutorials, and best practices for Apple platforms and technologies. Includes getting started guides, conceptual overviews, and implementation guidance.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by specific category. Common categories: "app-design-and-ui" (UI/UX design), "games" (game development), "ai-machine-learning" (ML/AI), "augmented-reality" (AR/VR), "health-and-fitness", "privacy-and-security", "app-store-and-distribution", "developer-tools", "system-capabilities". Use exact category names for best results.',
        },
        platform: {
          type: 'string',
          enum: ['all', 'ios', 'macos', 'watchos', 'tvos', 'visionos'],
          description: 'Filter by platform. "all" returns cross-platform content. Platform-specific content includes UI guidelines, capabilities, and frameworks unique to each platform. Default: all',
        },
        searchQuery: {
          type: 'string',
          description: 'Search for specific keywords in overview titles and content. Examples: "getting started", "best practices", "performance", "accessibility", "localization". Searches in titles, descriptions, and content.',
        },
        includeSubcategories: {
          type: 'boolean',
          description: 'Include subcategories and nested content (default: true). When false, only returns top-level overviews. Useful for getting a high-level view of available topics.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50). Note: With includeSubcategories=true, nested content counts toward the limit.',
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