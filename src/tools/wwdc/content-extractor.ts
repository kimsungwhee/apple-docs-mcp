/**
 * WWDC video content extractor
 */

import { JSDOM } from 'jsdom';
import { httpClient } from '../../utils/http-client.js';
import { logger } from '../../utils/logger.js';
import { WWDC_URLS, WWDC_CONFIG } from '../../utils/constants.js';
import type {
  WWDCVideo,
  TranscriptData,
  TranscriptSegment,
  CodeExample,
  VideoResources,
  Chapter,
  RelatedVideo,
} from '../../types/wwdc.js';
import { inferTopics } from '../../utils/topic-mapper.js';

/**
 * Extract complete content for a single WWDC video
 */
export async function extractVideoContent(
  videoUrl: string,
  videoId: string,
  year: string,
  knownTopics?: string[],
): Promise<WWDCVideo> {
  try {
    logger.info(`Extracting content for WWDC${year} video ${videoId}`);

    // Get page HTML
    const response = await httpClient.get(videoUrl);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract basic information
    const title = extractTitle(document);
    const speakers = extractSpeakers(document);
    const duration = extractDuration(document);
    // Use known topics or infer topics
    const topics = knownTopics || inferTopics(title, extractDescription(document));

    // Detect if there's a Code tab (WWDC22 and later) - now only used for logging
    const hasCodeTab = detectCodeTab(document, year);
    logger.info(`Video ${videoId} has code tab: ${hasCodeTab}`);

    // Extract transcript
    const transcript = await extractTranscript(document, videoUrl);
    const hasTranscript = transcript !== undefined;

    // Extract code examples
    let codeExamples: CodeExample[] | undefined;

    // First try to extract from dedicated code page (WWDC22 and later)
    codeExamples = await extractCodeExamples(document, videoUrl);

    // If no code found and it's an early year, try extracting from transcript
    if ((!codeExamples || codeExamples.length === 0) && parseInt(year) < WWDC_CONFIG.CODE_TAB_INTRODUCED_YEAR) {
      codeExamples = extractCodeFromTranscript(document);
    }
    const hasCode = codeExamples !== undefined && codeExamples.length > 0;

    // Extract chapter information
    const chapters = extractChapters(document);

    // Extract resource links
    const resources = await extractResources(document, videoUrl);

    // Extract related videos
    const relatedVideos = await extractRelatedVideos(document, videoUrl);

    const video: WWDCVideo = {
      id: videoId,
      year,
      url: videoUrl,
      title,
      speakers,
      duration,
      topics,
      hasTranscript,
      hasCode,
      transcript: hasTranscript ? transcript : undefined,
      codeExamples: hasCode ? codeExamples : undefined,
      chapters: chapters.length > 0 ? chapters : undefined,
      resources,
      relatedVideos: relatedVideos.length > 0 ? relatedVideos : undefined,
      extractedAt: new Date().toISOString(),
    };

    return video;

  } catch (error) {
    logger.error(`Failed to extract video ${videoId}:`, error);
    throw error;
  }
}

/**
 * Extract title
 */
function extractTitle(document: Document): string {
  // Try multiple selectors
  const selectors = [
    'h1.video-title',
    'h1[itemprop="name"]',
    '.hero-title',
    'h1',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent) {
      return element.textContent.trim();
    }
  }

  return 'Untitled Video';
}

/**
 * Extract description
 */
function extractDescription(document: Document): string {
  const selectors = [
    '.video-description',
    '.description',
    '[itemprop="description"]',
    'meta[name="description"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (selector.includes('meta')) {
        return element.getAttribute('content') || '';
      }
      return element.textContent?.trim() || '';
    }
  }

  return '';
}

/**
 * Extract speakers
 */
function extractSpeakers(document: Document): string[] {
  const speakers: string[] = [];

  // Try to extract from description
  const description = document.querySelector('.video-description, .description');
  if (description) {
    const text = description.textContent || '';
    // Match "with [Speaker]" or "by [Speaker]" patterns
    const speakerMatch = text.match(/(?:with|by)\s+([^.]+?)(?:\.|$)/i);
    if (speakerMatch) {
      const speakerText = speakerMatch[1];
      // Split multiple speakers
      speakers.push(...speakerText.split(/,\s*and\s*|,\s*|\s+and\s+/).map((s: string) => s.trim()));
    }
  }

  return speakers.filter(s => s.length > 0);
}

