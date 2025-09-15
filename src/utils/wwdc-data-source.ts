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
 * Configuration for data source
 */
interface DataSourceConfig {
  type: DataSourceType;
  localPath: string;
  forceSource?: 'local' | 'github';
}

/**
 * Singleton manager for data source configuration
 */
class DataSourceConfigManager {
  private static config: DataSourceConfig | null = null;

  /**
   * Initialize the configuration manager
   */
  static initialize(cliOptions?: {
    localPath?: string;
    useLocal?: boolean;
    forceGithub?: boolean;
  }): void {
    if (this.config) {
      logger.debug('DataSourceConfigManager already initialized');
      return;
    }

    // Build configuration with priority order: CLI args > Environment > Defaults
    const config: DataSourceConfig = {
      type: 'github',
      localPath: '',
      forceSource: undefined,
    };

    if (cliOptions?.forceGithub) {
      config.type = 'github';
      config.forceSource = 'github';
      logger.warn('⚠ Force GitHub mode enabled - ignoring any local data paths');
    } else if (cliOptions?.localPath) {
      config.localPath = path.resolve(cliOptions.localPath);
      config.type = 'local';
      // Don't force - allow validation and fallback
      logger.info(`▫ Local path configured: ${config.localPath}`);
      logger.info('   Path will be validated with automatic fallback to GitHub if invalid');
    } else if (cliOptions?.useLocal) {
      config.localPath = path.join(process.cwd(), WWDC_DATA_SOURCE_CONFIG.local.dataDir);
      config.type = 'local';
      // Don't force - allow validation and fallback
      logger.info(`▫ Using local data directory: ${config.localPath}`);
      logger.info('   Path will be validated with automatic fallback to GitHub if invalid');
    } else if (WWDC_DATA_SOURCE_CONFIG.env.forceGithub) {
      config.type = 'github';
      config.forceSource = 'github';
      logger.warn('⚠ Force GitHub mode enabled via environment - ignoring any local data paths');
    } else if (WWDC_DATA_SOURCE_CONFIG.env.localPath) {
      config.localPath = path.resolve(WWDC_DATA_SOURCE_CONFIG.env.localPath);
      config.type = 'local';
      logger.info('▫ Local path configured with validation enabled (will fallback to GitHub if invalid)');
    }

    this.config = Object.freeze(config);
    logger.info(`Data source initialized: ${config.type}${config.localPath ? ` (${config.localPath})` : ''}`);
  }

