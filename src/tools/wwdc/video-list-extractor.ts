/**
 * WWDC video list extractor
 */

import { JSDOM } from 'jsdom';
import { httpClient } from '../../utils/http-client.js';
import { logger } from '../../utils/logger.js';
import { WWDC_URLS } from '../../utils/constants.js';
import type { VideoListItem } from '../../types/wwdc.js';

/**
 * Extract all WWDC video list for specified year
 */
export async function extractVideoList(year: string): Promise<VideoListItem[]> {
  const url = WWDC_URLS.getYearUrl(year);
  logger.info(`Extracting video list for WWDC${year} from ${url}`);

  try {
    const response = await httpClient.get(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const uniqueVideos = new Map<string, VideoListItem>();

    // Find all video cards
    const videoElements = document.querySelectorAll(
      '.video-card, .collection-item, article[data-video-id], a[href*="/videos/play/"]',
    );

    videoElements.forEach(element => {
      const video = extractVideoFromElement(element, year);
      if (video && !uniqueVideos.has(video.id)) {
        uniqueVideos.set(video.id, video);
      }
    });

    // If first method found nothing, try alternative selectors
    if (uniqueVideos.size === 0) {
      logger.warn('No videos found with primary selectors, trying alternative method');

      // Find all video links
      const videoLinks = document.querySelectorAll(`a[href*="/videos/play/wwdc${year}/"]`);

      videoLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/videos\/play\/wwdc\d+\/(\d+)\/?/);

        if (match) {
          const id = match[1];
          if (!uniqueVideos.has(id)) {
            const title = extractTitleFromLink(link);
            const url = WWDC_URLS.getVideoUrl(year, id);

            uniqueVideos.set(id, {
              id,
              url,
              title,
              duration: extractDurationFromLink(link),
              thumbnail: extractThumbnailFromLink(link),
            });
          }
        }
      });
    }

    const videos = Array.from(uniqueVideos.values());
    logger.info(`Found ${videos.length} videos for WWDC${year}`);
    return videos;

  } catch (error) {
    logger.error(`Failed to extract video list for WWDC${year}:`, error);
    throw new Error(`Failed to extract video list for WWDC${year}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract video information from element
 */
function extractVideoFromElement(element: Element, year: string): VideoListItem | null {
  // Extract video ID
  let id: string | null = null;

  // Get from data attribute
  id = element.getAttribute('data-video-id');

  // Get from link
  if (!id) {
    const link = element.querySelector('a[href*="/videos/play/"]') || element;
    const href = link.getAttribute('href') || '';
    const match = href.match(/\/videos\/play\/wwdc\d+\/(\d+)\/?/);
    if (match) {
      id = match[1];
    }
  }

  if (!id) {
    return null;
  }

  // Extract title
  const title = extractTitle(element);

  // Build URL
  const url = WWDC_URLS.getVideoUrl(year, id);

  // Extract duration
  const duration = extractDuration(element);

  // Extract thumbnail
  const thumbnail = extractThumbnail(element);

  return {
    id,
    url,
    title,
    duration,
    thumbnail,
  };
}

/**
 * Extract title
 */
function extractTitle(element: Element): string {
  const selectors = [
    '.video-title',
    '.item-title',
    'h2',
    'h3',
    'h4',
    '[itemprop="name"]',
  ];

  for (const selector of selectors) {
    const titleElement = element.querySelector(selector);
    if (titleElement?.textContent) {
      return titleElement.textContent.trim();
    }
  }

  // Get from image alt attribute
  const img = element.querySelector('img[alt]');
  if (img) {
    const alt = img.getAttribute('alt') || '';
    if (alt && !alt.toLowerCase().includes('thumbnail')) {
      return alt.trim();
    }
  }

  return 'Untitled';
}

/**
 * Extract title from link element
 */
function extractTitleFromLink(link: Element): string {
  // Try to get from link text
  const linkText = link.textContent?.trim();
  if (linkText && linkText.length > 3) {
    return linkText;
  }

  // Try to get from parent element
  const parent = link.parentElement;
  if (parent) {
    return extractTitle(parent);
  }

  // Try to get from adjacent element
  const nextSibling = link.nextElementSibling;
  if (nextSibling?.textContent) {
    return nextSibling.textContent.trim();
  }

  return 'Untitled';
}

/**
 * Extract duration
 */
function extractDuration(element: Element): string {
  const selectors = [
    '.video-duration',
    '.duration',
    '.time',
    '[itemprop="duration"]',
  ];

  for (const selector of selectors) {
    const durationElement = element.querySelector(selector);
    if (durationElement?.textContent) {
      const duration = durationElement.textContent.trim();
      // Validate if it's time format
      if (/\d+:\d+/.test(duration)) {
        return duration;
      }
    }
  }

  return '';
}

/**
 * Extract duration from link element
 */
function extractDurationFromLink(link: Element): string {
  const parent = link.closest('.video-card, .collection-item, article');
  if (parent) {
    return extractDuration(parent);
  }
  return '';
}

/**
 * Extract thumbnail
 */
function extractThumbnail(element: Element): string {
  const img = element.querySelector('img[src*="devimages"], img.thumbnail, img.video-thumbnail');
  if (img) {
    const src = img.getAttribute('src') || '';
    if (src) {
      return src.startsWith('http') ? src : `${WWDC_URLS.BASE.replace('/videos', '')}${src}`;
    }
  }
  return '';
}

/**
 * Extract thumbnail from link element
 */
function extractThumbnailFromLink(link: Element): string {
  const parent = link.closest('.video-card, .collection-item, article');
  if (parent) {
    return extractThumbnail(parent);
  }
  return '';
}

/**
 * Get all supported WWDC years
 */
export async function getAvailableYears(): Promise<string[]> {
  const url = WWDC_URLS.BASE;
  logger.info('Fetching available WWDC years');

  try {
    const response = await httpClient.get(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const years: string[] = [];

    // Find all WWDC links
    const wwdcLinks = document.querySelectorAll('a[href*="/videos/wwdc"]');

    wwdcLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const match = href.match(/wwdc(\d{2,4})/);
      if (match) {
        const year = match[1];
        // Convert 2-digit year to 4-digit
        const fullYear = year.length === 2 ? `20${year}` : year;
        if (!years.includes(fullYear)) {
          years.push(fullYear);
        }
      }
    });

    // Sort by year in descending order
    years.sort((a, b) => parseInt(b) - parseInt(a));

    logger.info(`Found ${years.length} WWDC years: ${years.join(', ')}`);
    return years;

  } catch (error) {
    logger.error('Failed to fetch available years:', error);
    // Return known years as fallback
    return ['2025', '2024', '2023', '2022', '2021', '2020'];
  }
}