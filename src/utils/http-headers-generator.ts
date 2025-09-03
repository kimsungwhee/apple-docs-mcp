/**
 * HTTP Headers Generator for browser compatibility and anti-detection
 * 
 * Generates browser-specific HTTP headers to make requests appear more authentic
 * and reduce the likelihood of being detected as automated requests.
 * 
 * Features:
 * - Browser-specific header templates (Chrome, Firefox, Safari, Edge)
 * - Accept-Language rotation for geographic diversity
 * - Sec-Fetch-* headers for modern browser simulation
 * - Configurable privacy settings (DNT, etc.)
 * - Custom header override support
 * - High-performance singleton pattern
 */

import type {
  BrowserType,
  HeaderTemplate,
  HeaderGeneratorConfig,
  UserAgent,
  LanguagePreference,
  SecFetchConfig,
} from '../types/headers.js';

import {
  BROWSER_HEADERS,
  SIMPLE_BROWSER_HEADERS,
  LANGUAGE_PREFERENCES,
  PLATFORM_VALUES,
  BROWSER_VERSIONS,
  DNT_VALUES,
  CACHE_CONTROL_VALUES,
} from '../constants/browser-headers.js';

/**
 * Default configuration for header generation
 */
const DEFAULT_CONFIG: Required<HeaderGeneratorConfig> = {
  enableSecFetch: true,
  enableDNT: true,
  languageRotation: true,
  customTemplates: {},
  defaultAcceptLanguage: 'en-US,en;q=0.9',
  simpleMode: false,
};

/**
 * HTTP Headers Generator
 * 
 * Generates authentic browser headers based on User-Agent strings and configuration.
 * Uses singleton pattern for optimal performance and memory usage.
 * 
 * @example
 * ```typescript
 * const generator = HttpHeadersGenerator.getInstance();
 * 
 * const userAgent = {
 *   userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
 *   browserType: 'chrome',
 *   version: '121.0.0.0',
 *   os: 'macOS',
 *   osVersion: '10.15.7'
 * };
 * 
 * const headers = generator.generateHeaders(userAgent);
 * console.log(headers['Accept-Language']); // "en-US,en;q=0.9"
 * ```
 */
export class HttpHeadersGenerator {
  private static instance: HttpHeadersGenerator;
  private config: Required<HeaderGeneratorConfig>;
  private languageRotationIndex = 0;
  