  /**
   * Get the current configuration
   */
  static getConfig(): DataSourceConfig {
    if (!this.config) {
      this.initialize();
    }
    // Type assertion is safe here since initialize() ensures config is set
    return this.config as DataSourceConfig;
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  static reset(): void {
    this.config = null;
  }
}

/**
 * Initialize data source configuration from CLI args and environment
 * @deprecated Use DataSourceConfigManager.initialize() instead
 */
export function initializeDataSourceConfig(cliOptions?: {
  localPath?: string;
  useLocal?: boolean;
  forceGithub?: boolean;
}): void {
  DataSourceConfigManager.initialize(cliOptions);
}

/**
 * Get current data source configuration
 * @deprecated Use DataSourceConfigManager.getConfig() instead
 */
export function getDataSourceConfig(): DataSourceConfig & { initialized: boolean } {
  const config = DataSourceConfigManager.getConfig();
  return {
    ...config,
    initialized: true, // Always true since getConfig() auto-initializes
  };
}

// Data source configuration (using constants)
export const DATA_SOURCE_CONFIG = {
  github: WWDC_DATA_SOURCE_CONFIG.github,
  local: {
    get dataDir(): string {
      const config = DataSourceConfigManager.getConfig();
      if (config.localPath) {
        return path.join(config.localPath, 'data/wwdc');
      }
      return path.join(process.cwd(), WWDC_DATA_SOURCE_CONFIG.local.dataDir);
    },
  },
};

/**
 * Get data source type with enhanced logic
 */
export async function getDataSourceType(): Promise<DataSourceType> {
  const config = DataSourceConfigManager.getConfig();

  // If force source is set, use it without validation
  if (config.forceSource) {
    // Currently only forceGithub is supported as a force option
    return config.forceSource;
  }

  // If we have a configured local path, validate it
  if (config.localPath) {
    logger.debug('Validating local path (fallback to GitHub enabled)...');
    try {
      const dataDir = path.join(config.localPath, 'data/wwdc');
      await fs.access(dataDir);
      await validateLocalDataStructure(dataDir);
      logger.info(`✓ Using validated local data from: ${dataDir}`);
      return 'local';
    } catch (error) {
      // More specific error handling
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          logger.warn(`⚠ Local data directory not found at ${config.localPath}`);
        } else if (nodeError.code === 'EACCES') {
          logger.error(`✗ Permission denied accessing local data at ${config.localPath}`);
        } else if (error.message.includes('Required file')) {
          logger.error(`✗ Incomplete local data structure: ${error.message}`);
        } else if (error.message.includes('Invalid index.json')) {
          logger.error(`✗ Corrupted local data: ${error.message}`);
        } else {
          logger.error(`✗ Failed to access local data: ${error.message}`);
        }
      } else {
        logger.error(`✗ Unknown error accessing local data at ${config.localPath}:`, error);
      }
      logger.warn('→ Falling back to GitHub data source');
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
    // Provide more context for auto-detection failures
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        logger.debug('Default local data directory not found, using GitHub');
      } else if (nodeError.code === 'EACCES') {
        logger.debug('Permission denied for default local data directory, using GitHub');
      } else {
        logger.debug(`Local data directory not accessible (${error.message}), using GitHub`);
      }
    } else {
      logger.debug('Local data directory not accessible, using GitHub');
    }
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
    let parsed;

    try {
      parsed = JSON.parse(indexData);
    } catch (jsonError) {
      if (jsonError instanceof SyntaxError) {
        throw new Error(`Malformed JSON: ${jsonError.message}`);
      }
      throw jsonError;
    }

    if (!parsed.years || !parsed.topics || !parsed.statistics) {
      const missing = [];
      if (!parsed.years) missing.push('years');
      if (!parsed.topics) missing.push('topics');
      if (!parsed.statistics) missing.push('statistics');
      throw new Error(`Invalid index.json structure: missing ${missing.join(', ')}`);
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
    // More specific error handling for network issues
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        logger.error(`GitHub rate limit exceeded for: ${filePath}`);
        throw new Error(`GitHub rate limit exceeded. Please try again later.`);
      } else if (error.message.includes('404') || error.message.includes('Not found')) {
        logger.error(`File not found on GitHub: ${filePath}`);
        throw new Error(`File not found on GitHub: ${filePath}`);
      } else if (error.message.includes('timeout')) {
        logger.error(`Request timeout while fetching: ${filePath}`);
        throw new Error(`Request timeout. The GitHub server is taking too long to respond.`);
      } else if (error.message.includes('Network') || error.name === 'TypeError') {
        logger.error(`Network error while fetching: ${filePath}`, error);
        throw new Error(`Network error. Please check your internet connection.`);
      } else if (error.message.includes('HTTP 5')) {
        logger.error(`GitHub server error for: ${filePath}`);
        throw new Error(`GitHub server error. Please try again later.`);
      }
    }

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
    // Enhanced security check for cross-platform compatibility
    const resolvedPath = path.resolve(fullPath);
    const resolvedBaseDir = path.resolve(baseDir);

    // Use path.relative for better cross-platform support
    const relativePath = path.relative(resolvedBaseDir, resolvedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    // Additional check for Windows drive letters
    if (process.platform === 'win32' && relativePath.includes(':')) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    const content = await fs.readFile(resolvedPath, 'utf-8');

    // Validate JSON if it's a JSON file
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch (jsonError) {
        // More specific JSON error messages
        if (jsonError instanceof SyntaxError) {
          const match = jsonError.message.match(/position (\d+)/);
          const position = match ? ` at position ${match[1]}` : '';
          throw new Error(`Malformed JSON in ${filePath}${position}: ${jsonError.message}`);
        }
        throw new Error(`Invalid JSON in ${filePath}: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
      }
    }

    return content;
  } catch (error) {
    // Re-throw if it's already a handled error
    if (error instanceof Error && (
      error.message.includes('Invalid file path') ||
      error.message.includes('Malformed JSON') ||
      error.message.includes('Invalid JSON')
    )) {
      throw error;
    }

    // More specific file system error handling
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === 'EISDIR') {
        logger.error(`Attempted to read directory as file: ${fullPath}`);
        throw new Error(`Cannot read directory as file: ${filePath}`);
      } else if (nodeError.code === 'EMFILE') {
        logger.error(`Too many open files in system`);
        throw new Error(`System resource limit: too many open files`);
      } else if (nodeError.code === 'ENOMEM') {
        logger.error(`Out of memory while reading: ${fullPath}`);
        throw new Error(`Out of memory: file may be too large`);
      } else if (nodeError.code === 'ENOTDIR') {
        logger.error(`Path component is not a directory: ${fullPath}`);
        throw new Error(`Invalid path: component is not a directory`);
      } else if (nodeError.code === 'ENAMETOOLONG') {
        logger.error(`Path name too long: ${fullPath}`);
        throw new Error(`Path name too long for the system`);
      }
    }

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
  const source = dataSource ?? await getDataSourceType();

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

/**
 * Export the DataSourceConfigManager for advanced use cases and testing
 */
export { DataSourceConfigManager };