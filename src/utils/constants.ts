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

// Request Configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  MAX_CONCURRENT_REQUESTS: 5,
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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