  private constructor(config: HeaderGeneratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance of HttpHeadersGenerator
   * 
   * @param config - Optional configuration to override defaults
   * @returns Singleton instance of HttpHeadersGenerator
   */
  static getInstance(config: HeaderGeneratorConfig = {}): HttpHeadersGenerator {
    if (!HttpHeadersGenerator.instance) {
      HttpHeadersGenerator.instance = new HttpHeadersGenerator(config);
    } else if (Object.keys(config).length > 0) {
      // Update configuration if provided
      HttpHeadersGenerator.instance.config = { 
        ...HttpHeadersGenerator.instance.config, 
        ...config 
      };
    }
    
    return HttpHeadersGenerator.instance;
  }

  /**
   * Generate complete HTTP headers for a given User-Agent
   * 
   * Creates a complete set of HTTP headers that match the browser type
   * and configuration. Headers are generated to appear authentic and
   * reduce detection risk.
   * 
   * @param userAgent - UserAgent object containing browser information
   * @param customHeaders - Optional custom headers to override generated ones
   * @returns Complete set of HTTP headers
   */
  generateHeaders(
    userAgent: UserAgent,
    customHeaders: Record<string, string> = {}
  ): Record<string, string> {
    // Get base template for browser type
    const baseTemplate = this.getHeaderTemplate(userAgent.browserType);
    
    // Generate dynamic headers
    const generatedHeaders: Record<string, string> = {
      ...baseTemplate,
      'User-Agent': userAgent.userAgent,
    };

    // Apply language rotation if enabled, otherwise use default or browser-specific
    if (this.config.languageRotation) {
      generatedHeaders['Accept-Language'] = this.generateLanguageHeader();
    } else if (this.config.defaultAcceptLanguage && 
               this.config.defaultAcceptLanguage !== 'en-US,en;q=0.9') {
      generatedHeaders['Accept-Language'] = this.config.defaultAcceptLanguage;
    }

    // Apply Sec-Fetch headers if enabled and supported
    if (this.config.enableSecFetch && this.supportsBrowserSecFetch(userAgent.browserType)) {
      const secFetchHeaders = this.generateSecFetchHeaders(userAgent.browserType);
      Object.assign(generatedHeaders, secFetchHeaders);
    }

    // Apply DNT randomization if enabled
    if (this.config.enableDNT) {
      generatedHeaders['DNT'] = this.generateDNTHeader();
    }

    // Apply browser-specific dynamic headers (not in simple mode)
    if (!this.config.simpleMode) {
      const dynamicHeaders = this.generateDynamicHeaders(userAgent);
      Object.assign(generatedHeaders, dynamicHeaders);
    }

    // Apply custom templates from configuration
    const customTemplateHeaders = this.getCustomTemplateHeaders(userAgent.browserType);
    Object.assign(generatedHeaders, customTemplateHeaders);

    // Apply user-provided custom headers (highest priority)
    Object.assign(generatedHeaders, customHeaders);

    return generatedHeaders;
  }

  /**
   * Get header template for browser type
   * 
   * @param browserType - Type of browser
   * @returns Header template for the browser
   */
  private getHeaderTemplate(browserType: BrowserType): HeaderTemplate {
    const templates = this.config.simpleMode ? SIMPLE_BROWSER_HEADERS : BROWSER_HEADERS;
    return { ...templates[browserType] };
  }

  /**
   * Generate Accept-Language header with rotation
   * 
   * @returns Accept-Language header value
   */
  private generateLanguageHeader(): string {
    if (LANGUAGE_PREFERENCES.length === 0) {
      return this.config.defaultAcceptLanguage;
    }

    const preferences = LANGUAGE_PREFERENCES[this.languageRotationIndex];
    this.languageRotationIndex = (this.languageRotationIndex + 1) % LANGUAGE_PREFERENCES.length;

    return preferences
      .map(pref => pref.quality && pref.quality < 1.0 
        ? `${pref.language};q=${pref.quality.toFixed(1)}`
        : pref.language)
      .join(',');
  }

  /**
   * Generate Sec-Fetch-* headers for modern browsers
   * 
   * @param browserType - Type of browser
   * @param config - Optional Sec-Fetch configuration
   * @returns Sec-Fetch headers object
   */
  private generateSecFetchHeaders(
    browserType: BrowserType,
    config: Partial<SecFetchConfig> = {}
  ): Record<string, string> {
    const defaultConfig: SecFetchConfig = {
      dest: 'document',
      mode: 'navigate',
      site: 'none',
      user: true,
      ...config,
    };

    const headers: Record<string, string> = {
      'Sec-Fetch-Dest': defaultConfig.dest,
      'Sec-Fetch-Mode': defaultConfig.mode,
      'Sec-Fetch-Site': defaultConfig.site,
    };

    if (defaultConfig.user) {
      headers['Sec-Fetch-User'] = '?1';
    }

    return headers;
  }

  /**
   * Generate Do Not Track header
   * 
   * @returns DNT header value
   */
  private generateDNTHeader(): string {
    return DNT_VALUES[Math.floor(Math.random() * DNT_VALUES.length)];
  }

  /**
   * Generate dynamic headers based on User-Agent details
   * 
   * @param userAgent - UserAgent object
   * @returns Dynamic headers object
   */
  private generateDynamicHeaders(userAgent: UserAgent): Record<string, string> {
    const headers: Record<string, string> = {};

    // Generate Sec-CH-UA headers for Chrome/Edge
    if (userAgent.browserType === 'chrome' || userAgent.browserType === 'edge') {
      const versions = BROWSER_VERSIONS[userAgent.browserType];
      if (versions && versions.length > 0) {
        headers['Sec-CH-UA'] = versions[Math.floor(Math.random() * versions.length)];
      }

      // Set mobile indicator
      headers['Sec-CH-UA-Mobile'] = '?0';

      // Set platform based on OS
      if (userAgent.os.toLowerCase().includes('mac')) {
        const platforms = PLATFORM_VALUES.macOS;
        headers['Sec-CH-UA-Platform'] = platforms[Math.floor(Math.random() * platforms.length)];
      } else if (userAgent.os.toLowerCase().includes('windows')) {
        headers['Sec-CH-UA-Platform'] = PLATFORM_VALUES.windows[0];
      } else if (userAgent.os.toLowerCase().includes('linux')) {
        headers['Sec-CH-UA-Platform'] = PLATFORM_VALUES.linux[0];
      }
    }

    // Randomize Cache-Control occasionally
    if (Math.random() < 0.1) { // 10% chance to vary cache control
      headers['Cache-Control'] = CACHE_CONTROL_VALUES[
        Math.floor(Math.random() * CACHE_CONTROL_VALUES.length)
      ];
    }

    return headers;
  }

  /**
   * Get custom template headers for browser type
   * 
   * @param browserType - Type of browser
   * @returns Custom headers from configuration
   */
  private getCustomTemplateHeaders(browserType: BrowserType): Record<string, string> {
    const customTemplate = this.config.customTemplates[browserType];
    if (!customTemplate) {
      return {};
    }

    // Filter out undefined values
    const filtered: Record<string, string> = {};
    Object.entries(customTemplate).forEach(([key, value]) => {
      if (value !== undefined) {
        filtered[key] = value;
      }
    });

    return filtered;
  }

  /**
   * Check if browser supports Sec-Fetch headers
   * 
   * @param browserType - Type of browser
   * @returns Whether browser supports Sec-Fetch headers
   */
  private supportsBrowserSecFetch(browserType: BrowserType): boolean {
    // Firefox doesn't support all Sec-Fetch headers, Safari has limited support
    return browserType === 'chrome' || browserType === 'edge';
  }

  /**
   * Update configuration
   * 
   * @param config - New configuration to merge
   */
  updateConfig(config: Partial<HeaderGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration (read-only)
   */
  getConfig(): Readonly<Required<HeaderGeneratorConfig>> {
    return { ...this.config };
  }

  /**
   * Reset language rotation index
   */
  resetLanguageRotation(): void {
    this.languageRotationIndex = 0;
  }

  /**
   * Get current language rotation index
   * 
   * @returns Current rotation index
   */
  getLanguageRotationIndex(): number {
    return this.languageRotationIndex;
  }

  /**
   * Validate generated headers for consistency
   * 
   * @param headers - Headers to validate
   * @param userAgent - Original UserAgent object
   * @returns Validation result with any warnings
   */
  validateHeaders(
    headers: Record<string, string>,
    userAgent: UserAgent
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check User-Agent consistency
    if (headers['User-Agent'] !== userAgent.userAgent) {
      warnings.push('User-Agent header does not match provided UserAgent object');
    }

    // Check Accept-Language format
    const acceptLanguage = headers['Accept-Language'];
    if (acceptLanguage && !/^[\w-]+(;q=\d\.\d)?(,[\w-]+(;q=\d\.\d)?)*$/.test(acceptLanguage)) {
      warnings.push('Accept-Language header format may be invalid');
    }

    // Check Sec-Fetch headers consistency
    const hasSecFetch = Object.keys(headers).some(key => key.startsWith('Sec-Fetch-'));
    if (hasSecFetch && !this.supportsBrowserSecFetch(userAgent.browserType)) {
      warnings.push(`Sec-Fetch headers present for ${userAgent.browserType} which has limited support`);
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * Convenience function to create a UserAgent object from a User-Agent string
 * 
 * @param userAgentString - Raw User-Agent string
 * @returns UserAgent object with parsed information
 */
export function parseUserAgent(userAgentString: string): UserAgent {
  let browserType: BrowserType = 'chrome'; // default
  let version = 'unknown';
  let os = 'unknown';
  let osVersion = 'unknown';
  let architecture: string | undefined;

  // Safari detection
  if (userAgentString.includes('Safari/') && userAgentString.includes('Version/')) {
    browserType = 'safari';
    const versionMatch = userAgentString.match(/Version\/([\d.]+)/);
    if (versionMatch) {
      version = versionMatch[1];
    }
    
    // Extract macOS architecture
    if (userAgentString.includes('Intel Mac OS X')) {
      architecture = 'Intel';
    } else if (userAgentString.includes('arm64 Mac OS X')) {
      architecture = 'Apple Silicon';
    }
    
    // Extract macOS version
    const macOSMatch = userAgentString.match(/Mac OS X (\d+)_(\d+)(?:_(\d+))?/);
    if (macOSMatch) {
      os = 'macOS';
      osVersion = macOSMatch[3] ? `${macOSMatch[1]}.${macOSMatch[2]}.${macOSMatch[3]}` : `${macOSMatch[1]}.${macOSMatch[2]}`;
    }
  }
  // Chrome detection
  else if (userAgentString.includes('Chrome/') && !userAgentString.includes('Edg/')) {
    browserType = 'chrome';
    const chromeMatch = userAgentString.match(/Chrome\/([\d.]+)/);
    if (chromeMatch) {
      version = chromeMatch[1];
    }
  }
  // Edge detection
  else if (userAgentString.includes('Edg/')) {
    browserType = 'edge';
    const edgeMatch = userAgentString.match(/Edg\/([\d.]+)/);
    if (edgeMatch) {
      version = edgeMatch[1];
    }
  }
  // Firefox detection
  else if (userAgentString.includes('Firefox/')) {
    browserType = 'firefox';
    const firefoxMatch = userAgentString.match(/Firefox\/([\d.]+)/);
    if (firefoxMatch) {
      version = firefoxMatch[1];
    }
  }

  // Extract OS information for non-Safari browsers
  if (browserType !== 'safari') {
    if (userAgentString.includes('Windows NT')) {
      os = 'Windows';
      const winMatch = userAgentString.match(/Windows NT ([\d.]+)/);
      if (winMatch) {
        osVersion = winMatch[1];
      }
    } else if (userAgentString.includes('Mac OS X')) {
      os = 'macOS';
      const macMatch = userAgentString.match(/Mac OS X ([\d_]+)/);
      if (macMatch) {
        osVersion = macMatch[1].replace(/_/g, '.');
      }
    } else if (userAgentString.includes('Intel Mac OS X')) {
      os = 'macOS';
      const macMatch = userAgentString.match(/Intel Mac OS X ([\d.]+)/);
      if (macMatch) {
        osVersion = macMatch[1];
      }
    } else if (userAgentString.includes('Linux')) {
      os = 'Linux';
    }
  }

  return {
    userAgent: userAgentString,
    browserType,
    version,
    os,
    osVersion,
    architecture,
  };
}