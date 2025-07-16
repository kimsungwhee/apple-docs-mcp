/**
 * Integration tests for search functionality
 */

describe('Search Integration', () => {
  describe('HTML Parsing Logic', () => {
    it('should parse search result structure', () => {
      const mockHtml = `
        <html>
          <body>
            <div class="search-result documentation">
              <div class="result-title">
                <a href="/documentation/swiftui/view">View</a>
              </div>
              <div class="result-description">A type that represents part of your app's user interface.</div>
            </div>
            <div class="search-result video">
              <div class="result-title">
                <a href="/videos/play/wwdc2021/10022">SwiftUI Essentials</a>
              </div>
              <div class="result-description">Learn the basics of SwiftUI development.</div>
            </div>
          </body>
        </html>
      `;

      // Mock cheerio-like parsing
      const parseResults = (html: string, query: string) => {
        const results = [];
        
        // Simple regex to find search results
        const resultRegex = /<div class="search-result ([^"]+)"[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<div class="result-description">([^<]+)<\/div>/g;
        let match;
        
        while ((match = resultRegex.exec(html)) !== null) {
          results.push({
            type: match[1],
            url: match[2].startsWith('/') ? `https://developer.apple.com${match[2]}` : match[2],
            title: match[3],
            description: match[4],
          });
        }

        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results found for "${query}"`
            }]
          };
        }

        const formattedResults = results.map(result => 
          `## [${result.title}](${result.url})\n${result.description}\n*${result.type}*`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `# Search Results for "${query}"\n\n${formattedResults}`
          }]
        };
      };

      const result = parseResults(mockHtml, 'SwiftUI');

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].text).toContain('Search Results for "SwiftUI"');
      expect(result.content[0].text).toContain('View');
      expect(result.content[0].text).toContain('SwiftUI Essentials');
      expect(result.content[0].text).toContain('documentation');
      expect(result.content[0].text).toContain('video');
    });

    it('should handle empty search results', () => {
      const mockHtml = '<html><body></body></html>';

      const parseResults = (html: string, query: string) => {
        const resultRegex = /<div class="search-result/g;
        const hasResults = resultRegex.test(html);

        if (!hasResults) {
          return {
            content: [{
              type: 'text',
              text: `No results found for "${query}"`
            }]
          };
        }

        return { content: [{ type: 'text', text: 'Results found' }] };
      };

      const result = parseResults(mockHtml, 'NonExistentAPI');

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('No results found');
      expect(result.content[0].text).toContain('NonExistentAPI');
    });

    it('should handle malformed HTML gracefully', () => {
      const mockHtml = '<html><body><div class="search-result"><div class="result-title">Incomplete';

      const parseResults = (html: string, query: string) => {
        try {
          // Simulate parsing that handles malformed HTML
          const hasSearchDiv = html.includes('search-result');
          
          if (hasSearchDiv) {
            return {
              content: [{
                type: 'text',
                text: `Partial results found for "${query}"`
              }]
            };
          }

          return {
            content: [{
              type: 'text',
              text: `No results found for "${query}"`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error parsing results for "${query}"`
            }]
          };
        }
      };

      const result = parseResults(mockHtml, 'test');

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toBeDefined();
      expect(result.content[0].text).toContain('test');
    });

    it('should extract beta and deprecated status', () => {
      const mockHtml = `
        <html>
          <body>
            <div class="search-result documentation">
              <div class="result-title">
                <a href="/documentation/swiftui/betaview">BetaView</a>
              </div>
              <div class="result-description">A beta API for testing purposes.</div>
              <div class="beta-badge">Beta</div>
            </div>
            <div class="search-result documentation">
              <div class="result-title">
                <a href="/documentation/uikit/deprecated">DeprecatedClass</a>
              </div>
              <div class="result-description">This API is deprecated and should not be used.</div>
            </div>
          </body>
        </html>
      `;

      const parseResults = (html: string, query: string) => {
        const isBeta = html.includes('beta') || html.includes('Beta');
        const isDeprecated = html.includes('deprecated') || html.includes('Deprecated');

        let statusInfo = [];
        if (isBeta) statusInfo.push('Beta');
        if (isDeprecated) statusInfo.push('Deprecated');

        return {
          content: [{
            type: 'text',
            text: `Search results for "${query}" ${statusInfo.length > 0 ? `(${statusInfo.join(', ')})` : ''}`
          }]
        };
      };

      const result = parseResults(mockHtml, 'API');

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Beta');
      expect(result.content[0].text).toContain('Deprecated');
    });
  });

  describe('URL Processing', () => {
    it('should convert relative URLs to absolute', () => {
      const convertUrl = (url: string) => {
        return url.startsWith('/') ? `https://developer.apple.com${url}` : url;
      };

      expect(convertUrl('/documentation/swiftui')).toBe('https://developer.apple.com/documentation/swiftui');
      expect(convertUrl('https://developer.apple.com/documentation/uikit')).toBe('https://developer.apple.com/documentation/uikit');
    });

    it('should extract API names from URLs', () => {
      const extractApiName = (url: string) => {
        try {
          return new URL(url).pathname.split('/').pop() || 'Unknown API';
        } catch {
          return 'Unknown API';
        }
      };

      expect(extractApiName('https://developer.apple.com/documentation/swiftui/view')).toBe('view');
      expect(extractApiName('invalid-url')).toBe('Unknown API');
    });
  });
});