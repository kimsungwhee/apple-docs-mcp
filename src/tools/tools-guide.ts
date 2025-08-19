/**
 * Tool Selection Guide for Apple Docs MCP
 *
 * This guide helps AI assistants choose the right tool for each task
 * and understand tool relationships and best practices.
 */

/**
 * Tool Categories and Primary Use Cases
 */
export const TOOL_CATEGORIES = {
  /**
   * Search and Discovery Tools
   * Use these to find information
   */
  SEARCH: {
    tools: ['search_apple_docs', 'search_wwdc_content'],
    description: 'Primary tools for finding APIs, documentation, and video content',
    whenToUse: [
      'User asks about a specific API or framework',
      'User wants to find documentation on a topic',
      'User is looking for code examples or implementations',
    ],
  },

  /**
   * Browse and Explore Tools
   * Use these to discover what's available
   */
  BROWSE: {
    tools: ['list_technologies', 'search_framework_symbols', 'get_sample_code', 'list_wwdc_videos', 'browse_wwdc_topics'],
    description: 'Tools for exploring available frameworks, APIs, and content',
    whenToUse: [
      'User wants to know what frameworks are available',
      'User wants to explore APIs in a specific framework',
      'User is browsing for examples or learning materials',
    ],
  },

  /**
   * Deep Dive Tools
   * Use these to get detailed information
   */
  DETAILS: {
    tools: ['get_apple_doc_content', 'get_wwdc_video'],
    description: 'Tools for reading full documentation or video content',
    whenToUse: [
      'After finding content with search tools',
      'User wants complete API documentation',
      'User wants to read WWDC session transcript',
    ],
  },

  /**
   * Analysis Tools
   * Use these to understand relationships and compatibility
   */
  ANALYSIS: {
    tools: ['get_related_apis', 'resolve_references_batch', 'get_platform_compatibility', 'find_similar_apis', 'find_related_wwdc_videos'],
    description: 'Tools for analyzing API relationships, compatibility, and alternatives',
    whenToUse: [
      'User needs to understand API inheritance or protocols',
      'User wants to check platform/version compatibility',
      'User is looking for alternative or better APIs',
    ],
  },

  /**
   * Stay Current Tools
   * Use these to track updates and changes
   */
  UPDATES: {
    tools: ['get_documentation_updates', 'get_technology_overviews'],
    description: 'Tools for staying up-to-date with Apple platform changes',
    whenToUse: [
      'User wants to know what\'s new',
      'User is tracking API changes',
      'User wants overview of technology areas',
    ],
  },
};

/**
 * Recommended Tool Workflows
 */
export const TOOL_WORKFLOWS = {
  /**
   * Learning a New Framework
   */
  LEARN_FRAMEWORK: {
    steps: [
      { tool: 'list_technologies', purpose: 'Find the framework identifier' },
      { tool: 'search_framework_symbols', purpose: 'Explore available APIs' },
      { tool: 'get_technology_overviews', purpose: 'Read conceptual guides' },
      { tool: 'get_sample_code', purpose: 'Find example projects' },
      { tool: 'list_wwdc_videos', purpose: 'Find relevant sessions' },
    ],
  },

  /**
   * Understanding an API
   */
  UNDERSTAND_API: {
    steps: [
      { tool: 'search_apple_docs', purpose: 'Find the API' },
      { tool: 'get_apple_doc_content', purpose: 'Read full documentation' },
      { tool: 'get_related_apis', purpose: 'Understand relationships' },
      { tool: 'get_platform_compatibility', purpose: 'Check availability' },
      { tool: 'find_similar_apis', purpose: 'Find alternatives' },
    ],
  },

  /**
   * Finding Code Examples
   */
  FIND_EXAMPLES: {
    steps: [
      { tool: 'search_apple_docs', purpose: 'Find code snippets in docs' },
      { tool: 'get_sample_code', purpose: 'Find complete sample projects' },
      { tool: 'search_wwdc_content', purpose: 'Search WWDC code examples' },
      { tool: 'get_wwdc_code_examples', purpose: 'Browse all WWDC code' },
    ],
  },

  /**
   * WWDC Content Discovery
   */
  WWDC_DISCOVERY: {
    steps: [
      { tool: 'list_wwdc_videos', purpose: 'Browse available sessions' },
      { tool: 'browse_wwdc_topics', purpose: 'Explore by topic' },
      { tool: 'search_wwdc_content', purpose: 'Search specific content' },
      { tool: 'get_wwdc_video', purpose: 'Read full transcript' },
      { tool: 'find_related_wwdc_videos', purpose: 'Find related sessions' },
    ],
  },
};

