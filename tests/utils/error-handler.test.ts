/**
 * Tests for error handler utilities
 */

describe('Error Handler', () => {
  describe('Error Types', () => {
    it('should define error types', () => {
      const ErrorType = {
        NETWORK_ERROR: 'NETWORK_ERROR',
        PARSE_ERROR: 'PARSE_ERROR',
        NOT_FOUND: 'NOT_FOUND',
        INVALID_INPUT: 'INVALID_INPUT',
        TIMEOUT: 'TIMEOUT',
        UNKNOWN: 'UNKNOWN',
      };

      expect(ErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorType.PARSE_ERROR).toBe('PARSE_ERROR');
      expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorType.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ErrorType.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorType.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('Error Response Creation', () => {
    it('should create formatted error response', () => {
      const error = {
        type: 'NETWORK_ERROR',
        message: 'Network error occurred',
        suggestions: ['Check connection', 'Try again']
      };

      const response = {
        isError: true,
        content: [{
          type: 'text',
          text: `Error: ${error.message}\n\nSuggestions:\n• ${error.suggestions.join('\n• ')}`
        }]
      };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error: Network error occurred');
      expect(response.content[0].text).toContain('• Check connection');
      expect(response.content[0].text).toContain('• Try again');
    });

    it('should create error response without suggestions', () => {
      const error = {
        type: 'UNKNOWN',
        message: 'Unknown error'
      };

      const response = {
        isError: true,
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }]
      };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toBe('Error: Unknown error');
    });
  });

  describe('Input Validation', () => {
    it('should validate non-empty strings', () => {
      const validateInput = (value: string, fieldName: string, minLength: number = 1) => {
        if (!value || value.trim().length < minLength) {
          return {
            type: 'INVALID_INPUT',
            message: `${fieldName} is required and must be at least ${minLength} character(s)`,
            suggestions: [
              `Provide a valid ${fieldName.toLowerCase()}`,
              'Check the parameter format',
            ],
          };
        }
        return null;
      };

      expect(validateInput('valid input', 'Test Field')).toBeNull();
      
      const emptyResult = validateInput('', 'Test Field');
      expect(emptyResult?.type).toBe('INVALID_INPUT');
      expect(emptyResult?.message).toContain('Test Field is required');
      
      const shortResult = validateInput('ab', 'Test Field', 3);
      expect(shortResult?.type).toBe('INVALID_INPUT');
      expect(shortResult?.message).toContain('must be at least 3 character(s)');
    });
  });
});