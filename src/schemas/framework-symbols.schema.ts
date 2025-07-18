import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const searchFrameworkSymbolsSchema = z.object({
  framework: z.string().describe('Framework name (e.g., "swiftui", "uikit", "foundation")'),
  symbolType: z.enum(['all', 'class', 'struct', 'enum', 'protocol', 'method', 'property', 'init', 'func', 'var', 'let', 'typealias']).default('all').describe('Type of symbol to search for'),
  namePattern: z.string().optional().describe('Optional name pattern to filter results (supports * wildcard)'),
  language: z.enum(['swift', 'occ']).default('swift').describe('Programming language'),
  limit: z.number().min(1).max(API_LIMITS.MAX_FRAMEWORK_SYMBOLS_LIMIT).default(API_LIMITS.DEFAULT_FRAMEWORK_SYMBOLS_LIMIT).describe('Maximum number of results to return'),
});