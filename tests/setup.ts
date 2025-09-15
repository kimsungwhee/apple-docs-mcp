/**
 * Jest test setup file
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock the path module to avoid import.meta.url issues
jest.mock('../src/utils/wwdc-data-source-path.js', () => ({
  getWWDCDataDirectory: jest.fn(() => '/mock/data/wwdc')
}));

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(30000);

// Mock fetch for tests
global.fetch = jest.fn();

// Helper to create mock fetch responses
(global as any).createMockResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response);
};

// Helper to create mock fetch error
(global as any).createMockError = (message: string) => {
  return Promise.reject(new Error(message));
};