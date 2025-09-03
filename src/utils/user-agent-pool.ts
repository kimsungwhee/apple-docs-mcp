/**
 * User-Agent Pool Manager for rotating user agents to avoid detection
 *
 * Provides robust management of multiple User-Agent strings with:
 * - Multiple rotation strategies (random, sequential, smart)
 * - Automatic error handling and recovery
 * - Performance statistics and monitoring
 * - Thread-safe concurrent access
 * - Browser type detection and header generation support
 *
 * @author Apple Docs MCP
 * @version 1.0.0
 */

import type { UserAgent as UserAgentType, BrowserType } from '../types/headers.js';
import { parseUserAgent } from './http-headers-generator.js';

/**
 * Configuration options for the User-Agent pool
 */
export interface UserAgentPoolConfig {
  /** Rotation strategy to use */
  strategy?: RotationStrategy;
  /** How long to disable failed User-Agents (in milliseconds) */
  disableDuration?: number;
  /** Maximum number of failures before disabling a User-Agent */
  failureThreshold?: number;
  /** Minimum success rate to keep a User-Agent enabled (0-1) */
  minSuccessRate?: number;
}

/**
 * Rotation strategies available
 */
export type RotationStrategy = 'random' | 'sequential' | 'smart';

/**
 * Internal representation of a User-Agent
 */
interface UserAgent {
  /** The actual User-Agent string */
  value: string;
  /** Whether this User-Agent is currently enabled */
  isEnabled: boolean;
  /** When this User-Agent will be re-enabled (if disabled) */
  disabledUntil?: Date;
  /** Number of successful requests */
  successCount: number;
  /** Number of failed requests */
  failureCount: number;
  /** Last time this User-Agent was used */
  lastUsed?: Date;
  /** Consecutive failures count */
  consecutiveFailures: number;
}

/**
 * Statistics for a single User-Agent
 */
export interface AgentStats {
  value: string;
  successCount: number;
  failureCount: number;
  successRate: number;
  totalRequests: number;
  isEnabled: boolean;
  lastUsed?: Date;
  consecutiveFailures: number;
}

/**
 * Overall pool statistics
 */
export interface PoolStats {
  /** Total number of User-Agents in pool */
  total: number;
  /** Number of currently enabled User-Agents */
  enabled: number;
  /** Number of currently disabled User-Agents */
  disabled: number;
  /** Total requests made across all User-Agents */
  totalRequests: number;
  /** Overall success rate (0-100) */
  successRate: number;
  /** Current rotation strategy */
  strategy: RotationStrategy;
  /** Pool health score (0-100) */
  healthScore: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<UserAgentPoolConfig> = {
  strategy: 'random',
  disableDuration: 5 * 60 * 1000, // 5 minutes
  failureThreshold: 3,
  minSuccessRate: 0.5, // 50%
};

/**
 * User-Agent Pool Manager
 *
 * Manages a pool of User-Agent strings with rotation, error handling,
 * and automatic recovery capabilities.
 *
 * @example
 * ```typescript
 * const pool = new UserAgentPool([
 *   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
 *   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
 * ]);
 *
 * const userAgent = pool.getNext();
 * // ... make request ...
 * if (response.ok) {
 *   pool.markSuccess(userAgent);
 * } else {
 *   pool.markFailure(userAgent, response.status);
 * }
 * ```
 */
export class UserAgentPool {
  private agents: UserAgent[] = [];
  private currentIndex = 0;
  private config: Required<UserAgentPoolConfig>;
  private mutex = new AsyncMutex();

  /**
   * Create a new User-Agent pool
   *
   * @param agents - Array of User-Agent strings to manage
   * @param config - Configuration options
   * @throws {Error} When agents array is empty or contains invalid values
   */
  constructor(agents: string[], config: UserAgentPoolConfig = {}) {
    if (!agents || agents.length === 0) {
      throw new Error('User-Agent pool cannot be empty');
    }

    // Validate and normalize agents
    const validAgents = agents.filter(agent =>
      typeof agent === 'string' && agent.trim().length > 0,
    );

    if (validAgents.length === 0) {
      throw new Error('No valid User-Agent strings provided');
    }

    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize agents
    this.agents = validAgents.map(value => ({
      value: value.trim(),
      isEnabled: true,
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
    }));

    // Remove duplicates
    this.removeDuplicates();

    if (this.agents.length === 0) {
      throw new Error('No unique User-Agent strings after deduplication');
    }

    // Randomize initial order for better distribution
    if (this.config.strategy === 'random') {
      this.shuffleAgents();
    }
  }

