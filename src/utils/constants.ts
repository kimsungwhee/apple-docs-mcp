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
} as const;

// Cache Size Configuration
export const CACHE_SIZE = {
  API_DOCS: 500,
  SEARCH_RESULTS: 200,
  FRAMEWORK_INDEX: 100,
  TECHNOLOGIES: 50,
  UPDATES: 100,
} as const;

// Request Configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_URL: 'URL must be from developer.apple.com',
  FETCH_FAILED: 'Failed to fetch data from Apple Developer Documentation',
  PARSE_FAILED: 'Failed to parse response data',
  NOT_FOUND: 'Documentation not found (404). This URL may have been moved or removed.',
  TIMEOUT: 'Request timed out. Please try again later.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
} as const;