/**
 * WWDC Data Source Manager
 * Supports fetching data from GitHub or local file system
 */

import fs from 'fs/promises';
import path from 'path';
import { httpClient } from './http-client.js';
import { logger } from './logger.js';
import { wwdcDataCache } from './cache.js';
import { WWDC_DATA_SOURCE_CONFIG, WWDC_CONFIG } from './constants.js';
import type { WWDCVideo, GlobalMetadata, TopicIndex, YearIndex } from '../types/wwdc.js';

// Data source configuration (using constants)
export const DATA_SOURCE_CONFIG = {
  github: WWDC_DATA_SOURCE_CONFIG.github,
  local: {
    // Use relative path from project root
    dataDir: path.join(process.cwd(), WWDC_DATA_SOURCE_CONFIG.local.dataDir),
  },
};

/**
 * Data source type
 */
export type DataSourceType = 'github' | 'local';

/**
 * Get data source type
 */
export async function getDataSourceType(): Promise<DataSourceType> {
  // Use local data in development environment
  if (process.env.NODE_ENV === 'development') {
    return 'local';
  }

  // Check if local data directory exists
  try {
    const localDataDir = DATA_SOURCE_CONFIG.local.dataDir;
    await fs.access(localDataDir);
    return 'local';
  } catch (error) {
    logger.debug('Local data directory not accessible, using GitHub');
  }

  // Default to GitHub
  return 'github';
}

/**
 * Fetch file content from GitHub
 */
async function fetchFromGitHub(filePath: string): Promise<string> {
  const url = `${DATA_SOURCE_CONFIG.github.baseUrl}/${filePath}`;
  logger.debug(`Fetching from GitHub: ${url}`);

  try {
    const response = await httpClient.get(url);
    return await response.text();
  } catch (error) {
    logger.error(`Failed to fetch from GitHub: ${url}`, error);
    throw new Error(`Failed to fetch ${filePath} from GitHub: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch file content from local file system
 */
async function fetchFromLocal(filePath: string): Promise<string> {
  const fullPath = path.join(DATA_SOURCE_CONFIG.local.dataDir, filePath);
  logger.debug(`Reading from local: ${fullPath}`);

  try {
    return await fs.readFile(fullPath, 'utf-8');
  } catch (error) {
    logger.error(`Failed to read local file: ${fullPath}`, error);
    throw new Error(`Failed to read ${filePath} from local: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generic data fetching function
 */
async function fetchData(filePath: string, dataSource?: DataSourceType): Promise<string> {
  const cacheKey = `data:${filePath}`;

  // Check cache
  const cached = wwdcDataCache.get<string>(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for: ${filePath}`);
    return cached;
  }

  // Determine data source
  const source = dataSource || await getDataSourceType();

  // Fetch data
  let data: string;
  if (source === 'github') {
    data = await fetchFromGitHub(filePath);
  } else {
    data = await fetchFromLocal(filePath);
  }

  // Cache data with TTL from constants
  wwdcDataCache.set(cacheKey, data, WWDC_CONFIG.CACHE_TTL);

  return data;
}

/**
 * Load global metadata
 */
export async function loadGlobalMetadata(dataSource?: DataSourceType): Promise<GlobalMetadata> {
  try {
    const data = await fetchData(WWDC_DATA_SOURCE_CONFIG.filePaths.globalMetadata, dataSource);
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to load global metadata', error);
    throw new Error(`Failed to load global metadata: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load topic index
 */
export async function loadTopicIndex(topicId: string, dataSource?: DataSourceType): Promise<TopicIndex> {
  try {
    const data = await fetchData(WWDC_DATA_SOURCE_CONFIG.filePaths.topicIndex(topicId), dataSource);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to load topic index: ${topicId}`, error);
    throw new Error(`Failed to load topic index ${topicId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load year index
 */
export async function loadYearIndex(year: string, dataSource?: DataSourceType): Promise<YearIndex> {
  try {
    const data = await fetchData(WWDC_DATA_SOURCE_CONFIG.filePaths.yearIndex(year), dataSource);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to load year index: ${year}`, error);
    throw new Error(`Failed to load year index ${year}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load video data
 */
export async function loadVideoData(videoFile: string, dataSource?: DataSourceType): Promise<WWDCVideo> {
  try {
    const data = await fetchData(videoFile, dataSource);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to load video data: ${videoFile}`, error);
    throw new Error(`Failed to load video data ${videoFile}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Batch load video data
 */
export async function loadVideosData(videoFiles: string[], dataSource?: DataSourceType): Promise<WWDCVideo[]> {
  const videos: WWDCVideo[] = [];

  // Use Promise.allSettled to handle partial failures
  const results = await Promise.allSettled(
    videoFiles.map(file => loadVideoData(file, dataSource)),
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      videos.push(result.value);
    } else {
      logger.warn(`Failed to load video data: ${videoFiles[index]}`, result.reason);
    }
  });

  return videos;
}

/**
 * Get all available topics
 */
export async function getAvailableTopics(dataSource?: DataSourceType): Promise<string[]> {
  try {
    const metadata = await loadGlobalMetadata(dataSource);
    return metadata.topics.map(topic => topic.id);
  } catch (error) {
    logger.error('Failed to get available topics', error);
    throw new Error(`Failed to get available topics: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all available years
 */
export async function getAvailableYears(dataSource?: DataSourceType): Promise<string[]> {
  try {
    const metadata = await loadGlobalMetadata(dataSource);
    return metadata.years;
  } catch (error) {
    logger.error('Failed to get available years', error);
    throw new Error(`Failed to get available years: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clear cache
 */
export function clearDataCache(): void {
  wwdcDataCache.clear();
  logger.info('WWDC data cache cleared');
}

/**
 * Get cache statistics
 */
export function getDataCacheStats() {
  return wwdcDataCache.getStats();
}