/**
 * Extract duration
 */
function extractDuration(document: Document): string {
  const selectors = [
    '.video-duration',
    '[itemprop="duration"]',
    '.duration',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent) {
      return element.textContent.trim();
    }
  }

  return '';
}


/**
 * Detect if there's a Code tab
 */
function detectCodeTab(document: Document, year: string): boolean {
  // WWDC22 and later typically have Code tabs
  if (parseInt(year) >= WWDC_CONFIG.CODE_TAB_INTRODUCED_YEAR) {
    const codeTab = document.querySelector('[data-supplement="code"], .code-tab, #code');
    return codeTab !== null;
  }
  return false;
}

/**
 * Extract transcript
 */
async function extractTranscript(document: Document, videoUrl: string): Promise<TranscriptData | undefined> {
  try {
    // Find transcript container
    const transcriptContainer = document.querySelector(
      '.transcript, [data-supplement="transcript"], #transcript',
    );

    if (!transcriptContainer) {
      // If page doesn't have transcript, try loading transcript tab
      const transcriptUrl = videoUrl.replace(/\/$/, '') + '/transcript';
      const transcriptResponse = await httpClient.get(transcriptUrl).catch(() => null);
      const transcriptHtml = transcriptResponse ? await transcriptResponse.text() : null;

      if (transcriptHtml) {
        const transcriptDom = new JSDOM(transcriptHtml);
        const transcriptDoc = transcriptDom.window.document;
        return extractTranscriptFromDocument(transcriptDoc);
      }

      return undefined;
    }

    return extractTranscriptFromDocument(document);

  } catch (error) {
    logger.warn('Failed to extract transcript:', error);
    return undefined;
  }
}

/**
 * Extract transcript data from document
 */
function extractTranscriptFromDocument(document: Document): TranscriptData {
  const segments: TranscriptSegment[] = [];
  let fullText = '';

  // Find all transcript paragraphs
  const paragraphs = document.querySelectorAll(
    '.transcript p, .transcript-line, [data-timestamp]',
  );

  paragraphs.forEach((p: Element) => {
    const timestamp = p.getAttribute('data-timestamp') ||
                     p.querySelector('.timestamp')?.textContent || '';
    const text = p.textContent?.replace(/^\d+:\d+\s*/, '').trim() || '';

    if (text) {
      if (timestamp) {
        segments.push({ timestamp, text });
      }
      fullText += text + '\n\n';
    }
  });

  return {
    fullText: fullText.trim(),
    segments,
  };
}

/**
 * Extract code examples (new page format)
 */
async function extractCodeExamples(_document: Document, videoUrl: string): Promise<CodeExample[]> {
  const examples: CodeExample[] = [];

  try {
    // Try to load code tab page
    const codeUrl = videoUrl.replace(/\/$/, '') + '/code';
    logger.info(`Fetching code page: ${codeUrl}`);
    const codeResponse = await httpClient.get(codeUrl).catch((err) => {
      logger.warn(`Failed to fetch code page: ${err.message}`);
      return null;
    });
    const codeHtml = codeResponse ? await codeResponse.text() : null;

    if (codeHtml) {
      logger.info(`Code page loaded, length: ${codeHtml.length}`);
      const codeDom = new JSDOM(codeHtml);
      const codeDoc = codeDom.window.document;

      // Find all code blocks - WWDC2025 uses pre.code-source
      const codeBlocks = codeDoc.querySelectorAll('pre.code-source, .code-listing, pre code, .code-sample');
      logger.info(`Found ${codeBlocks.length} code blocks`);

      codeBlocks.forEach((block: Element) => {
        // Get code content
        const codeEl = block.querySelector('code') || block;
        let code = codeEl.textContent || '';
        // Clean up code indentation
        code = cleanCodeIndentation(code);

        if (!code || code.length < 10) {
          return;
        } // Skip too short code

        // Find title and timestamp - usually in previous sibling element
        let title = '';
        let timestamp = '';

        const prevSibling = block.previousElementSibling;
        if (prevSibling) {
          const text = prevSibling.textContent || '';
          // Extract timestamp format like "11:02 - Speech Transcriber setup"
          const match = text.match(/^(\d+:\d+)\s*-\s*(.+)$/);
          if (match) {
            timestamp = match[1];
            title = match[2].trim();
          } else {
            title = text.trim();
          }
        }

        // If not found, try other methods
        if (!timestamp) {
          timestamp = block.closest('[data-timestamp]')?.getAttribute('data-timestamp') || '';
        }

        const language = detectLanguage(block);

        examples.push({
          timestamp,
          title,
          language,
          code,
        });
      });

      // Remove duplicates - sometimes same code block appears multiple times
      const uniqueExamples = removeDuplicateCodeExamples(examples);
      logger.info(`Extracted ${uniqueExamples.length} unique code examples (from ${examples.length} total)`);
      return uniqueExamples;
    } else {
      logger.warn('No code page HTML received');
    }

    return examples;
  } catch (error) {
    logger.error('Failed to extract code examples:', error);
  }

  logger.info(`Returning ${examples.length} code examples`);
  return examples;
}

