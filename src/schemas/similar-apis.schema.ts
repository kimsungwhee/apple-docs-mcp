import { z } from 'zod';

export const findSimilarApisSchema = z.object({
  apiUrl: z.string().describe('The Apple Developer Documentation API URL to find similar APIs for'),
  searchDepth: z.enum(['shallow', 'medium', 'deep']).default('medium').describe('Search depth for similarity analysis'),
  filterByCategory: z.string().optional().describe('Filter results by category/topic'),
  includeAlternatives: z.boolean().default(true).describe('Include alternative APIs from the same topic section'),
});