  /**
   * Get the next User-Agent string using the configured strategy
   *
   * This method is thread-safe and handles automatic recovery of disabled agents.
   *
   * @returns The next User-Agent string to use
   * @throws {Error} When no User-Agents are available
   */
  async getNext(): Promise<string> {
    return this.mutex.runExclusive(async () => {
      // First, try to recover any disabled agents that should be re-enabled
      this.recoverDisabledAgents();

      // Get available agents
      const enabledAgents = this.agents.filter(agent => agent.isEnabled);

      if (enabledAgents.length === 0) {
        // Emergency fallback: re-enable the least bad agent
        const fallbackAgent = this.selectFallbackAgent();
        if (fallbackAgent) {
          fallbackAgent.isEnabled = true;
          fallbackAgent.disabledUntil = undefined;
          fallbackAgent.consecutiveFailures = 0;
          return this.selectAndUseAgent(fallbackAgent);
        }
        throw new Error('No User-Agents available in pool');
      }

      // Select next agent based on strategy
      const selectedAgent = this.selectByStrategy(enabledAgents);
      return this.selectAndUseAgent(selectedAgent);
    });
  }

  /**
   * Mark a User-Agent as having failed a request
   *
   * @param userAgent - The User-Agent string that failed
   * @param statusCode - HTTP status code of the failure (optional)
   */
  async markFailure(userAgent: string, statusCode?: number): Promise<void> {
    return this.mutex.runExclusive(async () => {
      const agent = this.findAgent(userAgent);
      if (!agent) {
        return;
      }

      agent.failureCount++;
      agent.consecutiveFailures++;

      // Determine if this failure should disable the agent
      const shouldDisable = this.shouldDisableAgent(agent, statusCode);

      if (shouldDisable) {
        agent.isEnabled = false;
        agent.disabledUntil = new Date(Date.now() + this.config.disableDuration);
      }
    });
  }

  /**
   * Mark a User-Agent as having succeeded a request
   *
   * @param userAgent - The User-Agent string that succeeded
   */
  async markSuccess(userAgent: string): Promise<void> {
    return this.mutex.runExclusive(async () => {
      const agent = this.findAgent(userAgent);
      if (!agent) {
        return;
      }

      agent.successCount++;
      agent.consecutiveFailures = 0; // Reset consecutive failures

      // Re-enable agent if it was disabled and now has good performance
      if (!agent.isEnabled && this.getAgentSuccessRate(agent) >= this.config.minSuccessRate) {
        agent.isEnabled = true;
        agent.disabledUntil = undefined;
      }
    });
  }

  /**
   * Add a new User-Agent to the pool
   *
   * @param userAgent - The User-Agent string to add
   * @throws {Error} When User-Agent is invalid or already exists
   */
  async addAgent(userAgent: string): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (!userAgent || typeof userAgent !== 'string' || userAgent.trim().length === 0) {
        throw new Error('Invalid User-Agent string');
      }

      const normalizedAgent = userAgent.trim();

      if (this.agents.some(agent => agent.value === normalizedAgent)) {
        throw new Error('User-Agent already exists in pool');
      }

