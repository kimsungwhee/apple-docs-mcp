/**
 * Tests for WWDC topics extractor
 */

import { extractAllTopics as extractWWDCTopics } from '../../../src/tools/wwdc/topics-extractor';
import { httpClient } from '../../../src/utils/http-client';

// Mock http client
jest.mock('../../../src/utils/http-client');
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('WWDC Topics Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should extract all topics', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <section class="topic-section">
            <a href="/videos/topics/swiftui-ui-frameworks">
              <h3>SwiftUI & UI Frameworks</h3>
              <p>50 videos</p>
            </a>
          </section>
          <section class="topic-section">
            <a href="/videos/topics/machine-learning-ai">
              <h3>Machine Learning & AI</h3>
              <p>30 videos</p>
            </a>
          </section>
          <section class="topic-section">
            <a href="/videos/topics/app-store-distribution">
              <h3>App Store & Distribution</h3>
              <p>15 videos</p>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    expect(result).toHaveLength(3);
    // Results are sorted alphabetically
    expect(result[0]).toMatchObject({
      id: 'app-store-distribution',
      name: 'App Store & Distribution',
      url: 'https://developer.apple.com/videos/topics/app-store-distribution',
      videoCount: 15,
    });
    expect(result[1]).toMatchObject({
      id: 'machine-learning-ai',
      name: 'Machine Learning & AI',
      videoCount: 30,
    });
    expect(result[2]).toMatchObject({
      id: 'swiftui-ui-frameworks',
      name: 'SwiftUI & UI Frameworks',
      videoCount: 50,
    });
  });

  test('should handle topics without video count', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <section class="topic-section">
            <a href="/videos/topics/new-topic">
              <h3>New Topic</h3>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    expect(result[0]).toMatchObject({
      id: 'new-topic',
      name: 'New Topic',
      videoCount: 0,
    });
  });

  test('should extract topic ID from URL correctly', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <section class="topic-section">
            <a href="/videos/topics/swift-language">
              <h3>Swift Language</h3>
            </a>
          </section>
          <section class="topic-section">
            <a href="https://developer.apple.com/videos/topics/testing-debugging">
              <h3>Testing & Debugging</h3>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    expect(result.map(t => t.id)).toEqual(['swift-language', 'testing-debugging']);
  });

  test('should handle empty topics list', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <!-- No topics -->
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    expect(result).toEqual([]);
  });

  test('should handle malformed video count', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <section class="topic-section">
            <a href="/videos/topics/test-topic">
              <h3>Test Topic</h3>
              <p>many videos</p>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    expect(result[0].videoCount).toBe(0);
  });

  test('should handle HTTP errors', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('404 Not Found'));

    await expect(extractWWDCTopics()).rejects.toThrow('Failed to extract topics');
  });

  test('should sort topics alphabetically', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <section class="topic-section">
            <a href="/videos/topics/z-topic">
              <h3>Z Topic</h3>
            </a>
          </section>
          <section class="topic-section">
            <a href="/videos/topics/a-topic">
              <h3>A Topic</h3>
            </a>
          </section>
          <section class="topic-section">
            <a href="/videos/topics/m-topic">
              <h3>M Topic</h3>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    expect(result.map(t => t.name)).toEqual(['A Topic', 'M Topic', 'Z Topic']);
  });

  test('should handle special characters in topic names', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <section class="topic-section">
            <a href="/videos/topics/privacy-security">
              <h3>Privacy &amp; Security</h3>
            </a>
          </section>
          <section class="topic-section">
            <a href="/videos/topics/ar-vr">
              <h3>AR/VR Technologies</h3>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    // Results are sorted alphabetically
    expect(result[0].name).toBe('AR/VR Technologies');
    expect(result[1].name).toBe('Privacy & Security');
  });

  test('should skip invalid topic entries', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="topics-grid">
          <section class="topic-section">
            <a href="/videos/topics/valid-topic">
              <h3>Valid Topic</h3>
            </a>
          </section>
          <section class="topic-section">
            <!-- Missing href -->
            <a>
              <h3>Invalid Topic</h3>
            </a>
          </section>
          <section class="topic-section">
            <!-- Invalid URL -->
            <a href="/invalid/url/format">
              <h3>Another Invalid</h3>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCTopics();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid-topic');
  });
});