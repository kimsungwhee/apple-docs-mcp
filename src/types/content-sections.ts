/**
 * Content section types for Apple documentation
 */

export interface ContentSection {
  kind: string;
  content?: unknown[];
  declarations?: Array<{
    tokens?: Array<{ text?: string }>;
  }>;
  parameters?: Array<{
    name?: string;
    content?: Array<{
      inlineContent?: Array<{ text?: string }>;
    }>;
  }>;
}

export interface ContentItem {
  type: string;
  text?: string;
  inlineContent?: Array<{ 
    type: string;
    text?: string; 
  }>;
  items?: unknown[];
}

export interface ListItem {
  content?: Array<{
    inlineContent?: Array<{ text?: string }>;
  }>;
}