      this.agents.push({
        value: normalizedAgent,
        isEnabled: true,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      });
    });
  }

  /**
   * Remove a User-Agent from the pool
   *
   * @param userAgent - The User-Agent string to remove
   * @throws {Error} When trying to remove the last User-Agent
   */
  async removeAgent(userAgent: string): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (this.agents.length <= 1) {
        throw new Error('Cannot remove the last User-Agent from pool');
      }

      const index = this.agents.findIndex(agent => agent.value === userAgent);
      if (index === -1) {
        throw new Error('User-Agent not found in pool');
      }

      this.agents.splice(index, 1);

      // Adjust current index if needed
      if (this.currentIndex >= this.agents.length) {
        this.currentIndex = 0;
      }
    });
  }

  /**
   * Get statistics for all User-Agents in the pool
   *
   * @returns Array of statistics for each User-Agent
   */
  getAgentStats(): AgentStats[] {
    return this.agents.map(agent => ({
      value: agent.value,
      successCount: agent.successCount,
      failureCount: agent.failureCount,
      successRate: this.getAgentSuccessRate(agent),
      totalRequests: agent.successCount + agent.failureCount,
      isEnabled: agent.isEnabled,
      lastUsed: agent.lastUsed,
      consecutiveFailures: agent.consecutiveFailures,
    }));
  }

  /**
   * Get overall pool statistics
   *
   * @returns Pool-wide statistics
   */
  getStats(): PoolStats {
    const enabledCount = this.agents.filter(agent => agent.isEnabled).length;
    const totalRequests = this.agents.reduce((sum, agent) =>
      sum + agent.successCount + agent.failureCount, 0);
    const totalSuccesses = this.agents.reduce((sum, agent) =>
      sum + agent.successCount, 0);

    const successRate = totalRequests > 0 ? (totalSuccesses / totalRequests) * 100 : 0;
    const healthScore = this.calculateHealthScore();

    return {
      total: this.agents.length,
      enabled: enabledCount,
      disabled: this.agents.length - enabledCount,
      totalRequests,
      successRate,
      strategy: this.config.strategy,
      healthScore,
    };
  }

  /**
   * Reset all statistics while keeping the User-Agents
   */
  async resetStats(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      for (const agent of this.agents) {
        agent.successCount = 0;
        agent.failureCount = 0;
        agent.consecutiveFailures = 0;
        agent.lastUsed = undefined;
        agent.isEnabled = true;
        agent.disabledUntil = undefined;
      }
    });
  }

  /**
   * Get the current configuration
   *
   * @returns Current pool configuration
   */
  getConfig(): Readonly<Required<UserAgentPoolConfig>> {
    return { ...this.config };
  }

  /**
   * Get the next User-Agent as a structured UserAgent object
   *
   * This method provides enhanced information about the User-Agent including
   * browser type, version, OS details, and architecture information.
   *
   * @returns Promise resolving to a UserAgent object with parsed information
   * @throws {Error} When no User-Agents are available
   */
  async getNextUserAgent(): Promise<UserAgentType> {
    const userAgentString = await this.getNext();
    return parseUserAgent(userAgentString);
  }

  /**
   * Get a random User-Agent string filtered by browser type
   *
   * @param browserType - Desired browser type
   * @returns Promise resolving to a User-Agent string of the specified type
   * @throws {Error} When no User-Agents of the specified type are available
   */
  async getByBrowserType(browserType: BrowserType): Promise<string> {
    return this.mutex.runExclusive(async () => {
      // First, try to recover any disabled agents
      this.recoverDisabledAgents();

      // Filter agents by browser type
      const matchingAgents = this.agents.filter(agent => {
        if (!agent.isEnabled) {
          return false;
        }
        const parsed = parseUserAgent(agent.value);
        return parsed.browserType === browserType;
      });

      if (matchingAgents.length === 0) {
        throw new Error(`No enabled User-Agents available for browser type: ${browserType}`);
      }

      // Select using configured strategy
      const selectedAgent = this.selectByStrategy(matchingAgents);
      return this.selectAndUseAgent(selectedAgent);
    });
  }

  /**
   * Get a random User-Agent object filtered by browser type
   *
   * @param browserType - Desired browser type
   * @returns Promise resolving to a UserAgent object of the specified type
   * @throws {Error} When no User-Agents of the specified type are available
   */
  async getUserAgentByBrowserType(browserType: BrowserType): Promise<UserAgentType> {
    const userAgentString = await this.getByBrowserType(browserType);
    return parseUserAgent(userAgentString);
  }

  /**
   * Get statistics grouped by browser type
   *
   * @returns Statistics organized by browser type
   */
  getStatsByBrowserType(): Record<BrowserType, { count: number; enabled: number; successRate: number }> {
    const stats: Record<string, { count: number; enabled: number; totalRequests: number; successCount: number }> = {};

    // Initialize all browser types
    const browserTypes: BrowserType[] = ['chrome', 'firefox', 'safari', 'edge'];
    browserTypes.forEach(type => {
      stats[type] = { count: 0, enabled: 0, totalRequests: 0, successCount: 0 };
    });

    // Aggregate stats by browser type
    this.agents.forEach(agent => {
      const parsed = parseUserAgent(agent.value);
      const browserType = parsed.browserType;

      stats[browserType].count++;
      if (agent.isEnabled) {
        stats[browserType].enabled++;
      }
      stats[browserType].totalRequests += agent.successCount + agent.failureCount;
      stats[browserType].successCount += agent.successCount;
    });

    // Calculate success rates and return
    const result: Record<BrowserType, { count: number; enabled: number; successRate: number }> = {} as any;
    browserTypes.forEach(type => {
      const browserStats = stats[type];
      result[type] = {
        count: browserStats.count,
        enabled: browserStats.enabled,
        successRate: browserStats.totalRequests > 0
          ? (browserStats.successCount / browserStats.totalRequests) * 100
          : 0,
      };
    });

    return result;
  }

  /**
   * Get all available browser types in the pool
   *
   * @returns Array of browser types present in the pool
   */
  getAvailableBrowserTypes(): BrowserType[] {
    const browserTypes = new Set<BrowserType>();

    this.agents.forEach(agent => {
      const parsed = parseUserAgent(agent.value);
      browserTypes.add(parsed.browserType);
    });

    return Array.from(browserTypes);
  }

  // Private helper methods

  private selectByStrategy(enabledAgents: UserAgent[]): UserAgent {
    switch (this.config.strategy) {
      case 'sequential':
        return this.selectSequential(enabledAgents);

      case 'smart':
        return this.selectSmart(enabledAgents);

      case 'random':
      default:
        return this.selectRandom(enabledAgents);
    }
  }

  private selectRandom(agents: UserAgent[]): UserAgent {
    const randomIndex = Math.floor(Math.random() * agents.length);
    return agents[randomIndex];
  }

  private selectSequential(agents: UserAgent[]): UserAgent {
    // Find the next enabled agent in sequence
    const enabledIndices = agents.map(agent => this.agents.indexOf(agent));
    enabledIndices.sort((a, b) => a - b);

    // Find current position in enabled agents
    let nextIndex = enabledIndices.find(index => index > this.currentIndex);
    if (nextIndex === undefined) {
      nextIndex = enabledIndices[0]; // Wrap around
    }

    this.currentIndex = nextIndex;
    return this.agents[nextIndex];
  }

  private selectSmart(agents: UserAgent[]): UserAgent {
    // Smart selection prioritizes:
    // 1. Agents with higher success rates
    // 2. Agents used less recently
    // 3. Agents with fewer total requests (for load balancing)

    const now = Date.now();
    const scores = agents.map(agent => {
      const successRate = this.getAgentSuccessRate(agent);
      const totalRequests = agent.successCount + agent.failureCount;

      // Time since last use (higher is better)
      const timeSinceLastUse = agent.lastUsed ?
        Math.min(now - agent.lastUsed.getTime(), 3600000) : 3600000; // Cap at 1 hour

      // Calculate composite score
      const successScore = successRate * 0.4; // 40% weight on success rate
      const recencyScore = (timeSinceLastUse / 3600000) * 0.3; // 30% weight on recency
      const balanceScore = totalRequests > 0 ? (1 / Math.log(totalRequests + 1)) * 0.3 : 0.3; // 30% weight on load balancing

      return successScore + recencyScore + balanceScore;
    });

    // Select agent with highest score
    const maxScore = Math.max(...scores);
    const bestAgentIndex = scores.indexOf(maxScore);
    return agents[bestAgentIndex];
  }

  private selectAndUseAgent(agent: UserAgent): string {
    agent.lastUsed = new Date();
    return agent.value;
  }

  private findAgent(userAgent: string): UserAgent | undefined {
    return this.agents.find(agent => agent.value === userAgent);
  }

  private shouldDisableAgent(agent: UserAgent, statusCode?: number): boolean {
    // Always disable on consecutive failures above threshold
    if (agent.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Consider specific status codes
    if (statusCode) {
      // 403 Forbidden or 429 Too Many Requests should disable immediately
      if (statusCode === 403 || statusCode === 429) {
        return true;
      }
    }

    // Disable if success rate is too low (with minimum sample size)
    const totalRequests = agent.successCount + agent.failureCount;
    if (totalRequests >= 10 && this.getAgentSuccessRate(agent) < this.config.minSuccessRate) {
      return true;
    }

    return false;
  }

  private getAgentSuccessRate(agent: UserAgent): number {
    const total = agent.successCount + agent.failureCount;
    return total > 0 ? agent.successCount / total : 1.0; // Default to 100% for unused agents
  }

  private recoverDisabledAgents(): void {
    const now = new Date();
    for (const agent of this.agents) {
      if (!agent.isEnabled && agent.disabledUntil && now >= agent.disabledUntil) {
        agent.isEnabled = true;
        agent.disabledUntil = undefined;
        agent.consecutiveFailures = 0; // Reset consecutive failures on recovery
      }
    }
  }

  private selectFallbackAgent(): UserAgent | null {
    if (this.agents.length === 0) {
      return null;
    }

    // Find the agent with the best success rate, or the one disabled most recently
    return this.agents.reduce((best, current) => {
      if (!best) {
        return current;
      }

      const bestRate = this.getAgentSuccessRate(best);
      const currentRate = this.getAgentSuccessRate(current);

      if (currentRate > bestRate) {
        return current;
      }
      if (currentRate === bestRate) {
        // If rates are equal, prefer the one disabled more recently (likely to recover sooner)
        if (!current.disabledUntil) {
          return current;
        }
        if (!best.disabledUntil) {
          return best;
        }
        return current.disabledUntil > best.disabledUntil ? current : best;
      }

      return best;
    });
  }

  private calculateHealthScore(): number {
    if (this.agents.length === 0) {
      return 0;
    }

    const enabledRatio = this.agents.filter(agent => agent.isEnabled).length / this.agents.length;
    const avgSuccessRate = this.agents.reduce((sum, agent) =>
      sum + this.getAgentSuccessRate(agent), 0) / this.agents.length;

    // Health score combines enabled ratio and average success rate
    return Math.round((enabledRatio * 0.4 + avgSuccessRate * 0.6) * 100);
  }

  private removeDuplicates(): void {
    const seen = new Set<string>();
    this.agents = this.agents.filter(agent => {
      if (seen.has(agent.value)) {
        return false;
      }
      seen.add(agent.value);
      return true;
    });
  }

  private shuffleAgents(): void {
    for (let i = this.agents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.agents[i], this.agents[j]] = [this.agents[j], this.agents[i]];
    }
  }
}

