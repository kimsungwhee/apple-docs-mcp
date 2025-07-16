# Apple Docs MCP Tests

This directory contains comprehensive tests for the Apple Docs MCP server.

## Test Structure

```
tests/
├── helpers/                # Test utilities and helpers
│   └── test-helpers.ts    # Common test data and utility functions
├── mocks/                 # Mock modules
│   ├── cache.mock.ts      # Cache system mocks
│   └── http-client.mock.ts # HTTP client mocks
├── tools/                 # Unit tests for tools
│   ├── search-framework-symbols.test.ts
│   ├── search-parser.test.ts
│   └── doc-fetcher.test.ts
├── integration/           # Integration tests
│   ├── mcp-server.test.ts # MCP server integration tests
│   └── search.test.ts    # Search functionality tests
├── e2e/                   # End-to-end tests
│   └── full-workflow.test.ts
├── utils/                 # Utility tests
│   ├── error-handler.test.ts
│   ├── http-client.test.ts
│   └── url-converter.test.ts
├── basic.test.ts          # Basic test suite
└── setup.ts              # Jest setup file
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/tools/search-framework-symbols.test.ts

# Run tests with coverage
pnpm test -- --coverage

# Run tests in watch mode
pnpm test -- --watch

# Run tests with verbose output
pnpm test -- --verbose
```

## Test Coverage Areas

### 1. Unit Tests
- **Tool Functions**: Each tool has comprehensive unit tests covering:
  - Normal operation
  - Error handling
  - Edge cases
  - Input validation
  - Cache behavior

### 2. Integration Tests
- **MCP Server**: Tests the server lifecycle and request handling
- **Tool Integration**: Tests tools working together

### 3. End-to-End Tests
- **Full Workflows**: Tests complete user scenarios
- **Error Recovery**: Tests error handling and recovery
- **Performance**: Tests concurrent request handling

## Key Test Patterns

### Mocking
- HTTP requests are mocked to avoid external dependencies
- Cache is mocked to control test data
- File system operations are avoided in tests

### Test Data
- Consistent test data is defined in `helpers/test-helpers.ts`
- Mock responses match actual API response structure

### Assertions
- Tests verify both success and error paths
- Response format is validated
- Edge cases are thoroughly tested

## Adding New Tests

When adding new features:
1. Add unit tests for the core functionality
2. Update integration tests if the feature affects the MCP interface
3. Consider adding E2E tests for user-facing features
4. Ensure all tests pass before committing

## Debugging Tests

To debug failing tests:
1. Run the specific test file with `--verbose`
2. Add `console.log` statements in the test
3. Use `--detectOpenHandles` to find async issues
4. Check mock implementations match actual behavior