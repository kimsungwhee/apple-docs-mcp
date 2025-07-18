import { z } from 'zod';

export const listTechnologiesSchema = z.object({
  category: z.string().optional().describe('Filter by technology category'),
  language: z.enum(['swift', 'occ']).optional().describe('Filter by programming language'),
  includeBeta: z.boolean().default(true).describe('Include beta technologies'),
});