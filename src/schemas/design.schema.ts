import { z } from 'zod';

export const searchAppleDesignDocsSchema = z.object({
  query: z.string().describe('Search query for Apple Design and HIG documentation'),
  contentType: z.enum(['all', 'hig', 'resource', 'page']).default('all')
    .describe('Type of Apple Design content to search'),
  platform: z.string().default('all')
    .describe('Platform filter such as iOS, iPadOS, macOS, watchOS, tvOS, or visionOS'),
  limit: z.number().int().min(1).max(50).default(20)
    .describe('Maximum number of results to return'),
});

export const getAppleDesignContentSchema = z.object({
  url: z.url().describe('Apple Design URL to read'),
});

export const listAppleDesignResourcesSchema = z.object({
  category: z.string().optional().describe('Resource category filter'),
  platform: z.string().optional().describe('Platform or subsection filter'),
  format: z.string().optional().describe('Resource format filter such as figma, sketch, dmg, or zip'),
  searchQuery: z.string().optional().describe('Search query for resource titles, notes, and labels'),
  limit: z.number().int().min(1).max(100).default(50)
    .describe('Maximum number of resources to return'),
});

export const downloadAppleDesignResourceSchema = z.object({
  resourceId: z.string().optional().describe('Resource ID returned by list_apple_design_resources'),
  url: z.url().optional().describe('Direct Apple-hosted resource URL to download'),
  maxBytes: z.number().int().min(1).max(250 * 1024 * 1024).optional()
    .describe('Maximum download size in bytes'),
});

export const getAppleDesignExamplesSchema = z.object({
  url: z.url().optional().describe('Apple Design, HIG, preview, or image URL'),
  resourceId: z.string().optional().describe('Resource ID returned by list_apple_design_resources'),
  query: z.string().optional().describe('Search query for examples and thumbnails'),
  limit: z.number().int().min(1).max(10).default(3)
    .describe('Maximum number of image examples to return'),
});
