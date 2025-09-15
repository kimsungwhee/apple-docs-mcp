/**
 * Configuration constants for Apple Docs MCP
 */

// API Limits
export const API_LIMITS = {
  MAX_SEARCH_RESULTS: 50,
  MAX_RELATED_APIS: 10,
  MAX_REFERENCES: 50,
  MAX_SIMILAR_APIS: 15,
  MAX_FRAMEWORK_DEPTH: 10,
  DEFAULT_FRAMEWORK_DEPTH: 3,

  // Default values for various operations
  DEFAULT_FRAMEWORK_SYMBOLS_LIMIT: 50,
  DEFAULT_DOCUMENTATION_UPDATES_LIMIT: 50,
  DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT: 50,
  DEFAULT_SAMPLE_CODE_LIMIT: 50,
  DEFAULT_TECHNOLOGIES_LIMIT: 200,
  DEFAULT_REFERENCES_LIMIT: 20,

  // Maximum values for schema validation
  MAX_FRAMEWORK_SYMBOLS_LIMIT: 200,
  MAX_DOCUMENTATION_UPDATES_LIMIT: 200,
  MAX_TECHNOLOGY_OVERVIEWS_LIMIT: 200,
  MAX_SAMPLE_CODE_LIMIT: 200,
  MAX_TECHNOLOGIES_LIMIT: 500,
  MAX_REFERENCES_LIMIT: 50,
} as const;

// Search Depth Configuration
export const SEARCH_DEPTH_LIMITS = {
  shallow: 5,
  medium: 10,
  deep: 15,
} as const;

// Cache TTL Configuration (in milliseconds)
export const CACHE_TTL = {
  API_DOCS: 30 * 60 * 1000,      // 30 minutes
  SEARCH_RESULTS: 10 * 60 * 1000, // 10 minutes
  FRAMEWORK_INDEX: 60 * 60 * 1000, // 1 hour
  TECHNOLOGIES: 2 * 60 * 60 * 1000, // 2 hours
  UPDATES: 30 * 60 * 1000, // 30 minutes
  SAMPLE_CODE: 2 * 60 * 60 * 1000, // 2 hours
  TECHNOLOGY_OVERVIEWS: 2 * 60 * 60 * 1000, // 2 hours
} as const;

// Cache Size Configuration
export const CACHE_SIZE = {
  API_DOCS: 500,
  SEARCH_RESULTS: 200,
  FRAMEWORK_INDEX: 100,
  TECHNOLOGIES: 50,
  UPDATES: 100,
  SAMPLE_CODE: 100,
  TECHNOLOGY_OVERVIEWS: 100,

  // Default cache configuration
  DEFAULT_CACHE_SIZE: 1000,
  DEFAULT_CACHE_TTL: 30 * 60 * 1000, // 30 minutes
} as const;

// Safari User-Agent Constants
// Comprehensive collection of real Safari User-Agent strings covering different macOS versions and architectures
export const SAFARI_USER_AGENTS = [
  // macOS Monterey (12.x) + Safari 15.x - 3 versions
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_7_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15', // Intel Mac, macOS 12.7.6, Safari 15.6.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 12_7_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15', // Apple Silicon Mac, macOS 12.7.5, Safari 15.6.1
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_7_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15', // Intel Mac, macOS 12.7.4, Safari 15.6.1

  // macOS Ventura (13.x) + Safari 16.x - 5 versions
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6.1 Safari/605.1.15', // Intel Mac, macOS 13.7.1, Safari 16.6.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 13_7_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6.1 Safari/605.1.15', // Apple Silicon Mac, macOS 13.7.0, Safari 16.6.1
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_9) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6.1 Safari/605.1.15', // Intel Mac, macOS 13.6.9, Safari 16.6.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 13_6_8) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6.1 Safari/605.1.15', // Apple Silicon Mac, macOS 13.6.8, Safari 16.6.1
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6.1 Safari/605.1.15', // Intel Mac, macOS 13.6.7, Safari 16.6.1

  // macOS Sonoma (14.x) + Safari 17.x - 8 versions
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15', // Intel Mac, macOS 14.7.1, Safari 17.6.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15', // Apple Silicon Mac, macOS 14.7.1, Safari 17.6.1
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15', // Intel Mac, macOS 14.6.1, Safari 17.6.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15', // Apple Silicon Mac, macOS 14.6.1, Safari 17.6.1
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', // Intel Mac, macOS 14.5, Safari 17.5
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', // Apple Silicon Mac, macOS 14.5, Safari 17.5
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15', // Intel Mac, macOS 14.4.1, Safari 17.4.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15', // Apple Silicon Mac, macOS 14.4.1, Safari 17.4.1

  // macOS Sequoia (15.x) + Safari 18.x - 6 versions
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', // Intel Mac, macOS 15.1, Safari 18.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', // Apple Silicon Mac, macOS 15.1, Safari 18.1
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15', // Intel Mac, macOS 15.0.1, Safari 18.0.1
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_0_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15', // Apple Silicon Mac, macOS 15.0.1, Safari 18.0.1
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', // Intel Mac, macOS 15.0, Safari 18.0
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', // Apple Silicon Mac, macOS 15.0, Safari 18.0

  // macOS 26 Beta + Safari 19.x Beta - 3 versions
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 26_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15', // Apple Silicon Mac, macOS 26.0 Beta, Safari 19.0 Beta
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 26_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15', // Intel Mac, macOS 26.0 Beta, Safari 19.0 Beta
  'Mozilla/5.0 (Macintosh; arm64 Mac OS X 26_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15', // Apple Silicon Mac, macOS 26.1 Beta, Safari 19.1 Beta
] as const;

