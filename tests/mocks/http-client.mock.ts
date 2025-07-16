import { jest } from '@jest/globals';

// Mock the http-client module
jest.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    getJson: jest.fn(),
    getText: jest.fn(),
    get: jest.fn(),
  },
  HttpClient: jest.fn().mockImplementation(() => ({
    getJson: jest.fn(),
    getText: jest.fn(),
    get: jest.fn(),
  })),
}));