#!/usr/bin/env node

/**
 * 部署验证脚本
 * 
 * 验证 UserAgent 池在生产环境的功能和性能，确保所有组件正常工作。
 * 
 * 功能：
 * - UserAgent 池初始化验证
 * - 基本搜索功能测试
 * - UserAgent 轮换功能验证
 * - 并发性能测试
 * - 错误处理验证
 * - 健康检查和统计报告
 * 
 * @author Apple Docs MCP
 * @version 1.0.0
 */

import { performance } from 'perf_hooks';
import { UserAgentPool, createDefaultPool, type PoolStats } from '../dist/utils/user-agent-pool.js';
import { httpGet } from '../dist/utils/http-client.js';

interface ValidationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
  details?: any;
}

class DeploymentValidator {
  private results: ValidationResult[] = [];
  private pool: UserAgentPool | null = null;

  /**
   * 记录测试结果
   */
  private logResult(test: string, status: 'pass' | 'fail' | 'warning', message: string, duration?: number, details?: any) {
    const result: ValidationResult = { test, status, message, duration, details };
    this.results.push(result);
    
    const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    const durationStr = duration ? ` (${duration.toFixed(2)}ms)` : '';
    console.log(`${statusIcon} ${test}: ${message}${durationStr}`);
    
    if (details && process.env.NODE_ENV === 'development') {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }
  }

