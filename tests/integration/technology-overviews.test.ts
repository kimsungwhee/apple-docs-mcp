import { describe, it, expect, jest } from '@jest/globals';
import { handleGetTechnologyOverviews } from '../../src/tools/get-technology-overviews.js';

// This is an integration test that uses real API calls
describe('get-technology-overviews integration test', () => {
  // Increase timeout for real API calls
  jest.setTimeout(30000);

  it('should fetch real technology overviews', async () => {
    const result = await handleGetTechnologyOverviews();

    // Basic structure checks
    expect(result).toContain('Apple Developer Technology Overviews');
    expect(result).toContain('## Get Started');
    
    // Should have main categories
    expect(result.toLowerCase()).toContain('app design');
    expect(result.toLowerCase()).toContain('games');

    // Should have links with correct format
    expect(result).toMatch(/\\[.*\\]\\(https:\\/\\/developer\\.apple\\.com\\/documentation\\/technologyoverviews\\/.*\\)/);

    // Should not have errors
    expect(result).not.toContain('Error:');
  });

  it('should filter by category', async () => {
    const result = await handleGetTechnologyOverviews('app-design-and-ui');

    expect(result).toContain('App design and UI');
    
    // Should not contain other categories
    expect(result).not.toContain('Games');
    expect(result).not.toContain('Data management');
  });

  it('should handle search queries', async () => {
    const result = await handleGetTechnologyOverviews(undefined, 'all', 'game');

    if (!result.includes('No technology overviews found')) {
      expect(result.toLowerCase()).toContain('game');
    }
  });

  it('should filter by platform', async () => {
    const result = await handleGetTechnologyOverviews(undefined, 'ios');

    if (!result.includes('No technology overviews found')) {
      expect(result.toLowerCase()).toContain('ios');
    }
  });

  it('should respect limit parameter', async () => {
    const result = await handleGetTechnologyOverviews(undefined, 'all', undefined, true, 1);

    // Count main sections (## headers that are not the main title)
    const sectionCount = (result.match(/^## [^#]/gm) || []).length;
    expect(sectionCount).toBeGreaterThan(0);
    expect(sectionCount).toBeLessThanOrEqual(2); // May have one or two sections with limit 1
  });

  it('should include footer link', async () => {
    const result = await handleGetTechnologyOverviews();

    expect(result).toContain('[Explore all Technology Overviews](https://developer.apple.com/documentation/technologyoverviews)');
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid category that might cause issues
    const result = await handleGetTechnologyOverviews('invalid-category-12345');

    // Should either return no results or handle gracefully
    if (result.includes('Error:')) {
      expect(result).toContain('Failed to fetch technology overviews');
    } else {
      expect(result).toContain('No technology overviews found');
    }
  });
});