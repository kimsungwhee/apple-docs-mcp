/**
 * Enhanced HTTP client with intelligent User-Agent rotation and browser-compatible headers
 *
 * Features:
 * - Smart User-Agent pool rotation with automatic failure recovery
 * - Dynamic browser headers generation (Accept, Accept-Language, etc.)
 * - Comprehensive retry logic with exponential backoff
 * - Performance tracking and statistics collection
 * - Rate limiting integration
 * - Request timeout and error handling
 *
 * The client automatically rotates through a pool of Safari User-Agents and generates
 * realistic browser headers to avoid detection and improve API reliability.
 *
 * @author Apple Docs MCP
 * @version 1.0.0
 */

import { REQUEST_CONFIG, ERROR_MESSAGES, PROCESSING_LIMITS, SAFARI_USER_AGENTS } from './constants.js';
import { handleFetchError } from './error-handler.js';
import { globalRateLimiter } from './rate-limiter.js';
import { UserAgentPool } from './user-agent-pool.js';
import { HttpHeadersGenerator } from './http-headers-generator.js';
import type { HeaderGeneratorConfig } from '../types/headers.js';

/**
 * Configuration options for HTTP requests
 */
interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  retries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Additional headers to include in the request */
  headers?: Record<string, string>;
}

/**
 * Performance statistics for HTTP client monitoring
 */
interface PerformanceStats {
  /** Total number of requests made */
  totalRequests: number;
  /** Number of successful requests (2xx status) */
  successfulRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Total response time across all requests */
  totalResponseTime: number;
  /** Average response time per request */
  averageResponseTime: number;
  /** Success rate as a percentage (0-100) */
  successRate: number;
  /** Request count by HTTP status code */
  requestsByStatus: Record<number, number>;
  /** Request count by domain */
  requestsByDomain: Record<string, number>;
}

// Global User-Agent pool instance
let userAgentPool: UserAgentPool | null = null;
// Global HTTP headers generator instance
let headersGenerator: HttpHeadersGenerator | null = null;

/**
 * Initialize the User-Agent pool with Safari User-Agents
 * Falls back to static User-Agent if initialization fails
 */
function initializeUserAgentPool(): UserAgentPool | null {
  if (userAgentPool) {
    return userAgentPool;
  }

  try {
    userAgentPool = new UserAgentPool([...SAFARI_USER_AGENTS], {
      strategy: 'random',
      disableDuration: 5 * 60 * 1000, // 5 minutes
      failureThreshold: 3,
      minSuccessRate: 0.5,
    });
    return userAgentPool;
  } catch (error) {
    // Fallback: Pool initialization failed, will use static User-Agent
    console.warn('UserAgentPool initialization failed, falling back to static User-Agent:', error);
    return null;
  }
}

/**
 * Initialize the HTTP headers generator
 * Falls back to basic headers if initialization fails
 */
function initializeHeadersGenerator(): HttpHeadersGenerator | null {
  if (headersGenerator) {
    return headersGenerator;
  }

  try {
    // Check environment variables for configuration
    const config: HeaderGeneratorConfig = {
      enableSecFetch: process.env.DISABLE_SEC_FETCH !== 'true',
      enableDNT: process.env.DISABLE_DNT !== 'true',
      languageRotation: process.env.DISABLE_LANGUAGE_ROTATION !== 'true',
      simpleMode: process.env.SIMPLE_HEADERS_MODE === 'true',
      defaultAcceptLanguage: process.env.DEFAULT_ACCEPT_LANGUAGE || 'en-US,en;q=0.9',
    };

    headersGenerator = HttpHeadersGenerator.getInstance(config);
    return headersGenerator;
  } catch (error) {
    console.warn('HttpHeadersGenerator initialization failed, falling back to basic headers:', error);
    return null;
  }
}

class HttpClient {
  private requestQueue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private readonly maxConcurrentRequests = REQUEST_CONFIG.MAX_CONCURRENT_REQUESTS;

