/**
 * Comprehensive unit tests for UserAgentPool
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { UserAgentPool, COMMON_USER_AGENTS, createDefaultPool, type UserAgentPoolConfig, type AgentStats } from '../utils/user-agent-pool.js';

// Test data
const TEST_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestAgent/1.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) TestAgent/1.0', 
  'Mozilla/5.0 (X11; Linux x86_64) TestAgent/1.0',
  'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) TestAgent/1.0',
];

describe('UserAgentPool', () => {
  let pool: UserAgentPool;

  beforeEach(() => {
    // Reset pool for each test
    pool = new UserAgentPool([...TEST_USER_AGENTS]);
  });

  describe('Constructor', () => {
    test('should create pool with valid agents', () => {
      const pool = new UserAgentPool(['Agent1', 'Agent2']);
      const stats = pool.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.enabled).toBe(2);
      expect(stats.disabled).toBe(0);
    });

    test('should throw error for empty agents array', () => {
      expect(() => new UserAgentPool([])).toThrow('User-Agent pool cannot be empty');
    });

    test('should throw error for null/undefined agents', () => {
      expect(() => new UserAgentPool(null as any)).toThrow('User-Agent pool cannot be empty');
      expect(() => new UserAgentPool(undefined as any)).toThrow('User-Agent pool cannot be empty');
    });

    test('should filter out invalid agents', () => {
      const pool = new UserAgentPool(['Valid Agent', '', '   ', null as any, undefined as any, 'Another Valid']);
      const stats = pool.getStats();
      
      expect(stats.total).toBe(2);
    });

    test('should throw error when all agents are invalid', () => {
      expect(() => new UserAgentPool(['', '   ', null as any])).toThrow('No valid User-Agent strings provided');
    });

    test('should remove duplicate agents', () => {
      const pool = new UserAgentPool(['Agent1', 'Agent2', 'Agent1', 'Agent2']);
      const stats = pool.getStats();
      
      expect(stats.total).toBe(2);
    });

    test('should apply custom configuration', () => {
      const config: UserAgentPoolConfig = {
        strategy: 'sequential',
        disableDuration: 10000,
        failureThreshold: 5,
        minSuccessRate: 0.8,
      };

      const pool = new UserAgentPool(['Agent1'], config);
      const poolConfig = pool.getConfig();
      
      expect(poolConfig.strategy).toBe('sequential');
      expect(poolConfig.disableDuration).toBe(10000);
      expect(poolConfig.failureThreshold).toBe(5);
      expect(poolConfig.minSuccessRate).toBe(0.8);
    });

    test('should use default configuration when not provided', () => {
      const pool = new UserAgentPool(['Agent1']);
      const config = pool.getConfig();
      
      expect(config.strategy).toBe('random');
      expect(config.disableDuration).toBe(5 * 60 * 1000);
      expect(config.failureThreshold).toBe(3);
      expect(config.minSuccessRate).toBe(0.5);
    });
  });

  describe('getNext() - Basic Functionality', () => {
    test('should return a User-Agent string', async () => {
      const userAgent = await pool.getNext();
      expect(typeof userAgent).toBe('string');
      expect(userAgent.length).toBeGreaterThan(0);
      expect(TEST_USER_AGENTS).toContain(userAgent);
    });

    test('should update lastUsed timestamp', async () => {
      const beforeTime = new Date();
      const userAgent = await pool.getNext();
      const afterTime = new Date();

      const agentStats = pool.getAgentStats().find((stats: AgentStats) => stats.value === userAgent);
      expect(agentStats?.lastUsed).toBeDefined();
      expect(agentStats!.lastUsed!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(agentStats!.lastUsed!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    test('should use fallback agent when all agents are disabled', async () => {
      // Disable all agents
      for (const agent of TEST_USER_AGENTS) {
        await pool.markFailure(agent, 403); // 403 disables immediately
      }

      // Should still return an agent (fallback mechanism)
      const userAgent = await pool.getNext();
      expect(typeof userAgent).toBe('string');
      expect(TEST_USER_AGENTS).toContain(userAgent);
      
      // The agent should be re-enabled as part of fallback
      const agentStats = pool.getAgentStats().find((s: AgentStats) => s.value === userAgent);
      expect(agentStats?.isEnabled).toBe(true);
    });

    test('should recover disabled agents when appropriate', async () => {
      const config: UserAgentPoolConfig = { disableDuration: 100 }; // 100ms
      const pool = new UserAgentPool(TEST_USER_AGENTS.slice(0, 1), config);

      // Disable the agent
      await pool.markFailure(TEST_USER_AGENTS[0], 403);
      
      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be able to get agent again
      const userAgent = await pool.getNext();
      expect(userAgent).toBe(TEST_USER_AGENTS[0]);
    });
  });

  describe('Rotation Strategies', () => {
    describe('Random Strategy', () => {
      test('should distribute requests across all agents', async () => {
        const pool = new UserAgentPool(TEST_USER_AGENTS, { strategy: 'random' });
        const results = new Set<string>();
        
        // Make many requests to get good distribution
        for (let i = 0; i < 100; i++) {
          const agent = await pool.getNext();
          results.add(agent);
        }

        // Should have used multiple agents (with high probability)
        expect(results.size).toBeGreaterThan(1);
      });

      test('should work with single agent', async () => {
        const pool = new UserAgentPool([TEST_USER_AGENTS[0]], { strategy: 'random' });
        
        for (let i = 0; i < 5; i++) {
          const agent = await pool.getNext();
          expect(agent).toBe(TEST_USER_AGENTS[0]);
        }
      });
    });

    describe('Sequential Strategy', () => {
      test('should rotate through agents in order', async () => {
        const pool = new UserAgentPool(TEST_USER_AGENTS, { strategy: 'sequential' });
        
        const results: string[] = [];
        for (let i = 0; i < TEST_USER_AGENTS.length * 2; i++) {
          results.push(await pool.getNext());
        }

        // Should cycle through all agents twice
        for (let i = 0; i < TEST_USER_AGENTS.length; i++) {
          expect(results[i]).toBe(results[i + TEST_USER_AGENTS.length]);
        }
      });

      test('should skip disabled agents', async () => {
        const pool = new UserAgentPool(TEST_USER_AGENTS, { strategy: 'sequential' });
        
        // Disable middle agent
        await pool.markFailure(TEST_USER_AGENTS[1], 403);
        
        const results: string[] = [];
        for (let i = 0; i < 6; i++) {
          results.push(await pool.getNext());
        }

        // Should not include disabled agent
        expect(results).not.toContain(TEST_USER_AGENTS[1]);
        expect(new Set(results).size).toBe(3); // Only 3 enabled agents
      });
    });

    describe('Smart Strategy', () => {
      test('should prefer agents with higher success rates', async () => {
        const pool = new UserAgentPool(TEST_USER_AGENTS.slice(0, 2), { strategy: 'smart' });
        
        // Make first agent very successful
        for (let i = 0; i < 10; i++) {
          await pool.markSuccess(TEST_USER_AGENTS[0]);
        }
        
        // Make second agent less successful
        for (let i = 0; i < 5; i++) {
          await pool.markSuccess(TEST_USER_AGENTS[1]);
          await pool.markFailure(TEST_USER_AGENTS[1]);
        }
        
        // Smart strategy should prefer the more successful agent
        const results: string[] = [];
        for (let i = 0; i < 10; i++) {
          results.push(await pool.getNext());
        }
        
        const firstAgentCount = results.filter(agent => agent === TEST_USER_AGENTS[0]).length;
        expect(firstAgentCount).toBeGreaterThan(5); // Should be used more often
      });
    });
  });

  describe('Success/Failure Tracking', () => {
    test('should track successful requests', async () => {
      const userAgent = await pool.getNext();
      await pool.markSuccess(userAgent);
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === userAgent);
      expect(stats?.successCount).toBe(1);
      expect(stats?.failureCount).toBe(0);
      expect(stats?.successRate).toBe(1.0);
      expect(stats?.consecutiveFailures).toBe(0);
    });

    test('should track failed requests', async () => {
      const userAgent = await pool.getNext();
      await pool.markFailure(userAgent);
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === userAgent);
      expect(stats?.successCount).toBe(0);
      expect(stats?.failureCount).toBe(1);
      expect(stats?.successRate).toBe(0.0);
      expect(stats?.consecutiveFailures).toBe(1);
    });

    test('should calculate success rate correctly', async () => {
      const userAgent = await pool.getNext();
      
      // 3 successes, 1 failure = 75% success rate
      await pool.markSuccess(userAgent);
      await pool.markSuccess(userAgent);
      await pool.markSuccess(userAgent);
      await pool.markFailure(userAgent);
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === userAgent);
      expect(stats?.successRate).toBe(0.75);
      expect(stats?.totalRequests).toBe(4);
    });

    test('should reset consecutive failures on success', async () => {
      const userAgent = await pool.getNext();
      
      await pool.markFailure(userAgent);
      await pool.markFailure(userAgent);
      expect(pool.getAgentStats().find((s: AgentStats) => s.value === userAgent)?.consecutiveFailures).toBe(2);
      
      await pool.markSuccess(userAgent);
      expect(pool.getAgentStats().find((s: AgentStats) => s.value === userAgent)?.consecutiveFailures).toBe(0);
    });
  });

  describe('Agent Disabling and Recovery', () => {
    test('should disable agent after consecutive failures', async () => {
      const config: UserAgentPoolConfig = { failureThreshold: 2 };
      const pool = new UserAgentPool([TEST_USER_AGENTS[0]], config);
      
      await pool.markFailure(TEST_USER_AGENTS[0]);
      await pool.markFailure(TEST_USER_AGENTS[0]);
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === TEST_USER_AGENTS[0]);
      expect(stats?.isEnabled).toBe(false);
    });

    test('should disable agent immediately for certain status codes', async () => {
      const pool = new UserAgentPool([TEST_USER_AGENTS[0]]);
      
      // 403 Forbidden should disable immediately
      await pool.markFailure(TEST_USER_AGENTS[0], 403);
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === TEST_USER_AGENTS[0]);
      expect(stats?.isEnabled).toBe(false);
    });

    test('should disable agent immediately for 429 Too Many Requests', async () => {
      const pool = new UserAgentPool([TEST_USER_AGENTS[0]]);
      
      await pool.markFailure(TEST_USER_AGENTS[0], 429);
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === TEST_USER_AGENTS[0]);
      expect(stats?.isEnabled).toBe(false);
    });

    test('should not disable agent for other status codes immediately', async () => {
      const pool = new UserAgentPool([TEST_USER_AGENTS[0]]);
      
      await pool.markFailure(TEST_USER_AGENTS[0], 500); // Server error
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === TEST_USER_AGENTS[0]);
      expect(stats?.isEnabled).toBe(true); // Should still be enabled
    });

    test('should recover disabled agents after timeout', async () => {
      const config: UserAgentPoolConfig = { disableDuration: 100 }; // 100ms
      const pool = new UserAgentPool([TEST_USER_AGENTS[0]], config);
      
      // Disable agent
      await pool.markFailure(TEST_USER_AGENTS[0], 403);
      expect(pool.getAgentStats().find((s: AgentStats) => s.value === TEST_USER_AGENTS[0])?.isEnabled).toBe(false);
      
      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger recovery by calling getNext
      const userAgent = await pool.getNext();
      expect(userAgent).toBe(TEST_USER_AGENTS[0]);
      expect(pool.getAgentStats().find((s: AgentStats) => s.value === TEST_USER_AGENTS[0])?.isEnabled).toBe(true);
    });
  });

  describe('Pool Management', () => {
    test('should add new agent', async () => {
      const newAgent = 'Mozilla/5.0 NewAgent/1.0';
      await pool.addAgent(newAgent);
      
      const stats = pool.getStats();
      expect(stats.total).toBe(TEST_USER_AGENTS.length + 1);
      
      const agentStats = pool.getAgentStats();
      expect(agentStats.some((s: AgentStats) => s.value === newAgent)).toBe(true);
    });

    test('should throw error when adding invalid agent', async () => {
      await expect(pool.addAgent('')).rejects.toThrow('Invalid User-Agent string');
      await expect(pool.addAgent('   ')).rejects.toThrow('Invalid User-Agent string');
      await expect(pool.addAgent(null as any)).rejects.toThrow('Invalid User-Agent string');
    });

    test('should throw error when adding duplicate agent', async () => {
      await expect(pool.addAgent(TEST_USER_AGENTS[0])).rejects.toThrow('User-Agent already exists in pool');
    });

    test('should remove agent', async () => {
      const agentToRemove = TEST_USER_AGENTS[0];
      await pool.removeAgent(agentToRemove);
      
      const stats = pool.getStats();
      expect(stats.total).toBe(TEST_USER_AGENTS.length - 1);
      
      const agentStats = pool.getAgentStats();
      expect(agentStats.some((s: AgentStats) => s.value === agentToRemove)).toBe(false);
    });

    test('should throw error when removing non-existent agent', async () => {
      await expect(pool.removeAgent('Non-existent Agent')).rejects.toThrow('User-Agent not found in pool');
    });

    test('should throw error when removing last agent', async () => {
      const pool = new UserAgentPool([TEST_USER_AGENTS[0]]);
      await expect(pool.removeAgent(TEST_USER_AGENTS[0])).rejects.toThrow('Cannot remove the last User-Agent from pool');
    });

    test('should reset all statistics', async () => {
      // Add some statistics
      const userAgent = await pool.getNext();
      await pool.markSuccess(userAgent);
      await pool.markFailure(userAgent);
      
      // Reset stats
      await pool.resetStats();
      
      // Verify all stats are reset
      const allStats = pool.getAgentStats();
      for (const stat of allStats) {
        expect(stat.successCount).toBe(0);
        expect(stat.failureCount).toBe(0);
        expect(stat.totalRequests).toBe(0);
        expect(stat.consecutiveFailures).toBe(0);
        expect(stat.lastUsed).toBeUndefined();
        expect(stat.isEnabled).toBe(true);
      }
    });
  });

  describe('Statistics', () => {
    test('should return correct agent statistics', async () => {
      const userAgent = await pool.getNext();
      await pool.markSuccess(userAgent);
      await pool.markFailure(userAgent);
      
      const stats = pool.getAgentStats();
      const agentStat = stats.find((s: AgentStats) => s.value === userAgent);
      
      expect(agentStat).toBeDefined();
      expect(agentStat?.successCount).toBe(1);
      expect(agentStat?.failureCount).toBe(1);
      expect(agentStat?.totalRequests).toBe(2);
      expect(agentStat?.successRate).toBe(0.5);
      expect(agentStat?.isEnabled).toBe(true);
      expect(agentStat?.lastUsed).toBeDefined();
    });

    test('should return correct pool statistics', async () => {
      const userAgent1 = await pool.getNext();
      const userAgent2 = await pool.getNext();
      
      await pool.markSuccess(userAgent1);
      await pool.markFailure(userAgent2);
      await pool.markFailure(userAgent2, 403); // This disables the agent
      
      const stats = pool.getStats();
      
      expect(stats.total).toBe(TEST_USER_AGENTS.length);
      expect(stats.enabled).toBe(TEST_USER_AGENTS.length - 1);
      expect(stats.disabled).toBe(1);
      expect(stats.totalRequests).toBe(3); // 1 success + 2 failures = 3 total requests
      expect(stats.successRate).toBeCloseTo(33.33, 1); // 1 success out of 3 requests ≈ 33.33%
      expect(stats.strategy).toBe('random'); // Default strategy
      expect(stats.healthScore).toBeGreaterThan(0);
    });

    test('should handle empty statistics correctly', () => {
      const stats = pool.getStats();
      
      expect(stats.totalRequests).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.healthScore).toBeGreaterThan(0); // Health based on enabled agents
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent getNext calls safely', async () => {
      const promises: Promise<string>[] = [];
      
      // Make 10 concurrent calls
      for (let i = 0; i < 10; i++) {
        promises.push(pool.getNext());
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed and return valid agents
      expect(results.length).toBe(10);
      for (const result of results) {
        expect(typeof result).toBe('string');
        expect(TEST_USER_AGENTS).toContain(result);
      }
    });

    test('should handle concurrent success/failure marks safely', async () => {
      const userAgent = TEST_USER_AGENTS[0];
      const promises: Promise<void>[] = [];
      
      // Make concurrent success/failure marks
      for (let i = 0; i < 5; i++) {
        promises.push(pool.markSuccess(userAgent));
        promises.push(pool.markFailure(userAgent));
      }
      
      await Promise.all(promises);
      
      const stats = pool.getAgentStats().find((s: AgentStats) => s.value === userAgent);
      expect(stats?.successCount).toBe(5);
      expect(stats?.failureCount).toBe(5);
      expect(stats?.totalRequests).toBe(10);
    });
  });

  describe('Common User-Agents and Default Pool', () => {
    test('should have predefined common user agents', () => {
      expect(COMMON_USER_AGENTS.CHROME_MAC).toBeDefined();
      expect(COMMON_USER_AGENTS.CHROME_WINDOWS).toBeDefined();
      expect(COMMON_USER_AGENTS.FIREFOX_MAC).toBeDefined();
      expect(COMMON_USER_AGENTS.FIREFOX_WINDOWS).toBeDefined();
      expect(COMMON_USER_AGENTS.SAFARI_MAC).toBeDefined();
      expect(COMMON_USER_AGENTS.EDGE_WINDOWS).toBeDefined();
      
      expect(typeof COMMON_USER_AGENTS.CHROME_MAC).toBe('string');
      expect(COMMON_USER_AGENTS.CHROME_MAC.length).toBeGreaterThan(0);
    });

    test('should create default pool with common agents', () => {
      const defaultPool = createDefaultPool();
      const stats = defaultPool.getStats();
      
      expect(stats.total).toBe(Object.keys(COMMON_USER_AGENTS).length);
      expect(stats.enabled).toBe(stats.total);
      expect(stats.strategy).toBe('random'); // Default strategy
    });

    test('should create default pool with custom config', () => {
      const config: UserAgentPoolConfig = {
        strategy: 'sequential',
        failureThreshold: 5,
      };
      
      const defaultPool = createDefaultPool(config);
      const poolConfig = defaultPool.getConfig();
      
      expect(poolConfig.strategy).toBe('sequential');
      expect(poolConfig.failureThreshold).toBe(5);
    });

    test('should be able to use default pool normally', async () => {
      const defaultPool = createDefaultPool();
      
      const userAgent = await defaultPool.getNext();
      expect(typeof userAgent).toBe('string');
      expect(userAgent.length).toBeGreaterThan(0);
      
      await defaultPool.markSuccess(userAgent);
      
      const agentStats = defaultPool.getAgentStats();
      const usedAgent = agentStats.find((s: AgentStats) => s.value === userAgent);
      expect(usedAgent?.successCount).toBe(1);
    });
  });
});