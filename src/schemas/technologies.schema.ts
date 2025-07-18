import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const listTechnologiesSchema = z.object({
  category: z.string().optional().describe('Filter by technology category'),
  language: z.enum(['swift', 'occ']).optional().describe('Filter by programming language'),
  includeBeta: z.boolean().default(true).describe('Include beta technologies'),
  limit: z.number().int().positive().max(API_LIMITS.MAX_TECHNOLOGIES_LIMIT).default(API_LIMITS.DEFAULT_TECHNOLOGIES_LIMIT).describe('Maximum number of technologies to return'),
});