/**
 * Separate module for handling data directory path resolution
 * This is isolated to avoid import.meta.url issues in tests
 */

import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the WWDC data directory path
 */
export function getWWDCDataDirectory(): string {
  // In test environment, use current working directory
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return path.resolve(process.cwd(), 'data/wwdc');
  }

  // In production, use import.meta.url
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirPath = path.dirname(currentFilePath);

  // After build, data is copied to dist/data
  // The compiled JS is in dist/utils/, so data is at ../data
  return path.resolve(currentDirPath, '../data/wwdc');
}