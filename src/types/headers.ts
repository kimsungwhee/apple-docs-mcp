/**
 * HTTP headers related types for browser compatibility
 */

/**
 * Supported browser types
 */
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge';

/**
 * User-Agent information extracted from a User-Agent string
 */
export interface UserAgent {
  /** The complete User-Agent string */
  userAgent: string;
  /** Browser type detected from the User-Agent */
  browserType: BrowserType;
  /** Browser version */
  version: string;
  /** Operating system */
  os: string;
  /** OS version */
  osVersion: string;
  /** Architecture (Intel, Apple Silicon, etc.) */
  architecture?: string;
}

/**
 * HTTP header template for a specific browser
 */
export interface HeaderTemplate {
  /** Accept header for content type negotiation */
  'Accept': string;
  /** Accept-Encoding header for compression support */
  'Accept-Encoding': string;
  /** Accept-Language header for language preferences */
  'Accept-Language': string;
  /** Do Not Track header for privacy */
  'DNT'?: string;
  /** Sec-Fetch-Dest header for request destination */
  'Sec-Fetch-Dest'?: string;
  /** Sec-Fetch-Mode header for request mode */
  'Sec-Fetch-Mode'?: string;
  /** Sec-Fetch-Site header for request site */
  'Sec-Fetch-Site'?: string;
  /** Sec-Fetch-User header for user activation */
  'Sec-Fetch-User'?: string;
  /** Sec-CH-UA header for client hint user agent */
  'Sec-CH-UA'?: string;
  /** Sec-CH-UA-Mobile header for mobile device indication */
  'Sec-CH-UA-Mobile'?: string;
  /** Sec-CH-UA-Platform header for platform indication */
  'Sec-CH-UA-Platform'?: string;
  /** Upgrade-Insecure-Requests header for security upgrade */
  'Upgrade-Insecure-Requests'?: string;
  /** Cache-Control header for caching behavior */
  'Cache-Control'?: string;
}

/**
 * Configuration options for header generation
 */
export interface HeaderGeneratorConfig {
  /** Whether to enable Sec-Fetch-* headers */
  enableSecFetch?: boolean;
  /** Whether to enable Do Not Track header */
  enableDNT?: boolean;
  /** Whether to rotate Accept-Language values */
  languageRotation?: boolean;
  /** Custom header templates to override defaults */
  customTemplates?: Partial<Record<BrowserType, Partial<HeaderTemplate>>>;
  /** Default Accept-Language value */
  defaultAcceptLanguage?: string;
  /** Whether to enable simplified headers mode */
  simpleMode?: boolean;
}

/**
 * Language preference with quality factor
 */
export interface LanguagePreference {
  /** Language code */
  language: string;
  /** Quality factor (0-1) */
  quality?: number;
}

/**
 * Sec-Fetch headers configuration
 */
export interface SecFetchConfig {
  /** Request destination */
  dest: 'document' | 'empty' | 'image' | 'script' | 'style';
  /** Request mode */
  mode: 'cors' | 'navigate' | 'no-cors' | 'same-origin';
  /** Request site */
  site: 'cross-site' | 'none' | 'same-origin' | 'same-site';
  /** Whether user initiated */
  user?: boolean;
}