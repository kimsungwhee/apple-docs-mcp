/**
 * Rate limiter for API requests
 */

export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests = 100, windowMs = 60000) { // 100 requests per minute by default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
  
  /**
   * Get current usage statistics
   */
  getStats(): {
    currentRequests: number;
    maxRequests: number;
    windowMs: number;
    utilizationRate: string;
  } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      utilizationRate: ((this.requests.length / this.maxRequests) * 100).toFixed(2) + '%',
    };
  }
  
  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

// Create a global rate limiter instance
export const globalRateLimiter = new RateLimiter(300, 60000); // 300 requests per minute