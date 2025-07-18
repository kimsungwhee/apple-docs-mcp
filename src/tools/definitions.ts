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
    description: 'Search Apple Developer Documentation for APIs, frameworks, guides, and samples. Best for finding specific APIs, classes, or methods. For browsing sample code projects, use get_sample_code. For WWDC videos, use the dedicated WWDC tools (list_wwdc_videos, search_wwdc_content).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for Apple Developer Documentation. Tips: Use specific API names (e.g., "UIViewController"), framework names (e.g., "SwiftUI"), or technical terms. Avoid generic terms like "how to" or "tutorial". Examples: "NSPredicate", "SwiftUI List", "Core Data migration", "URLSession authentication".',
        },
        type: {
          type: 'string',
          enum: ['all', 'documentation', 'sample'],
          description: 'Type of content to filter. Use "all" for comprehensive results, "documentation" for API references/guides, "sample" for code snippets. Note: "sample" returns individual code examples, not full projects. For complete sample projects, use get_sample_code instead. Default: "all".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_apple_doc_content',
    description: 'Get detailed content from a specific Apple Developer Documentation page. Use this after search_apple_docs to get full documentation. Supports enhanced analysis options for comprehensive API understanding. Best for: reading API details, understanding usage, checking availability.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL of the Apple Developer Documentation page. Must start with https://developer.apple.com/documentation/. Example: "https://developer.apple.com/documentation/uikit/uiviewcontroller"',
        },
        includeRelatedApis: {
          type: 'boolean',
          description: 'Include inheritance hierarchy and protocol conformances. Useful for understanding API relationships. Default: false',
        },
        includeReferences: {
          type: 'boolean',
          description: 'Resolve and include all referenced types and APIs. Helps understand dependencies. Default: false',
        },
        includeSimilarApis: {
          type: 'boolean',
          description: 'Discover APIs with similar functionality. Great for finding alternatives. Default: false',
        },
        includePlatformAnalysis: {
          type: 'boolean',
          description: 'Analyze platform availability and version requirements. Essential for cross-platform development. Default: false',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'list_technologies',
    description: 'Browse all Apple technologies and frameworks by category. Essential for discovering available frameworks and understanding Apple\'s technology ecosystem. Use this when: exploring what\'s available, finding framework identifiers for search_framework_symbols, checking beta status.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (case-sensitive). Popular: "App frameworks" (SwiftUI, UIKit), "Graphics and games" (Metal, SpriteKit), "App services" (CloudKit, StoreKit), "Media" (AVFoundation), "System" (Foundation). Leave empty to see all categories.',
        },
        language: {
          type: 'string',
          enum: ['swift', 'occ'],
          description: 'Filter by language support. "swift" for Swift-compatible frameworks, "occ" for Objective-C. Leave empty for all.',
        },
        includeBeta: {
          type: 'boolean',
          description: 'Include beta/preview technologies. Set to false to see only stable frameworks. Default: true',
        },
        limit: {
          type: 'number',
          description: 'Max results per category. Useful for quick overviews. Default: 200',
        },
      },
      required: [],
    },
  },
  searchFrameworkSymbolsTool,
  {
    name: 'get_related_apis',
    description: 'Analyze API relationships and discover related functionality. Shows inheritance, protocol conformances, and Apple\'s recommended alternatives. Essential for understanding how APIs work together. Use when: learning API hierarchy, finding protocol requirements, discovering related functionality.',
    inputSchema: {
      type: 'object',
      properties: {
        apiUrl: {
          type: 'string',
          description: 'Apple documentation URL to analyze. Example: "https://developer.apple.com/documentation/uikit/uiview"',
        },
        includeInherited: {
          type: 'boolean',
          description: 'Show inherited methods/properties from superclasses. Helps understand full API surface. Default: true',
        },
        includeConformance: {
          type: 'boolean',
          description: 'Show protocol conformances and requirements. Essential for protocol-oriented programming. Default: true',
        },
        includeSeeAlso: {
          type: 'boolean',
          description: 'Show Apple\'s recommended related APIs. Great for finding better alternatives or complementary APIs. Default: true',
        },
      },
      required: ['apiUrl'],
    },
  },
  {
    name: 'resolve_references_batch',
    description: 'Deep dive into all types and APIs referenced in a documentation page. Resolves all mentioned types, methods, and properties to understand dependencies. Use when: analyzing complex APIs, understanding type requirements, exploring API ecosystems.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceUrl: {
          type: 'string',
          description: 'Documentation URL to analyze for references. Example: "https://developer.apple.com/documentation/swiftui/view"',
        },
        maxReferences: {
          type: 'number',
          description: 'Limit resolved references (default: 20, max: 50). Higher values = more comprehensive but slower.',
          minimum: 1,
          maximum: 50,
        },
        filterByType: {
          type: 'string',
          enum: ['all', 'symbol', 'collection', 'article', 'protocol', 'class', 'struct', 'enum'],
          description: 'Filter by reference type. Use "protocol" for protocol requirements, "class" for class hierarchies. Default: "all"',
        },
      },
      required: ['sourceUrl'],
    },
  },
  {
    name: 'get_platform_compatibility',
    description: 'Check API availability across Apple platforms and OS versions. Shows minimum deployment targets, deprecations, and platform-specific features. Critical for cross-platform development. Use when: planning app requirements, checking API availability, finding platform alternatives.',
    inputSchema: {
      type: 'object',
      properties: {
        apiUrl: {
          type: 'string',
          description: 'API URL to check compatibility. Example: "https://developer.apple.com/documentation/swiftui/list"',
        },
        compareMode: {
          type: 'string',
          enum: ['single', 'framework'],
          description: 'Check single API or entire framework. "framework" shows all APIs in the framework. Default: "single"',
        },
        includeRelated: {
          type: 'boolean',
          description: 'Also check related APIs\' compatibility. Useful for finding platform-specific alternatives. Default: false',
        },
      },
      required: ['apiUrl'],
    },
  },
  {
    name: 'find_similar_apis',
    description: 'Discover alternative and related APIs. Finds APIs with similar functionality, modern replacements for deprecated APIs, and platform-specific alternatives. Perfect when looking for better ways to implement functionality.',
    inputSchema: {
      type: 'object',
      properties: {
        apiUrl: {
          type: 'string',
          description: 'Starting API URL. Example: "https://developer.apple.com/documentation/uikit/uialertview" (finds modern alternatives)',
        },
        searchDepth: {
          type: 'string',
          enum: ['shallow', 'medium', 'deep'],
          description: 'How thoroughly to search. "shallow" = direct recommendations only, "medium" = topic siblings, "deep" = full relationship analysis. Default: "medium"',
        },
        filterByCategory: {
          type: 'string',
          description: 'Focus on specific functionality like "Animation", "Navigation", "Data". Case-sensitive partial match.',
        },
        includeAlternatives: {
          type: 'boolean',
          description: 'Include functionally similar APIs that might be better choices. Default: true',
        },
      },
      required: ['apiUrl'],
    },
  },
  {
    name: 'get_documentation_updates',
    description: 'Track latest Apple platform updates, new APIs, and changes. Shows WWDC announcements, framework updates, and release notes. Essential for staying current with Apple development. For detailed WWDC videos, use WWDC-specific tools.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'wwdc', 'technology', 'release-notes'],
          description: 'Update type filter. "wwdc" = conference highlights, "technology" = API updates, "release-notes" = version changes. Default: "all"',
        },
        technology: {
          type: 'string',
          description: 'Filter by framework (case-sensitive). Examples: "SwiftUI", "UIKit", "ARKit". Get names from list_technologies.',
        },
        year: {
          type: 'string',
          description: 'WWDC year filter ("2025", "2024", etc.). Only for wwdc category.',
        },
        searchQuery: {
          type: 'string',
          description: 'Search keywords. Examples: "async", "performance", "widgets". Case-insensitive.',
        },
        includeBeta: {
          type: 'boolean',
          description: 'Include beta/preview features. Default: true',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 50). Sorted by relevance and date.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_technology_overviews',
    description: 'Access comprehensive guides and tutorials for Apple technologies. Includes getting started guides, architectural overviews, best practices, and implementation patterns. Perfect for learning new frameworks or understanding Apple\'s recommended approaches.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Topic category. Popular: "app-design-and-ui", "games", "ai-machine-learning", "augmented-reality", "privacy-and-security". Leave empty to browse all.',
        },
        platform: {
          type: 'string',
          enum: ['all', 'ios', 'macos', 'watchos', 'tvos', 'visionos'],
          description: 'Target platform. "all" for cross-platform content. Default: "all"',
        },
        searchQuery: {
          type: 'string',
          description: 'Search terms. Try: "getting started", "best practices", "architecture", "performance".',
        },
        includeSubcategories: {
          type: 'boolean',
          description: 'Include nested topics for comprehensive results. Set false for overview only. Default: true',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 50). Includes subcategories when enabled.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_sample_code',
    description: 'Browse complete sample projects from Apple. Full working examples demonstrating best practices and implementation patterns. Different from search_apple_docs which returns code snippets. Use for learning by example.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          description: 'Framework filter (case-insensitive). Examples: "SwiftUI", "ARKit", "CoreML". Note: Some samples are under generic categories - use searchQuery for better results.',
        },
        beta: {
          type: 'string',
          enum: ['include', 'exclude', 'only'],
          description: 'Beta samples: "include" = all, "exclude" = stable only, "only" = beta only. Default: "include"',
        },
        searchQuery: {
          type: 'string',
          description: 'Search keywords. Most effective approach. Examples: "animation", "camera", "machine learning", "widgets".',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 50).',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_wwdc_videos',
    description: 'Browse WWDC session videos with full offline access to transcripts and code. Shows all available sessions with filtering options. Use this to discover WWDC content, find sessions by topic, or identify videos with code examples.',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'string',
          description: 'WWDC year ("2025", "2024", etc.) or "all". Available: 2020-2025. Example: "2025" for latest.',
        },
        topic: {
          type: 'string',
          description: 'Topic ID for exact filtering or keyword for title search. Available topic IDs: "accessibility-inclusion", "app-services", "app-store-distribution-marketing", "audio-video", "business-education", "design", "developer-tools", "essentials", "graphics-games", "health-fitness", "machine-learning-ai", "maps-location", "photos-camera", "privacy-security", "safari-web", "spatial-computing", "swift", "swiftui-ui-frameworks", "system-services". Use exact ID for topic filtering, or any keyword to search in video titles.',
        },
        hasCode: {
          type: 'boolean',
          description: 'Filter by code availability. true = sessions with code, false = without code. Leave empty for all.',
        },
        limit: {
          type: 'number',
          description: 'Max videos to show (default: 50). Videos include title, duration, and content indicators.',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_wwdc_content',
    description: 'Full-text search across all WWDC video transcripts and code examples. Find specific discussions, API mentions, or implementation examples. More powerful than list_wwdc_videos for finding specific content.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms. Examples: "async await", "@Observable", "Vision Pro", "performance optimization".',
        },
        searchIn: {
          type: 'string',
          enum: ['transcript', 'code', 'both'],
          description: 'Search scope. "transcript" = spoken content, "code" = code examples only, "both" = everything. Default: "both"',
        },
        year: {
          type: 'string',
          description: 'Limit to specific year ("2025", "2024", etc.). Leave empty for all years.',
        },
        language: {
          type: 'string',
          description: 'Code language filter ("swift", "objc", "javascript"). Only for code search.',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 20). Results include context snippets.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_wwdc_video',
    description: 'Access complete WWDC session content including full transcript, code examples, and resources. Use after finding videos with list_wwdc_videos or search_wwdc_content. Provides offline access to entire session content.',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'string',
          description: 'WWDC year. Example: "2025"',
        },
        videoId: {
          type: 'string',
          description: 'Session ID. Example: "10101" for keynote, "238" for session 238.',
        },
        includeTranscript: {
          type: 'boolean',
          description: 'Include full session transcript with timestamps. Default: true',
        },
        includeCode: {
          type: 'boolean',
          description: 'Include all code examples from the session. Default: true',
        },
      },
      required: ['year', 'videoId'],
    },
  },
  {
    name: 'get_wwdc_code_examples',
    description: 'Browse all code examples from WWDC sessions. Perfect for finding implementation patterns, seeing new API usage, or learning by example. Each result includes the code and its session context.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          description: 'Framework to find examples for. Examples: "SwiftUI", "SwiftData", "RealityKit".',
        },
        topic: {
          type: 'string',
          description: 'Topic ID or concept keyword. Can use exact topic IDs ("swiftui-ui-frameworks", "machine-learning-ai", etc.) for precise filtering, or general keywords like "animation", "performance", "concurrency" for broader search.',
        },
        year: {
          type: 'string',
          description: 'WWDC year filter ("2025", "2024", etc.).',
        },
        language: {
          type: 'string',
          description: 'Programming language: "swift", "objc", "javascript", "metal".',
        },
        limit: {
          type: 'number',
          description: 'Max examples (default: 30). Each includes code and source video info.',
        },
      },
      required: [],
    },
  },
  {
    name: 'browse_wwdc_topics',
    description: 'List all WWDC topic categories with their IDs. Essential first step before using list_wwdc_videos with topic filtering. Returns topic IDs like "swiftui-ui-frameworks" that can be used in other tools.',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to explore. Available IDs: "accessibility-inclusion", "app-services", "app-store-distribution-marketing", "audio-video", "business-education", "design", "developer-tools", "essentials", "graphics-games", "health-fitness", "machine-learning-ai", "maps-location", "photos-camera", "privacy-security", "safari-web", "spatial-computing", "swift", "swiftui-ui-frameworks", "system-services". Leave empty to see all topics with video counts.',
        },
        includeVideos: {
          type: 'boolean',
          description: 'List videos in the topic. Set false for topic structure only. Default: true',
        },
        year: {
          type: 'string',
          description: 'Filter topic videos by year. Only when browsing specific topic.',
        },
        limit: {
          type: 'number',
          description: 'Max videos per topic (default: 20).',
        },
      },
      required: [],
    },
  },
  {
    name: 'find_related_wwdc_videos',
    description: 'Discover WWDC sessions related to a specific video. Finds prerequisite sessions, follow-up content, and thematically similar talks. Essential for creating learning paths.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: {
          type: 'string',
          description: 'Source video ID. Example: "10101" for keynote.',
        },
        year: {
          type: 'string',
          description: 'Source video year. Example: "2025"',
        },
        includeExplicitRelated: {
          type: 'boolean',
          description: 'Include Apple\'s recommended related videos. Usually prerequisites or follow-ups. Default: true',
        },
        includeTopicRelated: {
          type: 'boolean',
          description: 'Include videos from same topic categories. Good for comprehensive learning. Default: true',
        },
        includeYearRelated: {
          type: 'boolean',
          description: 'Include other videos from same WWDC. Default: false',
        },
        limit: {
          type: 'number',
          description: 'Max related videos (default: 15).',
        },
      },
      required: ['videoId', 'year'],
    },
  },
];