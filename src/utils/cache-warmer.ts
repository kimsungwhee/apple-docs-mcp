/**
 * Cache warming strategies for improved performance
 */

import { handleListTechnologies } from '../tools/list-technologies.js';
import { handleGetDocumentationUpdates } from '../tools/get-documentation-updates.js';
import { handleGetTechnologyOverviews } from '../tools/get-technology-overviews.js';
import { apiCache, technologiesCache, updatesCache, technologyOverviewsCache } from './cache.js';
import { logger } from './logger.js';

/**
 * Warm up frequently accessed caches
 */
export async function warmUpCaches(): Promise<void> {
  logger.info('Starting cache warm-up...');

  const warmUpTasks = [
    warmUpTechnologiesCache(),
    warmUpUpdatesCache(),
    warmUpOverviewsCache(),
  ];

  await Promise.allSettled(warmUpTasks);
  logger.info('Cache warm-up completed');
}

/**
 * Warm up technologies list cache
 */
async function warmUpTechnologiesCache(): Promise<void> {
  try {
    logger.info('Warming up technologies cache...');

    // Load all technologies
    await handleListTechnologies(undefined, undefined, true);

    // Load popular categories
    const popularCategories = [
      'app-frameworks',
      'graphics-and-games',
      'app-services',
      'system',
    ];

    for (const category of popularCategories) {
      await handleListTechnologies(category, undefined, true);
    }

    const stats = technologiesCache.getStats();
    logger.info(`Technologies cache warmed up: ${stats.size} entries`);
  } catch (error) {
    logger.error('Failed to warm up technologies cache:', error);
  }
}

/**
 * Warm up documentation updates cache
 */
async function warmUpUpdatesCache(): Promise<void> {
  try {
    logger.info('Warming up updates cache...');

    // Load recent updates
    await handleGetDocumentationUpdates('all', undefined, undefined, undefined, true, 50);

    // Load WWDC updates
    await handleGetDocumentationUpdates('wwdc', undefined, '2024', undefined, true, 20);
    await handleGetDocumentationUpdates('wwdc', undefined, '2023', undefined, true, 20);

    const stats = updatesCache.getStats();
    logger.info(`Updates cache warmed up: ${stats.size} entries`);
  } catch (error) {
    logger.error('Failed to warm up updates cache:', error);
  }
}

/**
 * Warm up technology overviews cache
 */
async function warmUpOverviewsCache(): Promise<void> {
  try {
    logger.info('Warming up technology overviews cache...');

    // Load popular categories
    const categories = [
      'swiftui',
      'uikit',
      'app-design-and-ui',
      'ai-machine-learning',
      'augmented-reality',
    ];

    for (const category of categories) {
      await handleGetTechnologyOverviews(category, 'all', undefined, true, 20);
    }

    const stats = technologyOverviewsCache.getStats();
    logger.info(`Technology overviews cache warmed up: ${stats.size} entries`);
  } catch (error) {
    logger.error('Failed to warm up overviews cache:', error);
  }
}

/**
 * Get cache warm-up status
 */
export function getCacheWarmUpStatus(): {
  technologiesCacheSize: number;
  updatesCacheSize: number;
  overviewsCacheSize: number;
  apiCacheSize: number;
  totalCacheEntries: number;
  } {
  const techStats = technologiesCache.getStats();
  const updatesStats = updatesCache.getStats();
  const overviewsStats = technologyOverviewsCache.getStats();
  const apiStats = apiCache.getStats();

  return {
    technologiesCacheSize: techStats.size,
    updatesCacheSize: updatesStats.size,
    overviewsCacheSize: overviewsStats.size,
    apiCacheSize: apiStats.size,
    totalCacheEntries: techStats.size + updatesStats.size + overviewsStats.size + apiStats.size,
  };
}

/**
 * Schedule periodic cache refresh
 */
export function schedulePeriodicCacheRefresh(intervalMs: number = 30 * 60 * 1000): void {
  logger.info(`Scheduling cache refresh every ${intervalMs / 1000 / 60} minutes`);

  setInterval(() => {
    logger.info('Running periodic cache refresh...');
    void warmUpCaches();
  }, intervalMs);
}