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

/**
 * Data source type
 */
export type DataSourceType = 'github' | 'local';

/**
 * Global configuration state for data source
 */
interface DataSourceConfig {
  type: DataSourceType;
  localPath: string;
  forceSource?: 'local' | 'github';
  initialized: boolean;
}

let globalConfig: DataSourceConfig = {
  type: 'github',
  localPath: '',
  forceSource: undefined,
  initialized: false,
};

/**
 * Initialize data source configuration from CLI args and environment
 */
export function initializeDataSourceConfig(cliOptions?: {
  localPath?: string;
  useLocal?: boolean;
  forceGithub?: boolean;
}): void {
  if (globalConfig.initialized) {
    return; // Already initialized
  }

  // Priority order: CLI args > Environment > Defaults
  const config: DataSourceConfig = {
    type: 'github',
    localPath: '',
    forceSource: undefined,
    initialized: true,
  };

  // 1. Check CLI arguments (highest priority)
  if (cliOptions?.forceGithub) {
    config.type = 'github';
    config.forceSource = 'github';
  } else if (cliOptions?.localPath) {
    config.localPath = path.resolve(cliOptions.localPath);
    config.type = 'local';
    config.forceSource = 'local';
  } else if (cliOptions?.useLocal) {
    config.localPath = path.join(process.cwd(), WWDC_DATA_SOURCE_CONFIG.local.dataDir);
    config.type = 'local';
    config.forceSource = 'local';
  } else if (WWDC_DATA_SOURCE_CONFIG.env.forceGithub) {
    // 2. Check environment variables (medium priority)
    config.type = 'github';
    config.forceSource = 'github';
  } else if (WWDC_DATA_SOURCE_CONFIG.env.localPath) {
    config.localPath = path.resolve(WWDC_DATA_SOURCE_CONFIG.env.localPath);
    config.type = 'local';
  } else {
    // 3. Auto-detection (lowest priority)
    // Use existing auto-detection logic
    config.type = 'github'; // Will be determined by getDataSourceType()
  }

  globalConfig = config;

  logger.info(`Data source initialized: ${config.type}${config.localPath ? ` (${config.localPath})` : ''}`);
}

/**
 * Get current data source configuration
 */
export function getDataSourceConfig(): DataSourceConfig {
  return { ...globalConfig };
}

// Data source configuration (using constants)
export const DATA_SOURCE_CONFIG = {
  github: WWDC_DATA_SOURCE_CONFIG.github,
  local: {
    get dataDir(): string {
      if (globalConfig.localPath) {
        return path.join(globalConfig.localPath, 'data/wwdc');
      }
      return path.join(process.cwd(), WWDC_DATA_SOURCE_CONFIG.local.dataDir);
    },
  },
};

/**
 * Get data source type with enhanced logic
 */
export async function getDataSourceType(): Promise<DataSourceType> {
  // Initialize if not done yet
  if (!globalConfig.initialized) {
    initializeDataSourceConfig();
  }

  // If force source is set, use it
  if (globalConfig.forceSource) {
    return globalConfig.forceSource;
  }

  // If we have a configured local path, validate it
  if (globalConfig.localPath) {
    try {
      const dataDir = path.join(globalConfig.localPath, 'data/wwdc');
      await fs.access(dataDir);
      await validateLocalDataStructure(dataDir);
      logger.info(`Using local data from: ${dataDir}`);
      return 'local';
    } catch (error) {
      logger.error(`Local path ${globalConfig.localPath} is invalid:`, error);
      logger.warn('Falling back to GitHub');
      return 'github';
    }
  }

  // Use existing auto-detection logic
  if (process.env.NODE_ENV === 'development') {
    return 'local';
  }

  // Check if default local data directory exists
  try {
    const localDataDir = DATA_SOURCE_CONFIG.local.dataDir;
    await fs.access(localDataDir);
    await validateLocalDataStructure(localDataDir);
    return 'local';
  } catch (error) {
    logger.debug('Local data directory not accessible, using GitHub');
  }

  return 'github';
}

/**
 * Validate that local data directory has proper structure
 */
async function validateLocalDataStructure(dataDir: string): Promise<void> {
  const requiredFiles = [
    'index.json',
    'by-year',
    'by-topic',
    'videos',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(dataDir, file);
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Required file/directory missing: ${file}`);
    }
  }

  // Validate index.json structure
  try {
    const indexPath = path.join(dataDir, 'index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(indexData);

    if (!parsed.years || !parsed.topics || !parsed.statistics) {
      throw new Error('Invalid index.json structure');
    }
  } catch (error) {
    throw new Error(`Invalid index.json: ${error instanceof Error ? error.message : String(error)}`);
  }
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
 * Fetch file content from local file system with enhanced path resolution
 */
async function fetchFromLocal(filePath: string): Promise<string> {
  const baseDir = DATA_SOURCE_CONFIG.local.dataDir;
  const fullPath = path.join(baseDir, filePath);

  logger.debug(`Reading from local: ${fullPath}`);

  try {
    // Additional security check - ensure we're not reading outside the data directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedBaseDir = path.resolve(baseDir);

    if (!resolvedPath.startsWith(resolvedBaseDir)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    const content = await fs.readFile(resolvedPath, 'utf-8');

    // Validate JSON if it's a JSON file
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch (error) {
        throw new Error(`Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return content;
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