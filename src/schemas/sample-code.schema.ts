import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const getSampleCodeSchema = z.object({
  framework: z.string().optional().describe('Filter by framework name (e.g., "SwiftUI", "UIKit", "CoreML")'),
  beta: z.enum(['include', 'exclude', 'only']).default('include').describe('Beta sample handling (include=show all, exclude=hide beta, only=beta only)'),
  searchQuery: z.string().optional().describe('Search for specific keywords in sample code titles or descriptions'),
  limit: z.number().min(1).max(API_LIMITS.MAX_SAMPLE_CODE_LIMIT).default(API_LIMITS.DEFAULT_SAMPLE_CODE_LIMIT).describe('Maximum number of results to return'),
});