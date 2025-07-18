import { z } from 'zod';

export const getRelatedApisSchema = z.object({
  apiUrl: z.string().describe('The Apple Developer Documentation API URL to find related APIs for'),
  includeInherited: z.boolean().default(true).describe('Include inherited APIs'),
  includeConformance: z.boolean().default(true).describe('Include conformance relationships'),
  includeSeeAlso: z.boolean().default(true).describe('Include "See Also" related APIs'),
});