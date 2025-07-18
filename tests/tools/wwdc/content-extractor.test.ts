/**
 * Tests for WWDC content extractor
 */

import { extractVideoContent as extractWWDCVideoContent } from '../../../src/tools/wwdc/content-extractor';
import { httpClient } from '../../../src/utils/http-client';
import { JSDOM } from 'jsdom';

// Mock http client
jest.mock('../../../src/utils/http-client');
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('WWDC Content Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should extract video metadata correctly', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Meet the Translation API - WWDC25 - Videos - Apple Developer</title>
        <meta property="og:description" content="Discover how you can translate text across different languages in your app" />
      </head>
      <body>
        <div class="video-title">
          <h1>Meet the Translation API</h1>
        </div>
        <ul class="inline-items">
          <li class="video-duration">15 min</li>
          <li>WWDC 2025</li>
        </ul>
        <div class="video-description">
          <p>Discover how you can translate text across different languages in your app using the new Translation API.</p>
        </div>
        <section class="topics">
          <h3>Topics</h3>
          <ul>
            <li><a href="/videos/topics/machine-learning-ai">Machine Learning & AI</a></li>
            <li><a href="/videos/topics/localization">Localization</a></li>
          </ul>
        </section>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const videoUrl = 'https://developer.apple.com/videos/play/wwdc2025/10188/';
    const result = await extractWWDCVideoContent(videoUrl, '10188', '2025');

    expect(result).toMatchObject({
      id: '10188',
      url: 'https://developer.apple.com/videos/play/wwdc2025/10188/',
      title: 'Meet the Translation API',
      duration: '15 min',
      year: '2025',
      topics: ['Essentials'], // Default topic when no keywords match
    });
  });

  test('should extract transcript when available', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Test Video</h1>
        </div>
        <div id="transcript" class="transcript">
          <p data-timestamp="00:00">Welcome to WWDC</p>
          <p data-timestamp="00:30">Today we will discuss...</p>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10001/', '10001', '2025');

    expect(result.hasTranscript).toBe(true);
    expect(result.transcript).toMatchObject({
      segments: [
        { timestamp: '00:00', text: 'Welcome to WWDC' },
        { timestamp: '00:30', text: 'Today we will discuss...' },
      ],
      fullText: expect.stringContaining('Welcome to WWDC'),
    });
  });

  test('should extract code examples', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>SwiftUI Animations</h1>
        </div>
        <div class="code-listing">
          <div class="code-sample">
            <pre class="language-swift">
              <code>
struct ContentView: View {
    @State private var isAnimating = false
    
    var body: some View {
        Circle()
            .scaleEffect(isAnimating ? 1.5 : 1.0)
            .animation(.spring(), value: isAnimating)
    }
}
              </code>
            </pre>
          </div>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10002/', '10002', '2025');

    expect(result.hasCode).toBe(true);
    expect(result.codeExamples).toHaveLength(1);
    expect(result.codeExamples[0]).toMatchObject({
      language: 'swift',
      code: expect.stringContaining('struct ContentView'),
    });
  });

  test('should extract resources', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Test Video</h1>
        </div>
        <section class="resources-section">
          <h3>Resources</h3>
          <ul>
            <li>
              <a href="/documentation/translation">Translation Documentation</a>
            </li>
            <li>
              <a href="/sample-code/translation-demo.zip">Download Sample Code</a>
            </li>
          </ul>
        </section>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10003/', '10003', '2025');

    expect(result.resources).toBeDefined();
    expect(result.resources.resourceLinks).toHaveLength(1);
    expect(result.resources.resourceLinks).toEqual([
      {
        title: 'Translation Documentation',
        url: 'https://developer.apple.com/documentation/translation',
      },
    ]);
    expect(result.resources.sampleProject).toBe('https://developer.apple.com/sample-code/translation-demo.zip');
  });

  test('should extract related videos', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Test Video</h1>
        </div>
        <!-- Include links to other WWDC videos in the page -->
        <div class="content">
          <a href="/videos/play/wwdc2025/10189/">Advanced Translation Features</a>
          <a href="/videos/play/wwdc2024/10055/">Introduction to Translation</a>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10004/', '10004', '2025');

    expect(result.relatedVideos).toBeDefined();
    expect(result.relatedVideos).toHaveLength(2);
    expect(result.relatedVideos?.[0]).toMatchObject({ id: '10189' });
    expect(result.relatedVideos?.[1]).toMatchObject({ id: '10055' });
  });

  test('should handle missing elements gracefully', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Minimal Session</h1>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockImplementation((url) => {
      if (url.includes('/transcript')) {
        return Promise.reject(new Error('No transcript'));
      }
      return Promise.resolve({
        text: jest.fn().mockResolvedValue(mockHtml),
      } as any);
    });

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10005/', '10005', '2025');

    expect(result).toMatchObject({
      id: '10005',
      title: 'Minimal Session',
      hasTranscript: false,
      hasCode: false,
      topics: ['Essentials'], // Default topic
      resources: {
        resourceLinks: []
      },
      relatedVideos: undefined,
    });
  });

  test('should handle HTTP errors', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('404 Not Found'));

    await expect(extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/99999/', '99999', '2025')).rejects.toThrow(
      '404 Not Found'
    );
  });

  test('should clean and format code examples', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Code Formatting Test</h1>
        </div>
        <pre class="code-source" data-language="swift">
          <code>
            // This is a comment
            func example() {
                print("Hello")
            }
          </code>
        </pre>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10006/', '10006', '2025');

    expect(result.codeExamples[0].code).toBe(
      '// This is a comment\nfunc example() {\n    print("Hello")\n}'
    );
  });

  test('should extract speakers when available', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Test Video</h1>
        </div>
        <div class="video-description">
          <p>Learn about new features with John Doe and Jane Smith. They will show you how to build amazing apps.</p>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10007/', '10007', '2025');

    expect(result.speakers).toEqual(['John Doe', 'Jane Smith']);
  });
});