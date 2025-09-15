/**
 * WWDC Data Source - Loads data from bundled JSON files
 *
 * This module provides functions to load WWDC video data from
 * JSON files that are bundled with the npm package.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { wwdcDataCache } from './cache.js';
import { WWDC_CONFIG } from './constants.js';
import type { WWDCVideo, GlobalMetadata, TopicIndex, YearIndex } from '../types/wwdc.js';

// Get the data directory
// After build, data is copied to dist/data
// The compiled JS is in dist/utils/, so data is at ../data
let WWDC_DATA_DIR: string;

// Handle both runtime and test environments
if (process.env.NODE_ENV === 'test') {
  // In test environment, use a fixed path
  WWDC_DATA_DIR = path.resolve(process.cwd(), 'data/wwdc');
} else {
  // In production, use import.meta.url
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirPath = path.dirname(currentFilePath);
  WWDC_DATA_DIR = path.resolve(currentDirPath, '../data/wwdc');
}

/**
 * Read file from bundled data directory
 */
async function readBundledFile(filePath: string): Promise<string> {
  const fullPath = path.join(WWDC_DATA_DIR, filePath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    logger.debug(`Loaded bundled data: ${filePath}`);
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to read bundled data: ${filePath}`, error);
    throw new Error(`Failed to load WWDC data from ${filePath}: ${errorMessage}`);
  }
}

/**
 * Fetch data with caching support
 */
async function fetchData(filePath: string): Promise<string> {
  const cacheKey = `wwdc:${filePath}`;

  // Check cache first
  const cached = wwdcDataCache.get<string>(cacheKey);
  if (cached) {
    logger.debug(`Cache hit: ${filePath}`);
    return cached;
  }

  // Read from bundled data
  const data = await readBundledFile(filePath);

  // Cache the data
  wwdcDataCache.set(cacheKey, data, WWDC_CONFIG.CACHE_TTL);

  return data;
}

/**
 * Load global metadata (index.json)
 */
export async function loadGlobalMetadata(): Promise<GlobalMetadata> {
  try {
    const data = await fetchData('index.json');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to load global metadata', error);
    throw new Error('Failed to load WWDC metadata. Please ensure the package is properly installed.');
  }
}

/**
 * Load topic index
 */
export async function loadTopicIndex(topicId: string): Promise<TopicIndex> {
  try {
    const data = await fetchData(`by-topic/${topicId}/index.json`);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to load topic index: ${topicId}`, error);
    throw new Error(`Topic not found: ${topicId}`);
  }
}

/**
 * Load year index
 */
export async function loadYearIndex(year: string): Promise<YearIndex> {
  try {
    const data = await fetchData(`by-year/${year}/index.json`);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to load year index: ${year}`, error);
    throw new Error(`Year not found: ${year}`);
  }
}

/**
 * Load individual video data
 */
export async function loadVideoData(year: string, videoId: string): Promise<WWDCVideo> {
  try {
    const data = await fetchData(`videos/${year}-${videoId}.json`);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to load video: ${year}-${videoId}`, error);
    throw new Error(`Video not found: ${year}-${videoId}`);
  }
}

/**
 * Load all videos list
 */
export async function loadAllVideos(): Promise<WWDCVideo[]> {
  try {
    const data = await fetchData('all-videos.json');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to load all videos', error);
    throw new Error('Failed to load WWDC video list');
  }
}

/**
 * Clear the WWDC data cache
 */
export function clearDataCache(): void {
  wwdcDataCache.clear();
  logger.info('WWDC data cache cleared');
}

/**
 * Check if WWDC data is available
 */
export async function isDataAvailable(): Promise<boolean> {
  try {
    await fs.access(WWDC_DATA_DIR);
    await fs.access(path.join(WWDC_DATA_DIR, 'index.json'));
    return true;
  } catch {
    return false;
  }
}