/**
 * Error handling types
 */

/**
 * Application error types
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Application error structure
 */
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  suggestions?: string[];
}

/**
 * MCP Error response structure
 */
export interface ErrorResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError: boolean;
}