// Categorized Safari User-Agent groups for easy selection
export const SAFARI_USER_AGENT_CATEGORIES = {
  monterey: SAFARI_USER_AGENTS.slice(0, 3),    // macOS 12.x + Safari 15.x
  ventura: SAFARI_USER_AGENTS.slice(3, 8),     // macOS 13.x + Safari 16.x
  sonoma: SAFARI_USER_AGENTS.slice(8, 16),     // macOS 14.x + Safari 17.x
  sequoia: SAFARI_USER_AGENTS.slice(16, 22),   // macOS 15.x + Safari 18.x
  beta: SAFARI_USER_AGENTS.slice(22, 25),      // macOS 26.x + Safari 19.x Beta
} as const;

// User-Agent validation and utility functions
export const SAFARI_USER_AGENT_UTILS = {
  // Regular expression to validate Safari User-Agent format
  SAFARI_UA_REGEX: /^Mozilla\/5\.0 \(Macintosh; (Intel|arm64) Mac OS X (\d+)_(\d+)(?:_(\d+))?\) AppleWebKit\/([\d.]+) \(KHTML, like Gecko\) Version\/([\d.]+) Safari\/([\d.]+)$/,

  /**
   * Validates if a User-Agent string is a valid Safari format
   * @param userAgent - The User-Agent string to validate
   * @returns boolean indicating if the format is valid
   */
  isValidSafariUserAgent: (userAgent: string): boolean => {
    return SAFARI_USER_AGENT_UTILS.SAFARI_UA_REGEX.test(userAgent);
  },

  /**
   * Extracts architecture from User-Agent string
   * @param userAgent - The User-Agent string
   * @returns 'Intel' | 'Apple Silicon' | null
   */
  getArchitecture: (userAgent: string): 'Intel' | 'Apple Silicon' | null => {
    const match = userAgent.match(SAFARI_USER_AGENT_UTILS.SAFARI_UA_REGEX);
    if (!match) {
      return null;
    }
    return match[1] === 'Intel' ? 'Intel' : 'Apple Silicon';
  },

  /**
   * Extracts macOS version from User-Agent string
   * @param userAgent - The User-Agent string
   * @returns string representation of macOS version (e.g., "14.7.1")
   */
  getMacOSVersion: (userAgent: string): string | null => {
    const match = userAgent.match(SAFARI_USER_AGENT_UTILS.SAFARI_UA_REGEX);
    if (!match) {
      return null;
    }
    const [, , major, minor, patch] = match;
    return patch ? `${major}.${minor}.${patch}` : `${major}.${minor}`;
  },

  /**
   * Extracts Safari version from User-Agent string
   * @param userAgent - The User-Agent string
   * @returns string representation of Safari version (e.g., "17.6.1")
   */
  getSafariVersion: (userAgent: string): string | null => {
    const match = userAgent.match(SAFARI_USER_AGENT_UTILS.SAFARI_UA_REGEX);
    if (!match) {
      return null;
    }
    return match[6];
  },

  /**
   * Gets a random Safari User-Agent from all available options
   * @returns A random Safari User-Agent string
   */
  getRandomUserAgent: (): string => {
    const randomIndex = Math.floor(Math.random() * SAFARI_USER_AGENTS.length);
    return SAFARI_USER_AGENTS[randomIndex];
  },

  /**
   * Gets a random Safari User-Agent from a specific category
   * @param category - The category to select from
   * @returns A random Safari User-Agent string from the specified category
   */
  getRandomUserAgentFromCategory: (category: keyof typeof SAFARI_USER_AGENT_CATEGORIES): string => {
    const userAgents = SAFARI_USER_AGENT_CATEGORIES[category];
    const randomIndex = Math.floor(Math.random() * userAgents.length);
    return userAgents[randomIndex];
  },
} as const;

// Request Configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  MAX_CONCURRENT_REQUESTS: 5,
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',

  // Default Safari User-Agent (latest stable)
  DEFAULT_SAFARI_USER_AGENT: SAFARI_USER_AGENTS[19], // macOS 15.1, Safari 18.1, Apple Silicon
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 100,
  WINDOW_MS: 60000, // 1 minute
} as const;