/**
 * Extract code from transcript (legacy pages)
 */
function extractCodeFromTranscript(document: Document): CodeExample[] {
  const examples: CodeExample[] = [];

  // Find code blocks in transcript
  const codeBlocks = document.querySelectorAll(
    '.transcript pre code, .transcript .code-voice',
  );

  codeBlocks.forEach((block: Element) => {
    let code = block.textContent || '';
    code = cleanCodeIndentation(code);
    if (code && code.length > 20) { // Filter out too short code snippets
      examples.push({
        language: detectLanguage(block),
        code,
      });
    }
  });

  return examples;
}

/**
 * Detect code language
 */
function detectLanguage(element: Element): string {
  // Detect from class attribute
  const className = element.className;
  if (className.includes('swift')) {
    return 'swift';
  }
  if (className.includes('objc') || className.includes('objective-c')) {
    return 'objc';
  }
  if (className.includes('javascript') || className.includes('js')) {
    return 'javascript';
  }

  // Detect from data attributes
  const dataLang = element.getAttribute('data-language') ||
                  element.getAttribute('data-lang');
  if (dataLang) {
    return dataLang.toLowerCase();
  }

  // Default to Swift (most WWDC code is Swift)
  return 'swift';
}

/**
 * Extract chapter information
 */
function extractChapters(document: Document): Chapter[] {
  const chapters: Chapter[] = [];

  const chapterElements = document.querySelectorAll(
    '.chapter, .timeline-chapter, [data-chapter]',
  );

  chapterElements.forEach((element: Element) => {
    const title = element.querySelector('.chapter-title')?.textContent ||
                 element.textContent?.trim() || '';
    const timestamp = element.getAttribute('data-timestamp') ||
                     element.querySelector('.timestamp')?.textContent || '';

    if (title && timestamp) {
      chapters.push({ title, timestamp });
    }
  });

  return chapters;
}

/**
 * Extract resource links
 */
async function extractResources(document: Document, videoUrl: string): Promise<VideoResources> {
  const resources: VideoResources = {
    resourceLinks: [],
  };

  try {
    // Try to extract resources section from page
    const resourceSection = document.querySelector('.resources-section, [data-resources], #resources');

    if (!resourceSection) {
      // If page doesn't have resources section, try loading resources tab
      const resourcesUrl = videoUrl.replace(/\/$/, '') + '/resources';
      logger.info(`Attempting to load resources page: ${resourcesUrl}`);

      const resourcesResponse = await httpClient.get(resourcesUrl).catch(() => null);
      if (resourcesResponse) {
        const resourcesHtml = await resourcesResponse.text();
        const resourcesDom = new JSDOM(resourcesHtml);
        const resourcesDoc = resourcesDom.window.document;
        return extractResourcesFromDocument(resourcesDoc);
      }
    } else {
      return extractResourcesFromDocument(document);
    }
  } catch (error) {
    logger.warn('Failed to extract resources:', error);
  }

  // Fallback: at least try to extract video download links
  const downloadLinks = document.querySelectorAll('a[href*=".mp4"], a[download]');
  downloadLinks.forEach((link: Element) => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent?.toLowerCase() || '';

    if (href.includes('_hd.mp4') || text.includes('hd')) {
      resources.hdVideo = href.startsWith('http') ? href : `${WWDC_URLS.BASE.replace('/videos', '')}${href}`;
    } else if (href.includes('_sd.mp4') || text.includes('sd')) {
      resources.sdVideo = href.startsWith('http') ? href : `${WWDC_URLS.BASE.replace('/videos', '')}${href}`;
    }
  });

  return resources;
}