/**
 * Tool Selection Decision Tree
 */
export function selectToolForQuery(query: string): string[] {
  const queryLower = query.toLowerCase();
  const recommendedTools: string[] = [];

  // Search queries
  if (queryLower.includes('search') || queryLower.includes('find')) {
    if (queryLower.includes('video') || queryLower.includes('wwdc')) {
      recommendedTools.push('search_wwdc_content');
    } else {
      recommendedTools.push('search_apple_docs');
    }
  }

  // Browse/list queries
  if (queryLower.includes('list') || queryLower.includes('browse') || queryLower.includes('show all')) {
    if (queryLower.includes('framework') || queryLower.includes('technolog')) {
      recommendedTools.push('list_technologies');
    } else if (queryLower.includes('video') || queryLower.includes('wwdc')) {
      recommendedTools.push('list_wwdc_videos');
    } else if (queryLower.includes('sample') || queryLower.includes('example')) {
      recommendedTools.push('get_sample_code');
    }
  }

  // API analysis queries
  if (queryLower.includes('inherit') || queryLower.includes('protocol') || queryLower.includes('conform')) {
    recommendedTools.push('get_related_apis');
  }

  if (queryLower.includes('platform') || queryLower.includes('compatibility') || queryLower.includes('available')) {
    recommendedTools.push('get_platform_compatibility');
  }

  if (queryLower.includes('alternative') || queryLower.includes('similar') || queryLower.includes('instead')) {
    recommendedTools.push('find_similar_apis');
  }

  // Update queries
  if (queryLower.includes('new') || queryLower.includes('update') || queryLower.includes('change')) {
    recommendedTools.push('get_documentation_updates');
  }

  return recommendedTools;
}

/**
 * Common Tool Combinations
 */
export const TOOL_COMBINATIONS = {
  // Search then read pattern
  SEARCH_AND_READ: ['search_apple_docs', 'get_apple_doc_content'],

  // Framework exploration pattern
  FRAMEWORK_EXPLORE: ['list_technologies', 'search_framework_symbols'],

  // WWDC discovery pattern
  WWDC_EXPLORE: ['list_wwdc_videos', 'get_wwdc_video'],

  // API analysis pattern
  API_ANALYSIS: ['get_related_apis', 'get_platform_compatibility', 'find_similar_apis'],

  // Code example pattern
  CODE_EXAMPLES: ['search_apple_docs', 'get_sample_code', 'get_wwdc_code_examples'],
};

/**
 * Tool Usage Tips
 */
export const USAGE_TIPS = {
  // Performance tips
  PERFORMANCE: [
    'Use specific search queries to get better results',
    'Set appropriate limits to avoid overwhelming output',
    'Use type filters when searching for specific kinds of APIs',
  ],

  // Accuracy tips
  ACCURACY: [
    'Framework names are case-sensitive in some tools',
    'Use list_technologies to get exact framework identifiers',
    'WWDC tools have offline data from 2020-2025',
  ],

  // Efficiency tips
  EFFICIENCY: [
    'Start with search/browse tools before detailed reads',
    'Use boolean flags to include only needed information',
    'Combine related tools in sequence for comprehensive results',
  ],
};