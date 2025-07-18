/**
 * Section types for Apple documentation
 */

/**
 * Base section interface
 */
interface BaseSection {
  title: string;
  identifiers: string[];
}

/**
 * Topic section in documentation
 */
export interface TopicSection extends BaseSection {
  abstract?: unknown[];
}

/**
 * See Also section
 */
export interface SeeAlsoSection extends BaseSection {
  generated?: boolean;
}

/**
 * Relationship section
 */
export interface RelationshipSection extends BaseSection {
  type?: string;
  kind?: string;
}

/**
 * Documentation update section
 */
export interface UpdateSection {
  title: string;
  items: UpdateItem[];
}

/**
 * Documentation update item
 */
export interface UpdateItem {
  title: string;
  href?: string;
  eyebrow?: string;
  abstract?: string;
}

/**
 * Technology overview section
 */
export interface TechnologyOverviewSection {
  title: string;
  href?: string;
  eyebrow?: string;
  items?: TechnologyOverviewItem[];
}

/**
 * Technology overview item
 */
export interface TechnologyOverviewItem {
  title: string;
  href?: string;
  abstract?: string;
}