/**
 * Sample code related types
 */

/**
 * Sample code entry
 */
export interface SampleCode {
  title: string;
  href?: string;
  eyebrow?: string;
  abstract?: string;
  framework?: string;
  isBeta?: boolean;
  isFeatured?: boolean;
}

/**
 * Sample code section
 */
export interface SampleCodeSection {
  title: string;
  items: SampleCode[];
}