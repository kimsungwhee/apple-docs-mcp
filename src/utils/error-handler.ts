/**
 * Unified error handling utilities
 */

import { ERROR_MESSAGES } from './constants.js';

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  suggestions?: string[];
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: AppError): any {
  let message = `Error: ${error.message}`;

  if (error.suggestions && error.suggestions.length > 0) {
    message += '\n\nSuggestions:\n' + error.suggestions.map(s => `• ${s}`).join('\n');
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
    isError: true,
  };
}

/**
 * Handle fetch errors with specific error types
 */
export function handleFetchError(error: unknown, url: string): AppError {
  if (error instanceof TypeError) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: ERROR_MESSAGES.NETWORK_ERROR,
      originalError: error,
      suggestions: [
        'Check your internet connection',
        'Verify the URL is accessible',
        'Try again in a few moments',
      ],
    };
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return {
        type: ErrorType.TIMEOUT,
        message: ERROR_MESSAGES.TIMEOUT,
        originalError: error,
        suggestions: [
          'Try again with a simpler query',
          'Check your network connection',
        ],
      };
    }

    if (error.message.includes('404')) {
      return {
        type: ErrorType.NOT_FOUND,
        message: ERROR_MESSAGES.NOT_FOUND,
        originalError: error,
        suggestions: [
          'Search for the topic in Apple Developer Documentation',
          'Check if this is an outdated link',
          `Visit the original URL directly: ${url}`,
        ],
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: String(error),
  };
}

/**
 * Handle JSON parsing errors
 */
export function handleParseError(error: unknown): AppError {
  return {
    type: ErrorType.PARSE_ERROR,
    message: ERROR_MESSAGES.PARSE_FAILED,
    originalError: error instanceof Error ? error : undefined,
    suggestions: [
      'The API response format may have changed',
      'Try again later',
      'Report this issue if it persists',
    ],
  };
}

/**
 * Validate input parameters
 */
export function validateInput(value: string, fieldName: string, minLength: number = 1): AppError | null {
  if (!value || value.trim().length < minLength) {
    return {
      type: ErrorType.INVALID_INPUT,
      message: `${fieldName} is required and must be at least ${minLength} character(s)`,
      suggestions: [
        `Provide a valid ${fieldName.toLowerCase()}`,
        'Check the parameter format',
      ],
    };
  }
  return null;
}

/**
 * Log error for debugging (only in development)
 */
export function logError(error: AppError, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context || 'ERROR'}]`, {
      type: error.type,
      message: error.message,
      originalError: error.originalError,
    });
  }
}