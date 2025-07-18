/**
 * HTTP client related types
 */

/**
 * HTTP request options
 */
export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP performance statistics
 */
export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  statusCodes: Record<number, number>;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  maxConcurrency?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
  userAgent?: string;
}