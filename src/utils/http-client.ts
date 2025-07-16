/**
 * HTTP client with timeout, retry, and rate limiting
 */

import { REQUEST_CONFIG, ERROR_MESSAGES } from './constants.js';
import { handleFetchError } from './error-handler.js';

interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  averageResponseTime: number;
  successRate: number;
  requestsByStatus: Record<number, number>;
  requestsByDomain: Record<string, number>;
}

class HttpClient {
  private requestQueue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private readonly maxConcurrentRequests = 5;

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
   * Make a GET request with timeout and retry logic
   */
  async get(url: string, options: RequestOptions = {}): Promise<Response> {
    const {
      timeout = REQUEST_CONFIG.TIMEOUT,
      retries = REQUEST_CONFIG.MAX_RETRIES,
      retryDelay = REQUEST_CONFIG.RETRY_DELAY,
      headers = {},
    } = options;

    const defaultHeaders = {
      'User-Agent': REQUEST_CONFIG.USER_AGENT,
      'Accept': 'application/json',
      ...headers,
    };

    return this.executeWithQueue(async () => {
      return this.fetchWithRetry(url, {
        method: 'GET',
        headers: defaultHeaders,
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
   * Fetch with retry logic and performance monitoring
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

    // Update domain stats
    this.stats.requestsByDomain[domain] = (this.stats.requestsByDomain[domain] || 0) + 1;
    this.stats.totalRequests++;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        const responseTime = Date.now() - startTime;

        // Update performance stats
        this.updateStats(response.status, responseTime, true);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`${ERROR_MESSAGES.NOT_FOUND} (${response.status})`);
          }
          if (response.status >= 500 && attempt < retries) {
            // Retry on server errors
            throw new Error(`Server error: ${response.status}`);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

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

    throw lastError || new Error('Request failed after retries');
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
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get JSON response with error handling
   */
  async getJson<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
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
    try {
      const response = await this.get(url, {
        ...options,
        headers: {
          ...options.headers,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      return await response.text();
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

    // Performance Insights
    report += '## Performance Insights\n\n';
    if (stats.successRate >= 95) {
      report += '✅ **Excellent reliability** - Success rate above 95%\n';
    } else if (stats.successRate >= 90) {
      report += '⚠️ **Good reliability** - Success rate above 90%\n';
    } else {
      report += '❌ **Poor reliability** - Success rate below 90%\n';
    }

    if (stats.averageResponseTime < 1000) {
      report += '✅ **Fast response times** - Average under 1 second\n';
    } else if (stats.averageResponseTime < 3000) {
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