  // Performance monitoring
  private stats: PerformanceStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    successRate: 0,
    requestsByStatus: {},
    requestsByDomain: {},
  };

  /**
   * Make a GET request with timeout, retry logic, and browser-compatible headers
   * Uses rotating User-Agent and matching headers for better request distribution
   */
  async get(url: string, options: RequestOptions = {}): Promise<Response> {
    const {
      timeout = REQUEST_CONFIG.TIMEOUT,
      retries = REQUEST_CONFIG.MAX_RETRIES,
      retryDelay = REQUEST_CONFIG.RETRY_DELAY,
      headers = {},
    } = options;

    return this.executeWithQueue(async () => {
      // Check rate limit
      if (!globalRateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Generate headers with User-Agent rotation
      const requestHeaders = await this.generateRequestHeaders(headers, 'application/json');

      return this.fetchWithRetry(url, {
        method: 'GET',
        headers: requestHeaders,
        signal: AbortSignal.timeout(timeout),
      }, retries, retryDelay);
    });
  }

  /**
   * Execute request with concurrency control
   */
  private async executeWithQueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        if (this.activeRequests >= this.maxConcurrentRequests) {
          // Add to queue
          this.requestQueue.push(execute);
          return;
        }

        this.activeRequests++;
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          // Process next request in queue
          const nextRequest = this.requestQueue.shift();
          if (nextRequest) {
            void nextRequest();
          }
        }
      };

      void execute();
    });
  }

  /**
   * Fetch with retry logic, performance monitoring, and User-Agent rotation
   * Each retry attempt uses a fresh User-Agent from the pool
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number,
    retryDelay: number,
  ): Promise<Response> {
    const startTime = Date.now();
    const domain = new URL(url).hostname;
    let lastError: Error | null = null;
    let currentUserAgent: string | null = null;

    // Update domain stats
    this.stats.requestsByDomain[domain] = (this.stats.requestsByDomain[domain] || 0) + 1;
    this.stats.totalRequests++;

    // Initialize User-Agent pool
    const pool = initializeUserAgentPool();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Extract current User-Agent from pre-generated headers
        currentUserAgent = (options.headers as any)?.['User-Agent'] || null;

        const response = await fetch(url, options);

        const responseTime = Date.now() - startTime;

        // Update performance stats only if response is valid
        if (response) {
          this.updateStats(response.status, responseTime, true);
        }

        // Mark User-Agent success/failure in pool
        if (pool && currentUserAgent) {
          if (response?.ok) {
            await pool.markSuccess(currentUserAgent);
          } else {
            await pool.markFailure(currentUserAgent, response?.status);
          }
        }

        if (!response?.ok) {
          if (response && response.status === 404) {
            throw new Error(`${ERROR_MESSAGES.NOT_FOUND} (${response.status})`);
          }
          if (response && response.status >= 500 && attempt < retries) {
            // Retry on server errors
            throw new Error(`Server error: ${response.status}`);
          }
          const status = response ? response.status : 'unknown';
          const statusText = response ? response.statusText : 'No response';
          throw new Error(`HTTP ${status}: ${statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Mark User-Agent failure in pool
        if (pool && currentUserAgent) {
          // Extract status code from error if available
          const statusMatch = lastError.message.match(/HTTP (\d+):/);
          const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
          await pool.markFailure(currentUserAgent, statusCode);
        }

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(ERROR_MESSAGES.TIMEOUT);
          }
          if (error.message.includes('404')) {
            throw error; // Don't retry 404s
          }
        }

        // Wait before retry (except on last attempt)
        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    // Update stats for failed request
    const responseTime = Date.now() - startTime;
    this.updateStats(0, responseTime, false);

    throw lastError ?? new Error('Request failed after retries');
  }

  /**
   * Update performance statistics
   */
  private updateStats(statusCode: number, responseTime: number, success: boolean): void {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    this.stats.totalResponseTime += responseTime;
    this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalRequests;
    this.stats.successRate = (this.stats.successfulRequests / this.stats.totalRequests) * 100;

    if (statusCode > 0) {
      this.stats.requestsByStatus[statusCode] = (this.stats.requestsByStatus[statusCode] || 0) + 1;
    }
  }

  /**
   * Generate request headers with User-Agent rotation and browser compatibility
   */
  private async generateRequestHeaders(
    customHeaders: Record<string, string> = {},
    acceptOverride?: string,
  ): Promise<Record<string, string>> {
    let requestHeaders: Record<string, string> = {};

    try {
      // Initialize User-Agent pool and headers generator
      const pool = initializeUserAgentPool();
      const generator = initializeHeadersGenerator();

      if (pool && generator) {
        // Get next User-Agent with enhanced info
        const userAgent = await pool.getNextUserAgent();

        // Generate matching headers
        const generatedHeaders = generator.generateHeaders(userAgent);
        requestHeaders = { ...generatedHeaders };

        // Update pool statistics on response
        // Note: This is handled in fetchWithRetry error handling
      } else {
        // Fallback to basic headers
        requestHeaders = {
          'User-Agent': REQUEST_CONFIG.DEFAULT_SAFARI_USER_AGENT || REQUEST_CONFIG.USER_AGENT,
          'Accept': acceptOverride || 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'DNT': '1',
        };
      }
    } catch (error) {
      // Fallback to basic headers on any error
      console.warn('Failed to generate enhanced headers, falling back to basic:', error);
      requestHeaders = {
        'User-Agent': REQUEST_CONFIG.DEFAULT_SAFARI_USER_AGENT || REQUEST_CONFIG.USER_AGENT,
        'Accept': acceptOverride || 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.9',
      };
    }

    // Override Accept header if specified
    if (acceptOverride) {
      requestHeaders['Accept'] = acceptOverride;
    }

    // Apply custom headers (highest priority)
    return { ...requestHeaders, ...customHeaders };
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get JSON response with error handling
   */
  async getJson<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
    try {
      const response = await this.get(url, options);
      return await response.json() as T;
    } catch (error) {
      const appError = handleFetchError(error, url);
      throw appError;
    }
  }

  /**
   * Get text response with error handling
   */
  async getText(url: string, options: RequestOptions = {}): Promise<string> {
    const {
      timeout = REQUEST_CONFIG.TIMEOUT,
      retries = REQUEST_CONFIG.MAX_RETRIES,
      retryDelay = REQUEST_CONFIG.RETRY_DELAY,
      headers = {},
    } = options;

    try {
      return this.executeWithQueue(async () => {
        // Check rate limit
        if (!globalRateLimiter.canMakeRequest()) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Generate headers with HTML Accept type
        const requestHeaders = await this.generateRequestHeaders(
          headers,
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        );

        const response = await this.fetchWithRetry(url, {
          method: 'GET',
          headers: requestHeaders,
          signal: AbortSignal.timeout(timeout),
        }, retries, retryDelay);

        return await response.text();
      });
    } catch (error) {
      const appError = handleFetchError(error, url);
      throw appError;
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      maxConcurrent: this.maxConcurrentRequests,
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    return { ...this.stats };
  }

  /**
   * Get User-Agent pool statistics
   */
  getUserAgentPoolStats() {
    const pool = initializeUserAgentPool();
    if (!pool) {
      return {
        enabled: false,
        reason: 'User-Agent pool initialization failed',
        fallbackAgent: REQUEST_CONFIG.USER_AGENT,
      } as const;
    }

    return {
      enabled: true,
      poolStats: pool.getStats(),
      agentStats: pool.getAgentStats(),
    } as const;
  }

  /**
   * Reset performance statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      successRate: 0,
      requestsByStatus: {},
      requestsByDomain: {},
    };
  }

  /**
   * Get formatted performance report
   */
  getPerformanceReport(): string {
    const stats = this.getPerformanceStats();

    let report = '# HTTP Client Performance Report\n\n';

    // Overall Statistics
    report += '## Overall Statistics\n\n';
    report += `- **Total Requests:** ${stats.totalRequests}\n`;
    report += `- **Successful Requests:** ${stats.successfulRequests}\n`;
    report += `- **Failed Requests:** ${stats.failedRequests}\n`;
    report += `- **Success Rate:** ${stats.successRate.toFixed(2)}%\n`;
    report += `- **Average Response Time:** ${stats.averageResponseTime.toFixed(0)}ms\n\n`;

    // Status Code Distribution
    if (Object.keys(stats.requestsByStatus).length > 0) {
      report += '## Response Status Codes\n\n';
      Object.entries(stats.requestsByStatus)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([status, count]) => {
          const percentage = ((count / stats.totalRequests) * 100).toFixed(1);
          report += `- **${status}:** ${count} requests (${percentage}%)\n`;
        });
      report += '\n';
    }

    // Domain Distribution
    if (Object.keys(stats.requestsByDomain).length > 0) {
      report += '## Requests by Domain\n\n';
      Object.entries(stats.requestsByDomain)
        .sort(([, a], [, b]) => b - a)
        .forEach(([domain, count]) => {
          const percentage = ((count / stats.totalRequests) * 100).toFixed(1);
          report += `- **${domain}:** ${count} requests (${percentage}%)\n`;
        });
      report += '\n';
    }

    // User-Agent Pool Status
    const uaPoolStats = this.getUserAgentPoolStats();
    report += '## User-Agent Pool Status\n\n';

    if (uaPoolStats.enabled) {
      const poolStats = uaPoolStats.poolStats;
      const agentStats = uaPoolStats.agentStats;

      report += `✅ **Pool Active** - ${poolStats.enabled}/${poolStats.total} agents enabled\n`;
      report += `- **Total Requests:** ${poolStats.totalRequests}\n`;
      report += `- **Success Rate:** ${poolStats.successRate.toFixed(2)}%\n`;
      report += `- **Health Score:** ${poolStats.healthScore}/100\n`;
      report += `- **Strategy:** ${poolStats.strategy}\n\n`;

      // Top performing agents
      const topAgents = agentStats
        .filter(agent => agent.totalRequests > 0)
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3);

      if (topAgents.length > 0) {
        report += '### Top Performing User-Agents\n\n';
        topAgents.forEach((agent, index) => {
          const shortAgent = agent.value.split(' ').slice(0, 4).join(' ') + '...';
          report += `${index + 1}. ${shortAgent} - ${agent.successRate.toFixed(1)}% (${agent.totalRequests} requests)\n`;
        });
        report += '\n';
      }
    } else {
      report += `❌ **Pool Disabled** - ${uaPoolStats.reason}\n`;
      report += `- **Fallback Agent:** ${uaPoolStats.fallbackAgent}\n\n`;
    }

    // Performance Insights
    report += '## Performance Insights\n\n';
    if (stats.successRate >= 95) {
      report += '✅ **Excellent reliability** - Success rate above 95%\n';
    } else if (stats.successRate >= 90) {
      report += '⚠️ **Good reliability** - Success rate above 90%\n';
    } else {
      report += '❌ **Poor reliability** - Success rate below 90%\n';
    }

    if (stats.averageResponseTime < PROCESSING_LIMITS.RESPONSE_TIME_GOOD_THRESHOLD) {
      report += '✅ **Fast response times** - Average under 1 second\n';
    } else if (stats.averageResponseTime < PROCESSING_LIMITS.RESPONSE_TIME_MODERATE_THRESHOLD) {
      report += '⚠️ **Moderate response times** - Average under 3 seconds\n';
    } else {
      report += '❌ **Slow response times** - Average over 3 seconds\n';
    }

    report += `\n*Report generated at ${new Date().toISOString()}*`;

    return report;
  }
}

// Export singleton instance
export const httpClient = new HttpClient();