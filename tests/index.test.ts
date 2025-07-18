import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Mock all dependencies
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../src/tools/definitions.js', () => ({
  toolDefinitions: [
    {
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
        required: ['input'],
      },
    },
  ],
}));
jest.mock('../src/tools/handlers.js', () => ({
  handleToolCall: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Test result' }],
  }),
}));

// Import after mocks
import { handleToolCall } from '../src/tools/handlers.js';

describe('AppleDeveloperDocsMCPServer', () => {
  let mockServer: any;
  let mockTransport: any;
  let AppleDeveloperDocsMCPServer: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock server
    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
    };
    (Server as jest.MockedClass<typeof Server>).mockImplementation(() => mockServer);

    // Setup mock transport
    mockTransport = {};
    (StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>).mockImplementation(() => mockTransport);

    // Import the class after mocks are set up
    const module = await import('../src/index.js');
    AppleDeveloperDocsMCPServer = module.default;
  });

  describe('constructor', () => {
    it('should create server with correct configuration', () => {
      new AppleDeveloperDocsMCPServer();

      expect(Server).toHaveBeenCalledWith(
        {
          name: 'apple-docs-mcp',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
    });

    it('should setup tools and error handling', () => {
      new AppleDeveloperDocsMCPServer();

      // Should register two request handlers
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
      
      // First call should be for ListToolsRequestSchema
      expect(mockServer.setRequestHandler).toHaveBeenNthCalledWith(
        1,
        ListToolsRequestSchema,
        expect.any(Function)
      );
      
      // Second call should be for CallToolRequestSchema
      expect(mockServer.setRequestHandler).toHaveBeenNthCalledWith(
        2,
        CallToolRequestSchema,
        expect.any(Function)
      );
    });
  });

  describe('tool listing', () => {
    it('should return tool definitions when listing tools', async () => {
      new AppleDeveloperDocsMCPServer();

      // Get the handler function
      const listToolsHandler = mockServer.setRequestHandler.mock.calls[0][1];
      const result = await listToolsHandler({});

      expect(result).toEqual({
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string' },
              },
              required: ['input'],
            },
          },
        ],
      });
    });
  });

  describe('tool calling', () => {
    it('should handle tool calls successfully', async () => {
      const server = new AppleDeveloperDocsMCPServer();

      // Get the handler function
      const callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];
      const result = await callToolHandler({
        params: {
          name: 'test_tool',
          arguments: { input: 'test' },
        },
      });

      expect(handleToolCall).toHaveBeenCalledWith('test_tool', { input: 'test' }, server);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Test result' }],
      });
    });

    it('should handle tool call errors', async () => {
      const server = new AppleDeveloperDocsMCPServer();
      (handleToolCall as jest.Mock).mockRejectedValueOnce(new Error('Tool error'));

      // Get the handler function
      const callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];
      const result = await callToolHandler({
        params: {
          name: 'test_tool',
          arguments: { input: 'test' },
        },
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Tool error',
          },
        ],
        isError: true,
      });
    });

    it('should handle non-Error exceptions', async () => {
      const server = new AppleDeveloperDocsMCPServer();
      (handleToolCall as jest.Mock).mockRejectedValueOnce('String error');

      // Get the handler function
      const callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];
      const result = await callToolHandler({
        params: {
          name: 'test_tool',
          arguments: { input: 'test' },
        },
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: An unknown error occurred',
          },
        ],
        isError: true,
      });
    });
  });

  describe('run method', () => {
    it('should create transport and start server', async () => {
      const server = new AppleDeveloperDocsMCPServer();
      await server.run();

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });
  });

  describe('public methods', () => {
    let server: any;

    beforeEach(() => {
      server = new AppleDeveloperDocsMCPServer();
    });

    it('should have searchAppleDocs method', () => {
      expect(server.searchAppleDocs).toBeDefined();
      expect(typeof server.searchAppleDocs).toBe('function');
    });

    it('should have getAppleDocContent method', () => {
      expect(server.getAppleDocContent).toBeDefined();
      expect(typeof server.getAppleDocContent).toBe('function');
    });

    it('should have listTechnologies method', () => {
      expect(server.listTechnologies).toBeDefined();
      expect(typeof server.listTechnologies).toBe('function');
    });

    it('should have searchFrameworkSymbols method', () => {
      expect(server.searchFrameworkSymbols).toBeDefined();
      expect(typeof server.searchFrameworkSymbols).toBe('function');
    });

    it('should have getRelatedApis method', () => {
      expect(server.getRelatedApis).toBeDefined();
      expect(typeof server.getRelatedApis).toBe('function');
    });

    it('should have resolveReferencesBatch method', () => {
      expect(server.resolveReferencesBatch).toBeDefined();
      expect(typeof server.resolveReferencesBatch).toBe('function');
    });

    it('should have getPlatformCompatibility method', () => {
      expect(server.getPlatformCompatibility).toBeDefined();
      expect(typeof server.getPlatformCompatibility).toBe('function');
    });

    it('should have findSimilarApis method', () => {
      expect(server.findSimilarApis).toBeDefined();
      expect(typeof server.findSimilarApis).toBe('function');
    });

    it('should have getDocumentationUpdates method', () => {
      expect(server.getDocumentationUpdates).toBeDefined();
      expect(typeof server.getDocumentationUpdates).toBe('function');
    });

    it('should have getTechnologyOverviews method', () => {
      expect(server.getTechnologyOverviews).toBeDefined();
      expect(typeof server.getTechnologyOverviews).toBe('function');
    });

    it('should have getSampleCode method', () => {
      expect(server.getSampleCode).toBeDefined();
      expect(typeof server.getSampleCode).toBe('function');
    });
  });
});