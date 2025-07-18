/**
 * Platform compatibility related types
 */

/**
 * Platform availability information
 */
export interface PlatformAvailability {
  platform: string;
  introduced?: string;
  deprecated?: string;
  obsoleted?: string;
  message?: string;
  renamed?: string;
  current?: string;
  beta?: boolean;
}

/**
 * Platform compatibility result
 */
export interface PlatformCompatibilityResult {
  api: {
    title: string;
    url: string;
    type?: string;
  };
  platforms: PlatformAvailability[];
  relatedApis?: Array<{
    title: string;
    url: string;
    platforms: PlatformAvailability[];
  }>;
}