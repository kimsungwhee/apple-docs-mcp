/**
 * Core Apple Developer Documentation types
 */

/**
 * Platform information for Apple documentation
 */
export interface PlatformInfo {
  name?: string;
  introducedAt?: string;
  current?: string;
  deprecated?: boolean;
  deprecatedAt?: string;
  beta?: boolean;
}

/**
 * Metadata for Apple documentation
 */
export interface AppleDocMetadata {
  title?: string;
  roleHeading?: string;
  sourceLanguage?: string;
  platforms?: PlatformInfo[];
  symbolKind?: string;
  role?: string;
  modules?: Array<{ name: string }>;
  externalID?: string;
  parent?: {
    title: string;
    url: string;
  };
  required?: boolean;
  conformance?: {
    availabilityPrefix?: Array<{ text: string }>;
    conformancePrefix?: Array<{ text: string }>;
    constraints?: Array<{ text: string }>;
  };
}

/**
 * Reference to another Apple documentation item
 */
export interface AppleDocReference {
  title: string;
  url: string;
  type?: string;
  role?: string;
  kind?: string;
  abstract?: unknown[];
  identifier?: string;
  fragments?: Array<{
    kind: string;
    text: string;
  }>;
}

/**
 * Main Apple documentation data structure
 */
export interface AppleDocData {
  identifier?: string;
  title?: string;
  url?: string;
  abstract?: unknown[];
  metadata?: AppleDocMetadata;
  references?: Record<string, AppleDocReference>;
  primaryContentSections?: unknown[];
  topicSections?: Array<{
    title: string;
    identifiers: string[];
  }>;
  relationshipsSections?: Array<{
    title: string;
    type?: string;
    identifiers: string[];
  }>;
  seeAlsoSections?: Array<{
    title: string;
    identifiers: string[];
  }>;
  availability?: unknown;
  hierarchy?: {
    paths?: string[][];
  };
  variants?: Array<{
    paths?: string[];
    traits?: Array<{
      interfaceLanguage?: string;
    }>;
  }>;
}

/**
 * Apple documentation JSON structure
 */
export interface AppleDocJSON extends Omit<AppleDocData, 'identifier'> {
  data?: AppleDocData;
  identifier?: {
    url?: string;
    interfaceLanguage?: string;
  };
  schemaVersion?: {
    major?: number;
    minor?: number;
    patch?: number;
  };
}