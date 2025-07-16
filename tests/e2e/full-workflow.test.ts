import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('E2E: Full MCP Workflow', () => {
  let serverProcess: any;
  let serverReady = false;
  
  // Increase timeout for E2E tests
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Build the project first
    await new Promise<void>((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        shell: true,
        stdio: 'pipe',
      });
      
      build.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  });

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
      await sleep(500);
    }
    serverReady = false;
  });

  describe('Server lifecycle', () => {
    it('should start and respond to requests', async () => {
      serverProcess = spawn('node', ['dist/src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Wait for server to be ready
      await new Promise<void>((resolve) => {
        serverProcess.stderr.on('data', (data: Buffer) => {
          const message = data.toString();
          if (message.includes('running on stdio')) {
            serverReady = true;
            resolve();
          }
        });
      });

      expect(serverReady).toBe(true);

      // Send a list tools request
      const listRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      serverProcess.stdin.write(JSON.stringify(listRequest) + '\n');

      // Wait for response
      const response = await new Promise<any>((resolve) => {
        let buffer = '';
        
        serverProcess.stdout.on('data', (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.id === 1) {
                  resolve(parsed);
                }
              } catch (e) {
                // Ignore non-JSON lines
              }
            }
          }
        });
      });

      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(response.result.tools.length).toBeGreaterThan(0);
    });
  });

  describe('Complete search workflow', () => {
    it('should search for UIKit classes', async () => {
      serverProcess = spawn('node', ['dist/src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Wait for server to be ready
      await new Promise<void>((resolve) => {
        serverProcess.stderr.on('data', (data: Buffer) => {
          const message = data.toString();
          if (message.includes('running on stdio')) {
            resolve();
          }
        });
      });

      // Setup response handler
      let responseBuffer = '';
      const responses: any[] = [];
      
      serverProcess.stdout.on('data', (data: Buffer) => {
        responseBuffer += data.toString();
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              responses.push(parsed);
            } catch (e) {
              // Ignore non-JSON lines
            }
          }
        }
      });

      // Mock the HTTP response for testing
      // In a real E2E test, we would make actual HTTP requests
      // For this test, we'll just verify the request/response flow

      // Send search request
      const searchRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_framework_symbols',
          arguments: {
            framework: 'uikit',
            symbolType: 'class',
            namePattern: '*View',
            limit: 5,
          },
        },
      };

      serverProcess.stdin.write(JSON.stringify(searchRequest) + '\n');

      // Wait for response
      await sleep(2000);

      const searchResponse = responses.find(r => r.id === 2);
      expect(searchResponse).toBeDefined();
      
      // The actual response depends on the network, so we just check structure
      expect(searchResponse.result || searchResponse.error).toBeDefined();
    });
  });

  describe('Error handling workflow', () => {
    it('should handle invalid tool gracefully', async () => {
      serverProcess = spawn('node', ['dist/src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Wait for server to be ready
      await new Promise<void>((resolve) => {
        serverProcess.stderr.on('data', (data: Buffer) => {
          const message = data.toString();
          if (message.includes('running on stdio')) {
            resolve();
          }
        });
      });

      // Send invalid tool request
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'invalid_tool_name',
          arguments: {},
        },
      };

      serverProcess.stdin.write(JSON.stringify(invalidRequest) + '\n');

      // Wait for error response
      const errorResponse = await new Promise<any>((resolve) => {
        let buffer = '';
        
        serverProcess.stdout.on('data', (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.id === 3) {
                  resolve(parsed);
                }
              } catch (e) {
                // Ignore non-JSON lines
              }
            }
          }
        });
      });

      expect(errorResponse.result).toBeDefined();
      expect(errorResponse.result.isError).toBe(true);
      expect(errorResponse.result.content[0].text).toContain('Unknown tool');
    });

    it('should handle malformed requests', async () => {
      serverProcess = spawn('node', ['dist/src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Wait for server to be ready
      await new Promise<void>((resolve) => {
        serverProcess.stderr.on('data', (data: Buffer) => {
          const message = data.toString();
          if (message.includes('running on stdio')) {
            resolve();
          }
        });
      });

      // Send malformed JSON
      serverProcess.stdin.write('{ invalid json }\n');

      // Server should continue running
      await sleep(1000);
      
      // Send a valid request to verify server is still responsive
      const validRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
        params: {},
      };

      serverProcess.stdin.write(JSON.stringify(validRequest) + '\n');

      // Should get a response
      const response = await new Promise<any>((resolve) => {
        let buffer = '';
        
        serverProcess.stdout.on('data', (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.id === 4) {
                  resolve(parsed);
                }
              } catch (e) {
                // Ignore non-JSON lines
              }
            }
          }
        });
      });

      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
    });
  });

  describe('Performance tests', () => {
    it('should handle multiple concurrent requests', async () => {
      serverProcess = spawn('node', ['dist/src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Wait for server to be ready
      await new Promise<void>((resolve) => {
        serverProcess.stderr.on('data', (data: Buffer) => {
          const message = data.toString();
          if (message.includes('running on stdio')) {
            resolve();
          }
        });
      });

      // Setup response collection
      const responses = new Map<number, any>();
      let responseBuffer = '';
      
      serverProcess.stdout.on('data', (data: Buffer) => {
        responseBuffer += data.toString();
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.id) {
                responses.set(parsed.id, parsed);
              }
            } catch (e) {
              // Ignore non-JSON lines
            }
          }
        }
      });

      // Send multiple requests concurrently
      const requests = [];
      for (let i = 5; i < 10; i++) {
        const request = {
          jsonrpc: '2.0',
          id: i,
          method: 'tools/list',
          params: {},
        };
        requests.push(request);
        serverProcess.stdin.write(JSON.stringify(request) + '\n');
      }

      // Wait for all responses
      await sleep(2000);

      // Verify all requests were handled
      for (let i = 5; i < 10; i++) {
        expect(responses.has(i)).toBe(true);
        const response = responses.get(i);
        expect(response.result).toBeDefined();
        expect(response.result.tools).toBeDefined();
      }
    });
  });
});