#!/usr/bin/env node

/**
 * Simple test script for Apple Docs MCP
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test cases
const testCases = [
  {
    name: 'Search SwiftUI Text',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_apple_docs',
        arguments: {
          query: 'SwiftUI Text',
          type: 'all'
        }
      }
    }
  },
  {
    name: 'Get Performance Report',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_performance_report',
        arguments: {}
      }
    }
  },
  {
    name: 'Get Cache Stats',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_cache_stats',
        arguments: {}
      }
    }
  },
  {
    name: 'List Technologies',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'list_technologies',
        arguments: {}
      }
    }
  }
];

console.log('Starting Apple Docs MCP test...\n');

// Spawn the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let currentTest = 0;
let testResults = [];

// Handle server output
server.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Look for complete JSON responses
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        if (response.result) {
          const test = testCases[currentTest - 1];
          console.log(`✅ ${test.name}:`);
          
          // Extract content from response
          if (response.result.content && response.result.content[0]) {
            const content = response.result.content[0].text;
            // Show first 200 characters
            console.log(content.substring(0, 200) + '...\n');
          }
          
          testResults.push({ test: test.name, success: true });
          
          // Run next test
          runNextTest();
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
  });
});

// Handle server errors
server.stderr.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('server running') && 
      !message.includes('Cache system initialized') &&
      !message.includes('Preloading') &&
      !message.includes('warm') &&
      !message.includes('Starting')) {
    console.error('Server error:', message);
  }
});

// Handle server exit
server.on('close', (code) => {
  console.log('\nTest Summary:');
  console.log('=============');
  testResults.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.test}`);
  });
  console.log(`\nTotal: ${testResults.length}/${testCases.length} tests completed`);
  process.exit(code);
});

// Run tests
function runNextTest() {
  if (currentTest < testCases.length) {
    const test = testCases[currentTest];
    console.log(`\nRunning test: ${test.name}`);
    server.stdin.write(JSON.stringify(test.request) + '\n');
    currentTest++;
  } else {
    // All tests complete
    setTimeout(() => {
      server.kill();
    }, 1000);
  }
}

// Wait for server to initialize
setTimeout(() => {
  console.log('Server initialized, starting tests...\n');
  runNextTest();
}, 3000);