// Processing Limits Configuration
export const PROCESSING_LIMITS = {
  // Limits for slice operations in various tools
  MAX_COLLECTIONS_TO_SHOW: 5,
  MAX_RELATED_APIS_PER_SECTION: 3,
  MAX_PLATFORM_COMPATIBILITY_ITEMS: 2,
  MAX_SIMILAR_APIS_FOR_DEEP_SEARCH: 3,
  MAX_TOPIC_IDENTIFIERS: 4,
  MAX_DOC_FETCHER_RELATED_APIS: 10,
  MAX_DOC_FETCHER_REFERENCES: 15,
  MAX_DOC_FETCHER_SIMILAR_APIS: 8,
  MAX_DOC_FETCHER_REFS_PER_TYPE: 5,

  // Response time thresholds (milliseconds)
  RESPONSE_TIME_GOOD_THRESHOLD: 1000,
  RESPONSE_TIME_MODERATE_THRESHOLD: 3000,
} as const;

// Apple Developer URLs
export const APPLE_URLS = {
  BASE: 'https://developer.apple.com',
  SEARCH: 'https://developer.apple.com/search/',
  DOCUMENTATION: 'https://developer.apple.com/documentation/',
  TUTORIALS_DATA: 'https://developer.apple.com/tutorials/data/',
  TECHNOLOGIES_JSON: 'https://developer.apple.com/tutorials/data/documentation/technologies.json',
  UPDATES_JSON: 'https://developer.apple.com/tutorials/data/documentation/Updates.json',
  UPDATES_INDEX_JSON: 'https://developer.apple.com/tutorials/data/index/updates',
  TECHNOLOGY_OVERVIEWS_JSON: 'https://developer.apple.com/tutorials/data/documentation/TechnologyOverviews.json',
  TECHNOLOGY_OVERVIEWS_INDEX_JSON: 'https://developer.apple.com/tutorials/data/index/technologyoverviews',
  SAMPLE_CODE_JSON: 'https://developer.apple.com/tutorials/data/documentation/SampleCode.json',
  SAMPLE_CODE_INDEX_JSON: 'https://developer.apple.com/tutorials/data/index/samplecode',
} as const;

// WWDC URLs
export const WWDC_URLS = {
  BASE: 'https://developer.apple.com/videos',
  TOPICS: 'https://developer.apple.com/videos/topics/',
  YEAR_BASE: 'https://developer.apple.com/videos/wwdc',
  PLAY_BASE: 'https://developer.apple.com/videos/play/wwdc',

  // URL builders
  getYearUrl: (year: string) => `https://developer.apple.com/videos/wwdc${year}/`,
  getVideoUrl: (year: string, videoId: string) => `https://developer.apple.com/videos/play/wwdc${year}/${videoId}/`,
  getCodeUrl: (year: string, videoId: string) => `https://developer.apple.com/videos/play/wwdc${year}/${videoId}/code`,
  getTranscriptUrl: (year: string, videoId: string) => `https://developer.apple.com/videos/play/wwdc${year}/${videoId}/transcript`,
  getResourcesUrl: (year: string, videoId: string) => `https://developer.apple.com/videos/play/wwdc${year}/${videoId}/resources`,
  getTopicUrl: (topicId: string) => `https://developer.apple.com/videos/${topicId}/`,
} as const;

// WWDC Configuration
export const WWDC_CONFIG = {
  // Year ranges
  EARLIEST_YEAR: 2014,
  LATEST_YEAR: 2025,
  CODE_TAB_INTRODUCED_YEAR: 2022, // WWDC22 introduced separate code tabs

  // Available years array
  AVAILABLE_YEARS: ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],

  // Default limits
  DEFAULT_VIDEO_LIMIT: 50,
  DEFAULT_CODE_EXAMPLES_LIMIT: 30,
  DEFAULT_SEARCH_LIMIT: 20,
  DEFAULT_RELATED_VIDEOS_LIMIT: 15,
  DEFAULT_TOPIC_VIDEOS_LIMIT: 20,

  // Maximum limits
  MAX_VIDEO_LIMIT: 200,
  MAX_CODE_EXAMPLES_LIMIT: 100,
  MAX_SEARCH_LIMIT: 100,
  MAX_RELATED_VIDEOS_LIMIT: 50,
  MAX_TOPIC_VIDEOS_LIMIT: 100,

  // Processing limits
  MIN_CODE_LENGTH: 10, // Minimum code length to consider valid
  MAX_CONTEXT_MATCHES: 3, // Maximum matches per video in search results
  MAX_TOPIC_VIDEOS_FOR_SCORING: 10, // Maximum videos to load for similarity scoring

  // Cache TTL for WWDC data (in milliseconds)
  CACHE_TTL: 60 * 60 * 1000, // 1 hour - increased since data is now bundled
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_URL: 'URL must be from developer.apple.com',
  FETCH_FAILED: 'Failed to fetch data from Apple Developer Documentation',
  PARSE_FAILED: 'Failed to parse response data',
  NOT_FOUND: 'Documentation not found (404). This URL may have been moved or removed.',
  TIMEOUT: 'Request timed out. Please try again later.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  RATE_LIMITED: 'Request rate limit exceeded. Please wait before trying again.',
  API_ERROR: 'API error occurred while processing the request.',
  CACHE_ERROR: 'Cache operation failed, but the request will continue.',
  VALIDATION_ERROR: 'Input validation failed. Please check your parameters.',
  SERVICE_UNAVAILABLE: 'Apple Developer Documentation service is temporarily unavailable.',
} as const;