/**
 * Extract resources from document
 */
function extractResourcesFromDocument(document: Document): VideoResources {
  const resources: VideoResources = {
    resourceLinks: [],
  };

  // Extract all resource links
  const resourceLinks = document.querySelectorAll('a[href]');
  const processedUrls = new Set<string>();

  resourceLinks.forEach((link: Element) => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent?.trim() || '';

    if (!href || !text) {
      return;
    }

    // Build complete URL
    const fullUrl = href.startsWith('http') ? href : `${WWDC_URLS.BASE.replace('/videos', '')}${href}`;

    // Avoid duplicates
    if (processedUrls.has(fullUrl)) {
      return;
    }
    processedUrls.add(fullUrl);

    // Identify different types of resources
    if (href.includes('_hd.mp4') || text.toLowerCase().includes('hd video')) {
      resources.hdVideo = fullUrl;
    } else if (href.includes('_sd.mp4') || text.toLowerCase().includes('sd video')) {
      resources.sdVideo = fullUrl;
    } else if (href.includes('sample-code') || href.endsWith('.zip')) {
      resources.sampleProject = fullUrl;
    } else if (
      href.includes('/documentation/') ||
      href.includes('/design/') ||
      href.includes('/technotes/') ||
      href.includes('/forums/') ||
      text.includes('Human Interface Guidelines') ||
      text.includes('Documentation') ||
      text.includes('Forum')
    ) {
      // Add to resource links list
      resources.resourceLinks!.push({
        title: text,
        url: fullUrl,
      });
    }
  });

  return resources;
}

/**
 * Extract related videos
 */
async function extractRelatedVideos(document: Document, videoUrl: string): Promise<RelatedVideo[]> {
  const relatedVideos: RelatedVideo[] = [];

  try {
    // Find related videos section
    const relatedSection = document.querySelector('.related-videos, [data-related], #related');

    if (!relatedSection) {
      // Try to find related video links from page bottom
      const videoLinks = document.querySelectorAll('a[href*="/videos/play/wwdc"]');
      const currentVideoId = videoUrl.match(/\/(\d+)\/?$/)?.[1];

      videoLinks.forEach((link: Element) => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/videos\/play\/wwdc(\d{4})\/(\d+)\/?/);

        if (match && match[2] !== currentVideoId) {
          const year = match[1];
          const id = match[2];
          const title = link.textContent?.trim() || '';

          // Filter out current video and already added videos
          if (title && !relatedVideos.find(v => v.id === id)) {
            relatedVideos.push({
              id,
              year,
              title,
              url: href.startsWith('http') ? href : `${WWDC_URLS.BASE.replace('/videos', '')}${href}`,
            });
          }
        }
      });
    }
  } catch (error) {
    logger.warn('Failed to extract related videos:', error);
  }

  return relatedVideos;
}

/**
 * Clean up code indentation
 */
function cleanCodeIndentation(code: string): string {
  const lines = code.split('\n');

  // Remove empty lines at start and end
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  if (lines.length === 0) {
    return '';
  }

  // Find minimum indentation (excluding empty lines)
  const minIndent = lines
    .filter(line => line.trim().length > 0)
    .reduce((min, line) => {
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      return Math.min(min, indent);
    }, Infinity);

  // Remove common indentation
  if (minIndent > 0 && minIndent !== Infinity) {
    return lines
      .map(line => line.substring(minIndent))
      .join('\n')
      .trim();
  }

  return lines.join('\n').trim();
}

/**
 * Remove duplicate code examples
 */
function removeDuplicateCodeExamples(examples: CodeExample[]): CodeExample[] {
  const seen = new Map<string, CodeExample>();

  for (const example of examples) {
    // Use code content as key
    const key = example.code.trim();

    // If haven't seen this code, or current one has better metadata (title or timestamp)
    const existing = seen.get(key);
    if (!existing ||
        (example.title && !existing.title) ||
        (example.timestamp && !existing.timestamp)) {
      seen.set(key, example);
    }
  }

  return Array.from(seen.values());
}