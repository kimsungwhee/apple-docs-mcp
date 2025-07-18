/**
 * Framework preloader for performance optimization
 */

import { searchFrameworkSymbols } from '../tools/search-framework-symbols.js';
import { indexCache } from './cache.js';

/**
 * Popular frameworks to preload
 */
const POPULAR_FRAMEWORKS = [
  'swiftui',
  'uikit', 
  'foundation',
  'combine',
  'coredata',
  'avfoundation',
  'metal',
  'spritekit',
  'scenekit',
  'arkit',
];

/**
 * Preload popular framework indexes
 */
export async function preloadPopularFrameworks(): Promise<void> {
  console.error('Starting framework preload...');
  
  const preloadPromises = POPULAR_FRAMEWORKS.map(async (framework) => {
    try {
      // Check if already cached
      const cacheKey = `framework-index-${framework}`;
      if (indexCache.has(cacheKey)) {
        console.error(`Framework ${framework} already cached, skipping...`);
        return;
      }
      
      // Load framework index with minimal results
      console.error(`Preloading framework: ${framework}`);
      await searchFrameworkSymbols(framework, 'all', undefined, 'swift', 1);
      
      console.error(`Successfully preloaded: ${framework}`);
    } catch (error) {
      console.error(`Failed to preload ${framework}:`, error);
    }
  });
  
  await Promise.all(preloadPromises);
  console.error('Framework preload completed');
}

/**
 * Preload specific frameworks based on user patterns
 */
export async function preloadFrameworksByUsage(
  recentFrameworks: string[]
): Promise<void> {
  // Get unique frameworks not in popular list
  const frameworksToPreload = recentFrameworks
    .filter(f => !POPULAR_FRAMEWORKS.includes(f.toLowerCase()))
    .map(f => f.toLowerCase());
  
  if (frameworksToPreload.length === 0) {
    return;
  }
  
  console.error(`Preloading ${frameworksToPreload.length} user-specific frameworks...`);
  
  const preloadPromises = frameworksToPreload.map(async (framework) => {
    try {
      await searchFrameworkSymbols(framework, 'all', undefined, 'swift', 1);
      console.error(`Preloaded user framework: ${framework}`);
    } catch (error) {
      console.error(`Failed to preload user framework ${framework}:`, error);
    }
  });
  
  await Promise.all(preloadPromises);
}

/**
 * Get preload statistics
 */
export function getPreloadStats(): {
  preloadedFrameworks: string[];
  totalCached: number;
  cacheHitRate: string;
} {
  const stats = indexCache.getStats();
  const preloadedFrameworks = POPULAR_FRAMEWORKS.filter(framework => {
    const cacheKey = `framework-index-${framework}`;
    return indexCache.has(cacheKey);
  });
  
  return {
    preloadedFrameworks,
    totalCached: stats.size,
    cacheHitRate: stats.hitRate,
  };
}