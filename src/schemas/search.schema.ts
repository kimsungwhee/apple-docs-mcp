import { z } from 'zod';

export const searchAppleDocsSchema = z.object({
  query: z.string().describe('Search query for Apple Developer Documentation'),
  type: z.enum(['all', 'documentation', 'sample']).default('all')
    .describe('Type of content to search for (documentation=API reference, sample=code samples)'),
});