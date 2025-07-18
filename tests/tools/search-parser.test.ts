import { jest } from '@jest/globals';
import { parseSearchResults } from '../../src/tools/search-parser.js';

// Mock the cache to prevent interference between tests
jest.mock('../../src/utils/cache.js', () => ({
  searchCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
  },
  generateUrlCacheKey: jest.fn((url, params) => `${url}-${params.query}`),
}));

describe('parseSearchResults', () => {
  const mockSearchUrl = 'https://developer.apple.com/search/?q=test';

  describe('successful parsing', () => {
    it('should parse search results from HTML', () => {
      // Note: Apple Developer search uses DOM structure, not JavaScript objects
      // This test reflects the actual HTML structure found on developer.apple.com/search
      const html = `
        <html>
          <body>
            <ul class="search-results">
              <li class="search-result documentation">
                <article>
                  <h3 class="result-title">
                    <a href="/documentation/uikit/uiview">UIView</a>
                  </h3>
                  <p class="result-description">
                    An object that manages the content for a rectangular area on the screen.
                  </p>
                </article>
              </li>
              <li class="search-result documentation">
                <article>
                  <h3 class="result-title">
                    <a href="/documentation/uikit/uiviewcontroller">UIViewController</a>
                  </h3>
                  <p class="result-description">
                    An object that manages a view hierarchy for your UIKit app.
                  </p>
                </article>
              </li>
            </ul>
          </body>
        </html>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);

      expect(result.content[0].text).toContain('# Apple Documentation Search Results');
      expect(result.content[0].text).toContain('**Query:** "test"');
      expect(result.content[0].text).toContain('### 1. UIView');
      expect(result.content[0].text).toContain('### 2. UIViewController');
      expect(result.content[0].text).toContain('An object that manages the content');
      expect(result.content[0].text).toContain('**Framework:** Uikit');
    });

    it('should handle different result types', () => {
      const html = `
        <ul class="search-results">
          <li class="search-result general">
            <article>
              <h3 class="result-title">
                <a href="/documentation/guide">Getting Started</a>
              </h3>
              <p class="result-description">A guide to get started.</p>
            </article>
          </li>
          <li class="search-result sample">
            <article>
              <h3 class="result-title">
                <a href="/documentation/sample">Sample Code</a>
              </h3>
              <p class="result-description">Sample code project.</p>
            </article>
          </li>
          <li class="search-result video">
            <article>
              <h3 class="result-title">
                <a href="/videos/play/wwdc2023/10001">WWDC Video</a>
              </h3>
              <p class="result-description">WWDC session video.</p>
            </article>
          </li>
        </ul>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);
      const text = result.content[0].text;

      // Since general and video types are filtered out, we should get no results
      expect(text).toContain('No results found');
    });

    it('should handle empty results', () => {
      const html = `
        <ul class="search-results">
          <!-- No results -->
        </ul>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);

      expect(result.content[0].text).toContain('No results found for "test"');
      expect(result.content[0].text).toContain('### Suggestions:');
    });

    it('should extract module names from URLs', () => {
      const html = `
        <ul class="search-results">
          <li class="search-result documentation">
            <article>
              <h3 class="result-title">
                <a href="/documentation/swiftui/list">List</a>
              </h3>
              <p class="result-description">A container that presents rows of data.</p>
            </article>
          </li>
          <li class="search-result documentation">
            <article>
              <h3 class="result-title">
                <a href="/documentation/foundation/nsstring">NSString</a>
              </h3>
              <p class="result-description">A string object.</p>
            </article>
          </li>
        </ul>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);
      const text = result.content[0].text;

      expect(text).toContain('**Framework:** Swiftui');
      expect(text).toContain('**Framework:** Foundation');
    });

    it('should limit results when too many', () => {
      const manyResultsHtml = Array.from({ length: 100 }, (_, i) => `
        <li class="search-result documentation">
          <article>
            <h3 class="result-title">
              <a href="/documentation/test/result${i}">Result ${i}</a>
            </h3>
            <p class="result-description">Description ${i}</p>
          </article>
        </li>
      `).join('');

      const html = `
        <ul class="search-results">
          ${manyResultsHtml}
        </ul>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);
      const text = result.content[0].text;

      // Should show limited results
      expect(text).toContain('### 1. Result 0');
      expect(text).toContain('### 50. Result 49');
      expect(text).not.toContain('Result 99');
      expect(text).toContain('[View all results on Apple Developer]');
    });
  });

  describe('error cases', () => {
    it('should handle missing searchData', () => {
      const html = '<html><body>No search data</body></html>';

      const result = parseSearchResults(html, 'test', mockSearchUrl);

      expect(result.content[0].text).toContain('No results found');
      expect(result.content[0].text).toContain('### Suggestions:');
    });

    it('should handle malformed HTML', () => {
      const html = `
        <div>Invalid HTML structure without search results</div>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);

      expect(result.content[0].text).toContain('No results found');
    });

    it('should handle missing search results container', () => {
      const html = `
        <html>
          <body>
            <!-- Page without search results -->
          </body>
        </html>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);

      expect(result.content[0].text).toContain('No results found for "test"');
    });

    it('should handle results with missing fields', () => {
      const html = `
        <ul class="search-results">
          <li class="search-result documentation">
            <article>
              <h3 class="result-title">
                <a href="/documentation/test">Valid Result</a>
              </h3>
              <p class="result-description">Valid description</p>
            </article>
          </li>
          <li class="search-result documentation">
            <article>
              <!-- Missing title -->
              <p class="result-description">No title</p>
            </article>
          </li>
          <li class="search-result documentation">
            <article>
              <h3 class="result-title">
                No URL
              </h3>
              <p class="result-description">No URL</p>
            </article>
          </li>
        </ul>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);
      const text = result.content[0].text;

      // Should include valid result
      expect(text).toContain('### 1. Valid Result');
      // Should skip invalid results
      expect(text).not.toContain('No title');
      expect(text).not.toContain('No URL');
    });
  });

  describe('special cases', () => {
    it('should handle special characters in query', () => {
      const html = `
        <ul class="search-results">
          <li class="search-result documentation">
            <article>
              <h3 class="result-title">
                <a href="/documentation/test">Result</a>
              </h3>
              <p class="result-description">Test</p>
            </article>
          </li>
        </ul>
      `;

      const specialQuery = 'test & <special> "quoted"';
      const result = parseSearchResults(html, specialQuery, mockSearchUrl);

      expect(result.content[0].text).toContain('**Query:** "test & <special> "quoted""');
    });

    it('should handle beta and deprecated indicators', () => {
      const html = `
        <ul class="search-results">
          <li class="search-result documentation">
            <article>
              <h3 class="result-title">
                <a href="/documentation/test/betaapi">BetaAPI</a>
              </h3>
              <p class="result-description">Beta This is a beta API.</p>
              <span class="beta-badge">Beta</span>
            </article>
          </li>
          <li class="search-result documentation">
            <article>
              <h3 class="result-title">
                <a href="/documentation/test/deprecatedapi">DeprecatedAPI</a>
              </h3>
              <p class="result-description">Deprecated This API is deprecated.</p>
              <span class="deprecated-badge">Deprecated</span>
            </article>
          </li>
        </ul>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);
      const text = result.content[0].text;

      expect(text).toContain('Beta This is a beta API');
      expect(text).toContain('Deprecated This API is deprecated');
    });

    it('should handle archive URLs', () => {
      const html = `
        <ul class="search-results">
          <li class="search-result general">
            <article>
              <h3 class="result-title">
                <a href="/library/archive/documentation/test">Archived Content</a>
              </h3>
              <p class="result-description">Archived documentation.</p>
            </article>
          </li>
        </ul>
      `;

      const result = parseSearchResults(html, 'test', mockSearchUrl);
      const text = result.content[0].text;

      // Since general type is filtered out, we should get no results
      expect(text).toContain('No results found');
    });
  });
});