/**
 * Browser-specific HTTP header templates for authentic browser simulation
 *
 * Based on real browser behavior analysis for different browser types.
 * These templates ensure requests look authentic and reduce detection risk.
 */

import type { BrowserType, HeaderTemplate, LanguagePreference } from '../types/headers.js';

/**
 * Browser-specific header templates
 *
 * Each template is crafted to match real browser behavior:
 * - Accept headers reflect browser's format support
 * - Sec-Fetch-* headers match browser security policies
 * - Language preferences follow browser defaults
 */
export const BROWSER_HEADERS: Record<BrowserType, HeaderTemplate> = {
  chrome: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'DNT': '1',
    'Sec-CH-UA': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  },

  firefox: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.5',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  },

  safari: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-us',
    'DNT': '1',
    'Cache-Control': 'max-age=0',
  },

  edge: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'DNT': '1',
    'Sec-CH-UA': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  },
};

/**
 * Simplified header templates for basic compatibility mode
 */
export const SIMPLE_BROWSER_HEADERS: Record<BrowserType, HeaderTemplate> = {
  chrome: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US,en;q=0.9',
  },

  firefox: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US,en;q=0.5',
  },

  safari: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-us',
  },

  edge: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US,en;q=0.9',
  },
};

/**
 * Language preference pools for rotation
 */
export const LANGUAGE_PREFERENCES: LanguagePreference[][] = [
  // English variations
  [
    { language: 'en-US', quality: 1.0 },
    { language: 'en', quality: 0.9 },
  ],
  [
    { language: 'en-GB', quality: 1.0 },
    { language: 'en', quality: 0.9 },
  ],
  [
    { language: 'en-CA', quality: 1.0 },
    { language: 'en', quality: 0.9 },
  ],
  [
    { language: 'en-AU', quality: 1.0 },
    { language: 'en', quality: 0.9 },
  ],

  // English + other languages
  [
    { language: 'en-US', quality: 1.0 },
    { language: 'en', quality: 0.9 },
    { language: 'es', quality: 0.5 },
  ],
  [
    { language: 'en-US', quality: 1.0 },
    { language: 'en', quality: 0.9 },
    { language: 'fr', quality: 0.4 },
  ],
  [
    { language: 'en-US', quality: 1.0 },
    { language: 'en', quality: 0.9 },
    { language: 'de', quality: 0.3 },
  ],
  [
    { language: 'en-US', quality: 1.0 },
    { language: 'en', quality: 0.9 },
    { language: 'zh-CN', quality: 0.8 },
    { language: 'zh', quality: 0.7 },
  ],
];

/**
 * Platform-specific Sec-CH-UA-Platform values
 */
export const PLATFORM_VALUES = {
  macOS: ['"macOS"'],
  windows: ['"Windows"'],
  linux: ['"Linux"'],
} as const;

/**
 * Browser version strings for Sec-CH-UA headers
 */
export const BROWSER_VERSIONS = {
  chrome: [
    '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    '"Not A(Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
    '"Not A(Brand";v="99", "Google Chrome";v="119", "Chromium";v="119"',
  ],

  edge: [
    '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
    '"Not A(Brand";v="99", "Microsoft Edge";v="120", "Chromium";v="120"',
    '"Not A(Brand";v="99", "Microsoft Edge";v="119", "Chromium";v="119"',
  ],
} as const;

/**
 * DNT (Do Not Track) values for privacy preference simulation
 */
export const DNT_VALUES = ['1', '0'] as const;

/**
 * Cache-Control values for different request types
 */
export const CACHE_CONTROL_VALUES = [
  'max-age=0',
  'no-cache',
  'max-age=0, no-cache',
] as const;