/**
 * Simple async mutex for thread-safe operations
 *
 * Ensures that only one async operation can modify the pool state at a time.
 */
class AsyncMutex {
  private mutex = Promise.resolve();

  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.mutex.then(fn);
    this.mutex = result.then(() => {}, () => {}); // Always resolve mutex regardless of result
    return result;
  }
}

/**
 * Pre-defined User-Agent strings for common browsers
 * Covers Chrome, Firefox, Safari, and Edge across different platforms
 */
export const COMMON_USER_AGENTS = {
  // Chrome User-Agents
  CHROME_MAC_INTEL: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  CHROME_MAC_APPLE: 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  CHROME_WINDOWS: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  CHROME_LINUX: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',

  // Firefox User-Agents
  FIREFOX_MAC_INTEL: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
  FIREFOX_MAC_APPLE: 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
  FIREFOX_WINDOWS: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  FIREFOX_LINUX: 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',

  // Safari User-Agents (using constants from constants.ts)
  SAFARI_MAC_INTEL_15_1: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  SAFARI_MAC_APPLE_15_1: 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  SAFARI_MAC_INTEL_14_7: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15',
  SAFARI_MAC_APPLE_14_7: 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15',

  // Edge User-Agents
  EDGE_WINDOWS: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  EDGE_MAC_INTEL: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  EDGE_MAC_APPLE: 'Mozilla/5.0 (Macintosh; arm64 Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
} as const;

/**
 * Create a default User-Agent pool with common browser agents
 *
 * @param config - Configuration options for the pool
 * @returns A new UserAgentPool instance with common User-Agents
 */
export function createDefaultPool(config: UserAgentPoolConfig = {}): UserAgentPool {
  return new UserAgentPool(Object.values(COMMON_USER_AGENTS), config);
}