import { z } from 'zod';

export const getPlatformCompatibilitySchema = z.object({
  apiUrl: z.string().describe('The Apple Developer Documentation API URL to analyze platform compatibility for'),
  compareMode: z.enum(['single', 'framework']).default('single').describe('Analysis mode: single API or entire framework comparison'),
  includeRelated: z.boolean().default(false).describe('Include platform compatibility of related APIs'),
});