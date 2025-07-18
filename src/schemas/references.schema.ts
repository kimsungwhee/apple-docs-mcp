import { z } from 'zod';

export const resolveReferencesBatchSchema = z.object({
  sourceUrl: z.string().describe('The Apple Developer Documentation URL to extract and resolve references from'),
  maxReferences: z.number().min(1).max(50).default(20).describe('Maximum number of references to resolve'),
  filterByType: z.enum(['all', 'symbol', 'collection', 'article', 'protocol', 'class', 'struct', 'enum']).default('all').describe('Filter references by type'),
});