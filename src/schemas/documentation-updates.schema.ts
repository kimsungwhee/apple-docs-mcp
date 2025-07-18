import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const getDocumentationUpdatesSchema = z.object({
  category: z.enum(['all', 'wwdc', 'technology', 'release-notes']).default('all').describe('Filter by update category'),
  technology: z.string().optional().describe('Filter by specific technology/framework name'),
  year: z.string().optional().describe('Filter WWDC by year (e.g., 2025, 2024)'),
  searchQuery: z.string().optional().describe('Search for specific keywords in updates'),
  includeBeta: z.boolean().default(true).describe('Include beta features'),
  limit: z.number().min(1).max(API_LIMITS.MAX_DOCUMENTATION_UPDATES_LIMIT).default(API_LIMITS.DEFAULT_DOCUMENTATION_UPDATES_LIMIT).describe('Maximum number of results to return'),
});