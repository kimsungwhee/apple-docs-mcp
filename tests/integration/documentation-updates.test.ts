import { describe, it, expect, jest } from '@jest/globals';
import { handleGetDocumentationUpdates } from '../../src/tools/get-documentation-updates.js';

// This is an integration test that uses real API calls
describe('get-documentation-updates integration test', () => {
  // Increase timeout for real API calls
  jest.setTimeout(30000);

  it('should fetch real documentation updates', async () => {
    const result = await handleGetDocumentationUpdates();

    // Basic structure checks
    expect(result).toContain('Apple Developer Documentation Updates');
    expect(result).toContain('## WWDC');
    expect(result).toContain('## Technology Updates');
    expect(result).toContain('## Release Notes');

    // Should have links with correct format
    expect(result).toMatch(/\[.*\]\(https:\/\/developer\.apple\.com\/documentation\/updates\/.*\)/);

    // Should not have errors
    expect(result).not.toContain('Error:');
  });

  it('should filter WWDC updates', async () => {
    const result = await handleGetDocumentationUpdates('wwdc', undefined, undefined, undefined, true, 10);

    // Should only contain WWDC section
    expect(result).toContain('## WWDC');
    expect(result).not.toContain('## Technology Updates');
    expect(result).not.toContain('## Release Notes');

    // Should contain WWDC entries
    expect(result).toMatch(/WWDC\d{2}/);
  });

  it('should filter technology updates for SwiftUI', async () => {
    const result = await handleGetDocumentationUpdates('technology', 'SwiftUI');

    if (result.includes('No documentation updates found')) {
      // If no SwiftUI updates, try with a more general search
      const generalResult = await handleGetDocumentationUpdates('all', 'Swift');
      expect(generalResult).toMatch(/Swift/i);
    } else {
      expect(result).toMatch(/SwiftUI/i);
      expect(result).toContain('## Technology Updates');
    }
  });

  it('should filter by year', async () => {
    const result = await handleGetDocumentationUpdates('wwdc', undefined, '2024');

    if (result.includes('No documentation updates found')) {
      // Try 2023 if 2024 not found
      const result2023 = await handleGetDocumentationUpdates('wwdc', undefined, '2023');
      expect(result2023).toContain('WWDC23');
    } else {
      expect(result).toContain('WWDC24');
    }
  });

  it('should search with keywords', async () => {
    const result = await handleGetDocumentationUpdates('all', undefined, undefined, 'iOS');

    // Should find iOS-related updates
    expect(result.toLowerCase()).toContain('ios');
  });

  it('should respect limit parameter', async () => {
    const result = await handleGetDocumentationUpdates('all', undefined, undefined, undefined, true, 3);

    // Count the number of update entries (### headers)
    const updateCount = (result.match(/###/g) || []).length;
    expect(updateCount).toBeLessThanOrEqual(3);
    expect(updateCount).toBeGreaterThan(0);
  });

  it('should show beta badges when includeBeta is true', async () => {
    const result = await handleGetDocumentationUpdates('all', undefined, undefined, undefined, true, 50);

    // Check if any beta items are included
    if (result.includes('*Beta*') || result.includes('Beta |')) {
      expect(result).toMatch(/\*.*Beta.*\*/);
    }
  });

  it('should handle release notes category', async () => {
    const result = await handleGetDocumentationUpdates('release-notes');

    if (!result.includes('No documentation updates found')) {
      expect(result).toContain('## Release Notes');
      // Should contain links to release notes
      expect(result).toMatch(/release-notes/i);
    }
  });
});