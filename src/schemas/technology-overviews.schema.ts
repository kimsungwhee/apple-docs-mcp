import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const getTechnologyOverviewsSchema = z.object({
  category: z.string().optional().describe('Filter by specific category (e.g., "app-design-and-ui", "games", "ai-machine-learning")'),
  platform: z.enum(['all', 'ios', 'macos', 'watchos', 'tvos', 'visionos']).default('all').describe('Filter by platform'),
  searchQuery: z.string().optional().describe('Search for specific keywords in overviews'),
  includeSubcategories: z.boolean().default(true).describe('Include subcategories and nested content'),
  limit: z.number().min(1).max(API_LIMITS.MAX_TECHNOLOGY_OVERVIEWS_LIMIT).default(API_LIMITS.DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT).describe('Maximum number of results to return'),
});