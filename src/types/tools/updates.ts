/**
 * Documentation updates related types
 */

/**
 * Documentation update entry
 */
export interface DocumentationUpdate {
  title: string;
  href?: string;
  eyebrow?: string;
  abstract?: string;
  category?: 'wwdc' | 'technology' | 'release-notes';
  year?: string;
  isBeta?: boolean;
}

/**
 * Updates index section
 */
export interface UpdatesIndexSection {
  title: string;
  items: DocumentationUpdate[];
}