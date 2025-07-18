import { z } from 'zod';

export const getAppleDocContentSchema = z.object({
  url: z.string().describe('URL of the Apple Developer Documentation page'),
  includeRelatedApis: z.boolean().default(false).describe('Include related APIs analysis'),
  includeReferences: z.boolean().default(false).describe('Include references resolution'),
  includeSimilarApis: z.boolean().default(false).describe('Include similar APIs discovery'),
  includePlatformAnalysis: z.boolean().default(false).describe('Include platform compatibility analysis'),
});