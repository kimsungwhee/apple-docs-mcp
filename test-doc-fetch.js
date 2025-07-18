#!/usr/bin/env node

import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'get_apple_doc_content',
    arguments: {
      url: 'https://developer.apple.com/documentation/swiftui/text',
      includeRelatedApis: true,
      includePlatformAnalysis: true
    }
  }
};

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        if (response.result && response.result.content) {
          const content = response.result.content[0].text;
          console.log('✅ Successfully fetched SwiftUI Text documentation!\n');
          console.log('Preview:');
          console.log('========');
          console.log(content.substring(0, 500) + '...\n');
          
          // Check for enhanced features
          if (content.includes('## Related APIs')) {
            console.log('✅ Related APIs section found');
          }
          if (content.includes('## Platform Compatibility Analysis')) {
            console.log('✅ Platform analysis section found');
          }
          
          server.kill();
        }
      } catch (e) {
        // Ignore non-JSON
      }
    }
  });
});

server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('Fetching Apple doc')) {
    console.log('📄 Fetching documentation...');
  }
});

// Send request after server initializes
setTimeout(() => {
  console.log('🚀 Testing document fetch with enhanced analysis...\n');
  server.stdin.write(JSON.stringify(request) + '\n');
}, 2000);

// Timeout after 10 seconds
setTimeout(() => {
  console.log('❌ Test timed out');
  server.kill();
}, 10000);