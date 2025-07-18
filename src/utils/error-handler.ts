/**
 * Unified error handling utilities
 */

import { ERROR_MESSAGES } from './constants.js';
import type { AppError, ErrorResponse } from '../types/error.js';
import { ErrorType } from '../types/error.js';
import { logger } from './logger.js';

// Re-export for backward compatibility
export type { AppError };
export { ErrorType };

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: AppError): ErrorResponse {
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
    logger.error(`[${context ?? 'ERROR'}] ${error.message}`, error.originalError);
  }
}

/**
 * Handle generic errors and convert them to AppError
 */
export function handleGenericError(error: unknown, context: string, fallbackMessage?: string): AppError {
  logger.error(`Error in ${context}:`, error);

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return {
        type: ErrorType.TIMEOUT,
        message: ERROR_MESSAGES.TIMEOUT,
        originalError: error,
        suggestions: [
          'Try again with a simpler query',
          'Check your network connection',
          'Verify the service is available',
        ],
      };
    }

    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return {
        type: ErrorType.RATE_LIMITED,
        message: 'Request rate limit exceeded',
        originalError: error,
        suggestions: [
          'Wait a moment before trying again',
          'Consider reducing the frequency of requests',
        ],
      };
    }

    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return {
        type: ErrorType.SERVICE_UNAVAILABLE,
        message: 'Apple Developer Documentation service is temporarily unavailable',
        originalError: error,
        suggestions: [
          'Try again in a few minutes',
          'Check Apple Developer status page',
          'Verify your internet connection',
        ],
      };
    }

    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return handleParseError(error);
    }

    return {
      type: ErrorType.API_ERROR,
      message: error.message,
      originalError: error,
      suggestions: [
        'Check the request parameters',
        'Try again later',
        'Verify the API endpoint is correct',
      ],
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: fallbackMessage || `An error occurred in ${context}`,
    suggestions: [
      'Try again later',
      'Check your input parameters',
      'Contact support if the issue persists',
    ],
  };
}

/**
 * Create a standardized error response with consistent formatting
 */
export function createStandardErrorResponse(error: unknown, operation: string): ErrorResponse {
  const appError = handleGenericError(error, operation);
  return createErrorResponse(appError);
}

/**
 * Wrap async functions with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackMessage?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const appError = handleGenericError(error, context, fallbackMessage);
    logError(appError, context);
    throw appError;
  }
}

/**
 * Validate multiple input parameters
 */
export function validateInputs(
  validations: Array<{ value: string; fieldName: string; minLength?: number }>,
): AppError | null {
  for (const validation of validations) {
    const error = validateInput(validation.value, validation.fieldName, validation.minLength);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Handle cache-related errors
 */
export function handleCacheError(error: unknown, operation: string): AppError {
  return {
    type: ErrorType.CACHE_ERROR,
    message: `Cache operation failed: ${operation}`,
    originalError: error instanceof Error ? error : undefined,
    suggestions: [
      'The operation will continue without cache',
      'Try clearing the cache if issues persist',
    ],
  };
}

/**
 * Tool-specific error suggestions
 */
export const TOOL_ERROR_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  search_apple_docs: {
    [ErrorType.NOT_FOUND]: [
      'Try broader search terms (e.g., "UIView" instead of "UIViewAnimationOptions")',
      'Use framework names like "SwiftUI" or "UIKit"',
      'Check spelling and avoid special characters',
      'For WWDC videos, use search_wwdc_content instead',
    ],
    [ErrorType.INVALID_INPUT]: [
      'Provide specific API or framework names',
      'Avoid generic terms like "how to" or "tutorial"',
      'Use technical terms like class names or method names',
    ],
  },

  get_apple_doc_content: {
    [ErrorType.NOT_FOUND]: [
      'Verify the URL starts with https://developer.apple.com/documentation/',
      'Use search_apple_docs first to find valid URLs',
      'Check if the API might have been renamed or moved',
    ],
    [ErrorType.INVALID_INPUT]: [
      'URL must be a complete Apple Developer Documentation URL',
      'Example: https://developer.apple.com/documentation/uikit/uiview',
    ],
  },

  search_framework_symbols: {
    [ErrorType.NOT_FOUND]: [
      'Use list_technologies to find exact framework identifiers',
      'Framework names should be lowercase (e.g., "uikit" not "UIKit")',
      'Some frameworks might be part of larger frameworks',
    ],
    [ErrorType.INVALID_INPUT]: [
      'Framework identifier must be in lowercase',
      'Common identifiers: "uikit", "swiftui", "foundation", "combine"',
      'Use list_technologies to discover available frameworks',
    ],
  },

  list_wwdc_videos: {
    [ErrorType.NOT_FOUND]: [
      'Available years are 2020-2025',
      'Use "all" to see videos from all years',
      'Topic searches are case-insensitive partial matches',
    ],
    [ErrorType.INVALID_INPUT]: [
      'Year should be a 4-digit string like "2025"',
      'Topic can be any keyword like "SwiftUI" or "Performance"',
    ],
  },

  search_wwdc_content: {
    [ErrorType.NOT_FOUND]: [
      'Try different search terms or broaden your query',
      'Search is case-insensitive',
      'Use technical terms that would appear in transcripts',
    ],
    [ErrorType.INVALID_INPUT]: [
      'Query is required and cannot be empty',
      'searchIn must be "transcript", "code", or "both"',
    ],
  },

  get_platform_compatibility: {
    [ErrorType.API_ERROR]: [
      'Platform data might not be available for all APIs',
      'Try using the single API mode instead of framework mode',
      'Some newer APIs might not have compatibility data yet',
    ],
  },

  find_similar_apis: {
    [ErrorType.NOT_FOUND]: [
      'Not all APIs have similar alternatives documented',
      'Try using a broader search depth ("deep" instead of "shallow")',
      'Consider using get_related_apis for inheritance relationships',
    ],
  },
};

/**
 * Get tool-specific error suggestions
 */
export function getToolErrorSuggestions(toolName: string, errorType: ErrorType): string[] {
  const toolSuggestions = TOOL_ERROR_SUGGESTIONS[toolName]?.[errorType];
  if (toolSuggestions) {
    return toolSuggestions;
  }

  // Default suggestions based on error type
  switch (errorType) {
    case ErrorType.NOT_FOUND:
      return [
        'Verify the input parameters are correct',
        'Try using a search tool first to find valid values',
        'Check if the resource exists on developer.apple.com',
      ];
    case ErrorType.INVALID_INPUT:
      return [
        'Check the parameter format and requirements',
        'Refer to the tool description for examples',
        'Ensure all required parameters are provided',
      ];
    case ErrorType.TIMEOUT:
      return [
        'Try with fewer results or simpler queries',
        'The service might be temporarily slow',
        'Consider breaking the request into smaller parts',
      ];
    default:
      return [];
  }
}

/**
 * Create error response with tool-specific suggestions
 */
export function createToolErrorResponse(
  error: AppError,
  toolName: string,
): ErrorResponse {
  const toolSuggestions = getToolErrorSuggestions(toolName, error.type);

  if (toolSuggestions.length > 0) {
    error.suggestions = [...(error.suggestions ?? []), ...toolSuggestions];
  }

  return createErrorResponse(error);
}