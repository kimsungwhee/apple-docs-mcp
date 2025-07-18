/**
 * Technology overview related types
 */

import type { TechnologyOverviewItem, TechnologyOverviewSection } from '../sections.js';

// Re-export for convenience
export type { TechnologyOverviewItem, TechnologyOverviewSection };

/**
 * Technology overview entry
 */
export interface TechnologyOverview {
  title: string;
  href?: string;
  eyebrow?: string;
  abstract?: string;
  category?: string;
  platform?: string;
  items?: TechnologyOverviewItem[];
}