  /**
   * 验证 UserAgent 池初始化
   */
  async validatePoolInitialization(): Promise<void> {
    const startTime = performance.now();
    
    try {
      this.pool = createDefaultPool({
        strategy: 'smart',
        disableDuration: 30000, // 30 seconds for testing
        failureThreshold: 2,
        minSuccessRate: 0.7
      });
      
      const stats = this.pool.getStats();
      const duration = performance.now() - startTime;
      
      if (stats.total > 0 && stats.enabled > 0) {
        this.logResult(
          'UserAgent 池初始化',
          'pass',
          `成功初始化，包含 ${stats.total} 个 UserAgent，${stats.enabled} 个已启用`,
          duration,
          { strategy: stats.strategy, healthScore: stats.healthScore }
        );
      } else {
        this.logResult(
          'UserAgent 池初始化',
          'fail',
          '池初始化成功但没有可用的 UserAgent',
          duration,
          stats
        );
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logResult(
        'UserAgent 池初始化',
        'fail',
        `初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        duration
      );
    }
  }

  /**
   * 验证基本功能
   */
  async validateBasicFunctionality(): Promise<void> {
    if (!this.pool) {
      this.logResult('基本功能测试', 'fail', '无法测试：UserAgent 池未初始化');
      return;
    }

    const startTime = performance.now();
    
    try {
      // 测试简单的 API 调用
      const testUrl = 'https://developer.apple.com/documentation/search?q=SwiftUI&type=documentation';
      const response = await httpGet(testUrl, { timeout: 10000 });
      
      const duration = performance.now() - startTime;
      
      if (response && response.length > 0) {
        this.logResult(
          '基本功能测试',
          'pass',
          `搜索功能正常，返回 ${response.length} 字符`,
          duration
        );
      } else {
        this.logResult(
          '基本功能测试',
          'warning',
          '搜索功能响应但返回空内容',
          duration
        );
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logResult(
        '基本功能测试',
        'fail',
        `搜索功能失败: ${error instanceof Error ? error.message : String(error)}`,
        duration
      );
    }
  }

  /**
   * 验证 UserAgent 轮换功能
   */
  async validateUserAgentRotation(): Promise<void> {
    if (!this.pool) {
      this.logResult('UserAgent 轮换测试', 'fail', '无法测试：UserAgent 池未初始化');
      return;
    }

    const startTime = performance.now();
    
    try {
      const agents = new Set<string>();
      const iterations = 5;
      
      for (let i = 0; i < iterations; i++) {
        const agent = await this.pool.getNext();
        agents.add(agent);
      }
      
      const duration = performance.now() - startTime;
      const uniqueCount = agents.size;
      
      if (uniqueCount > 1) {
        this.logResult(
          'UserAgent 轮换测试',
          'pass',
          `轮换功能正常，${iterations} 次请求使用了 ${uniqueCount} 个不同的 UserAgent`,
          duration,
          { uniqueAgents: uniqueCount, totalRequests: iterations }
        );
      } else if (uniqueCount === 1) {
        this.logResult(
          'UserAgent 轮换测试',
          'warning',
          '轮换功能工作但总是返回相同的 UserAgent',
          duration,
          { agent: Array.from(agents)[0] }
        );
      } else {
        this.logResult(
          'UserAgent 轮换测试',
          'fail',
          '轮换功能无法获取任何 UserAgent',
          duration
        );
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logResult(
        'UserAgent 轮换测试',
        'fail',
        `轮换功能错误: ${error instanceof Error ? error.message : String(error)}`,
        duration
      );
    }
  }

  /**
   * 验证并发性能
   */
  async validateConcurrentPerformance(): Promise<void> {
    if (!this.pool) {
      this.logResult('并发性能测试', 'fail', '无法测试：UserAgent 池未初始化');
      return;
    }

    const startTime = performance.now();
    const concurrency = 3;
    const testUrls = [
      'https://developer.apple.com/documentation/search?q=UIKit&type=documentation',
      'https://developer.apple.com/documentation/search?q=Foundation&type=documentation',
      'https://developer.apple.com/documentation/search?q=CoreData&type=documentation'
    ];
    
    try {
      const promises = testUrls.map(url => 
        httpGet(url, { timeout: 8000 }).catch(err => ({ error: err.message }))
      );
      
      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      const successful = results.filter(result => !('error' in result)).length;
      const failed = results.length - successful;
      
      if (successful >= 2) {
        this.logResult(
          '并发性能测试',
          'pass',
          `${successful}/${results.length} 个并发请求成功`,
          duration,
          { successful, failed, avgTime: duration / results.length }
        );
      } else if (successful >= 1) {
        this.logResult(
          '并发性能测试',
          'warning',
          `${successful}/${results.length} 个并发请求成功，部分失败`,
          duration,
          { successful, failed }
        );
      } else {
        this.logResult(
          '并发性能测试',
          'fail',
          '所有并发请求都失败了',
          duration,
          { errors: results.map(r => 'error' in r ? r.error : 'unknown') }
        );
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logResult(
        '并发性能测试',
        'fail',
        `并发测试错误: ${error instanceof Error ? error.message : String(error)}`,
        duration
      );
    }
  }

  /**
   * 验证统计和健康检查
   */
  async validateStatsAndHealth(): Promise<void> {
    if (!this.pool) {
      this.logResult('统计和健康检查', 'fail', '无法测试：UserAgent 池未初始化');
      return;
    }

    const startTime = performance.now();
    
    try {
      const stats = this.pool.getStats();
      const agentStats = this.pool.getAgentStats();
      const browserStats = this.pool.getStatsByBrowserType();
      
      const duration = performance.now() - startTime;
      
      // 健康检查
      const healthScore = stats.healthScore;
      const hasEnabledAgents = stats.enabled > 0;
      const hasValidStats = stats.totalRequests >= 0;
      
      if (healthScore >= 70 && hasEnabledAgents && hasValidStats) {
        this.logResult(
          '统计和健康检查',
          'pass',
          `健康评分: ${healthScore}%，${stats.enabled}/${stats.total} 个 UserAgent 可用`,
          duration,
          {
            poolStats: stats,
            totalAgents: agentStats.length,
            browserTypes: Object.keys(browserStats).length
          }
        );
      } else if (hasEnabledAgents && hasValidStats) {
        this.logResult(
          '统计和健康检查',
          'warning',
          `健康评分较低: ${healthScore}%，但基本功能正常`,
          duration,
          { healthScore, enabled: stats.enabled }
        );
      } else {
        this.logResult(
          '统计和健康检查',
          'fail',
          '健康检查失败：无可用 UserAgent 或统计数据异常',
          duration,
          stats
        );
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logResult(
        '统计和健康检查',
        'fail',
        `健康检查错误: ${error instanceof Error ? error.message : String(error)}`,
        duration
      );
    }
  }

  /**
   * 生成最终报告
   */
  generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 部署验证报告');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log(`\n📊 测试结果汇总:`);
    console.log(`   ✅ 通过: ${passed}`);
    console.log(`   ❌ 失败: ${failed}`);
    console.log(`   ⚠️  警告: ${warnings}`);
    console.log(`   📝 总计: ${this.results.length}`);
    
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`\n⏱️  总耗时: ${totalDuration.toFixed(2)}ms`);
    
    if (failed === 0) {
      console.log(`\n🎉 部署验证成功！所有关键功能都正常工作。`);
      if (warnings > 0) {
        console.log(`⚠️  请注意 ${warnings} 个警告项目，建议进一步调查。`);
      }
    } else {
      console.log(`\n🚨 部署验证失败！发现 ${failed} 个关键问题需要解决。`);
      console.log(`\n❌ 失败的测试:`);
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }
    
    // 设置退出代码
    process.exitCode = failed > 0 ? 1 : 0;
  }

  /**
   * 运行完整的部署验证
   */
  async runValidation(): Promise<void> {
    console.log('🚀 开始部署验证...\n');
    
    await this.validatePoolInitialization();
    await this.validateBasicFunctionality();
    await this.validateUserAgentRotation();
    await this.validateConcurrentPerformance();
    await this.validateStatsAndHealth();
    
    this.generateReport();
  }
}

// 主执行函数
async function main() {
  const validator = new DeploymentValidator();
  
  try {
    await validator.runValidation();
  } catch (error) {
    console.error('🚨 验证过程中发生未捕获的错误:', error);
    process.exit(1);
  }
}

// 执行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DeploymentValidator };