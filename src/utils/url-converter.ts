/**
 * URL conversion utilities for Apple Developer Documentation
 */

/**
 * Convert a web URL to a JSON API URL
 * @param webUrl The web URL to convert
 * @returns The corresponding JSON API URL
 */
export function convertToJsonApiUrl(webUrl: string): string | null {
  try {
    // Remove trailing slash if present
    if (webUrl.endsWith('/')) {
      webUrl = webUrl.slice(0, -1);
    }

    // Extract the path from the URL
    const urlObj = new URL(webUrl);
    
    // Check if it's an Apple Developer URL
    if (urlObj.hostname !== 'developer.apple.com') {
      return null;
    }
    
    let path = urlObj.pathname;

    // For documentation URLs, format for the JSON API
    if (path.includes('/documentation/')) {
      // Remove /documentation/ prefix
      path = path.replace('/documentation/', '');
      // Convert to JSON API URL format
      return `https://developer.apple.com/tutorials/data/documentation/${path}.json`;
    }

    // For tutorial URLs, try to format for the JSON API
    if (path.includes('/tutorials/')) {
      // Try to convert tutorials URL to JSON API format
      // Remove /tutorials/ prefix and add .json
      const tutorialPath = path.replace('/tutorials/', '');
      return `https://developer.apple.com/tutorials/data/${tutorialPath}.json`;
    }

    // If not a recognized URL format, return the original URL
    return webUrl;
  } catch {
    return null;
  }
}

/**
 * Validate if URL is from Apple Developer domain
 * @param url The URL to validate
 * @returns True if valid Apple Developer URL
 */
export function isValidAppleDeveloperUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'developer.apple.com';
  } catch {
    return false;
  }
}

/**
 * Extract API name from URL
 * @param url The URL to extract name from
 * @returns The API name
 */
export function extractApiNameFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split('/').pop() || 'Unknown API';
  } catch {
    return 'Unknown API';
  }
}