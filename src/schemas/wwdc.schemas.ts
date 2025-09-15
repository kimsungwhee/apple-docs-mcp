/**
 * Zod schemas for WWDC tools
 */

import { z } from 'zod';

/**
 * Schema for list_wwdc_videos
 */
export const listWWDCVideosSchema = z.object({
  year: z.string().optional().describe('Filter by WWDC year'),
  topic: z.string().optional().describe('Filter by topic keyword'),
  hasCode: z.boolean().optional().describe('Filter by code availability'),
  limit: z.number().min(1).max(200).default(50).describe('Maximum number of videos'),
});

/**
 * Schema for search_wwdc_content
 */
export const searchWWDCContentSchema = z.object({
  query: z.string().min(1).describe('Search query'),
  searchIn: z.enum(['transcript', 'code', 'both']).default('both').describe('Where to search'),
  year: z.string().optional().describe('Filter by WWDC year'),
  language: z.string().optional().describe('Filter code by language'),
  limit: z.number().min(1).max(100).default(20).describe('Maximum number of results'),
});

/**
 * Schema for get_wwdc_video
 */
export const getWWDCVideoSchema = z.object({
  year: z.string().describe('WWDC year'),
  videoId: z.string().describe('Video ID'),
  includeTranscript: z.boolean().default(true).describe('Include transcript'),
  includeCode: z.boolean().default(true).describe('Include code examples'),
});

/**
 * Schema for get_wwdc_code_examples
 */
export const getWWDCCodeExamplesSchema = z.object({
  framework: z.string().optional().describe('Filter by framework'),
  topic: z.string().optional().describe('Filter by topic'),
  year: z.string().optional().describe('Filter by WWDC year'),
  language: z.string().optional().describe('Filter by programming language'),
  limit: z.number().min(1).max(100).default(30).describe('Maximum number of examples'),
});

/**
 * Schema for browse_wwdc_topics
 */
export const browseWWDCTopicsSchema = z.object({
  topicId: z.string().optional().describe('Specific topic ID to browse'),
  includeVideos: z.boolean().default(true).describe('Include video list'),
  year: z.string().optional().describe('Filter videos by year'),
  limit: z.number().min(1).max(100).default(20).describe('Maximum number of videos per topic'),
});

/**
 * Schema for find_related_wwdc_videos
 */
export const findRelatedWWDCVideosSchema = z.object({
  videoId: z.string().describe('Video ID to find related videos for'),
  year: z.string().describe('Year of the source video'),
  includeExplicitRelated: z.boolean().default(true).describe('Include explicitly related videos'),
  includeTopicRelated: z.boolean().default(true).describe('Include videos from same topics'),
  includeYearRelated: z.boolean().default(false).describe('Include videos from same year'),
  limit: z.number().min(1).max(50).default(15).describe('Maximum number of related videos'),
});

/**
 * Schema for list_wwdc_years
 */
export const listWWDCYearsSchema = z.object({});