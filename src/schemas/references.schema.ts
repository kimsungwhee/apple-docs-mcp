import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const resolveReferencesBatchSchema = z.object({
  sourceUrl: z.string().describe('The Apple Developer Documentation URL to extract and resolve references from'),
  maxReferences: z.number().min(1).max(API_LIMITS.MAX_REFERENCES_LIMIT).default(API_LIMITS.DEFAULT_REFERENCES_LIMIT).describe('Maximum number of references to resolve'),
  filterByType: z.enum(['all', 'symbol', 'collection', 'article', 'protocol', 'class', 'struct', 'enum']).default('all').describe('Filter references by type'),
});