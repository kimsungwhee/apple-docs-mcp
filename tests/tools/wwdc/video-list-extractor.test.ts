/**
 * Tests for WWDC video list extractor
 */

import { extractVideoList as extractWWDCVideoList } from '../../../src/tools/wwdc/video-list-extractor';
import { httpClient } from '../../../src/utils/http-client';

// Mock http client
jest.mock('../../../src/utils/http-client');
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('WWDC Video List Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should extract video list for a specific year', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="collection-items">
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/10188/">
              <h4>Meet the Translation API</h4>
              <p>Discover translation features</p>
              <ul class="video-tags">
                <li>15 min</li>
                <li>Machine Learning & AI</li>
              </ul>
            </a>
          </section>
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/10189/">
              <h4>Advanced SwiftUI</h4>
              <p>Deep dive into SwiftUI</p>
              <ul class="video-tags">
                <li>30 min</li>
                <li>SwiftUI & UI Frameworks</li>
              </ul>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: '10188',
      url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
      title: 'Meet the Translation API',
      duration: '',
      thumbnail: '',
    });
    expect(result[1]).toMatchObject({
      id: '10189',
      title: 'Advanced SwiftUI',
      duration: '',
      thumbnail: '',
    });
  });

  test('should handle empty year parameter gracefully', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="collection-items">
          <!-- No videos -->
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    expect(result).toEqual([]);
  });

  test('should handle videos with multiple topics', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="collection-items">
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/10190/">
              <h4>SwiftData and CloudKit</h4>
              <p>Sync data across devices</p>
              <ul class="video-tags">
                <li>25 min</li>
                <li>SwiftData</li>
                <li>CloudKit</li>
                <li>Data & Storage</li>
              </ul>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    expect(result[0]).toMatchObject({
      id: '10190',
      title: 'SwiftData and CloudKit',
      duration: '',
      thumbnail: '',
    });
  });

  test('should handle videos without duration', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="collection-items">
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/10191/">
              <h4>Keynote</h4>
              <p>WWDC 2025 Keynote</p>
              <ul class="video-tags">
                <li>Keynote</li>
              </ul>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    expect(result[0]).toMatchObject({
      id: '10191',
      title: 'Keynote',
      duration: '',
      thumbnail: '',
    });
  });

  test('should handle empty video list', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="collection-items">
          <!-- No videos -->
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    expect(result).toEqual([]);
  });

  test('should extract video ID from various URL formats', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="collection-items">
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/238">
              <h4>Short ID Format</h4>
            </a>
          </section>
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/10188/">
              <h4>Long ID Format</h4>
            </a>
          </section>
          <section class="collection-item">
            <a href="https://developer.apple.com/videos/play/wwdc2025/501/">
              <h4>Full URL Format</h4>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    expect(result.map(v => v.id)).toEqual(['238', '10188', '501']);
  });

  test('should handle HTTP errors gracefully', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('Network error'));

    await expect(extractWWDCVideoList('2025')).rejects.toThrow(
      'Failed to extract video list'
    );
  });

  test('should handle malformed HTML gracefully', async () => {
    const mockHtml = `
      <div class="collection-items">
        <section class="collection-item">
          <a href="/invalid-url">
            <h4>Invalid Video</h4>
          </a>
        </section>
      </div>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    // Should skip videos with invalid URLs
    expect(result).toEqual([]);
  });

  test('should deduplicate videos with same ID', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="collection-items">
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/10188/">
              <h4>Video 1</h4>
            </a>
          </section>
          <section class="collection-item">
            <a href="/videos/play/wwdc2025/10188/">
              <h4>Duplicate Video</h4>
            </a>
          </section>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoList('2025');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Video 1');
  });
});