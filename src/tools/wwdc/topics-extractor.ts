/**
 * WWDC video topic classification extractor
 */

import { JSDOM } from 'jsdom';
import { httpClient } from '../../utils/http-client.js';
import { logger } from '../../utils/logger.js';
import { WWDC_URLS } from '../../utils/constants.js';

export interface Topic {
  id: string;           // URL slug, e.g., "accessibility-inclusion"
  name: string;         // Display name, e.g., "Accessibility & Inclusion"
  url: string;          // Complete URL
  description?: string; // Topic description
  videoCount?: number;  // Number of videos in this topic
}

export interface TopicVideo {
  id: string;
  year: string;
  title: string;
  duration: string;
  description?: string;
  thumbnail?: string;
  url: string;
}

/**
 * Extract all topic categories
 */
export async function extractAllTopics(): Promise<Topic[]> {
  const url = WWDC_URLS.TOPICS;
  logger.info('Extracting topic categories list...');

  try {
    const response = await httpClient.get(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const topics: Topic[] = [];

    // Find topic links - look for both /videos/topics/xxx and /videos/xxx/ formats
    const topicLinks = document.querySelectorAll('a[href*="/videos/"]');

    topicLinks.forEach((link: Element) => {
      const href = link.getAttribute('href') || '';
      
      // Look for topic links in different formats
      let match = href.match(/\/videos\/topics\/([a-z-]+)/) || 
                  href.match(/\/videos\/([a-z-]+)\/?$/);
      
      if (match && !href.includes('/play/')) {
        const id = match[1];
        
        // Skip non-topic links
        if (id === 'all-videos' || id === 'collections' || id === 'about' || 
            id === 'wwdc' || /^\d+$/.test(id)) {
          return;
        }

        // Extract name from heading or link text
        const heading = link.querySelector('h3, h4') || link;
        const name = heading.textContent?.trim() || '';
        
        if (!name) return;
        
        // Extract video count if available
        let videoCount = 0;  // Default to 0
        const countElement = link.querySelector('p');
        if (countElement) {
          const countMatch = countElement.textContent?.match(/(\d+)\s*videos?/i);
          if (countMatch) {
            videoCount = parseInt(countMatch[1]);
          }
        }

        topics.push({
          id,
          name,
          url: `${WWDC_URLS.BASE.replace('/videos', '')}${href}`,
          videoCount,
        });
      }
    });

    // Remove duplicates
    const uniqueTopics = Array.from(
      new Map(topics.map(t => [t.id, t])).values(),
    );
    
    // Sort alphabetically by name
    uniqueTopics.sort((a, b) => a.name.localeCompare(b.name));

    logger.info(`Found ${uniqueTopics.length} topic categories`);
    return uniqueTopics;

  } catch (error) {
    logger.error('Failed to extract topic categories:', error);
    throw new Error(`Failed to extract topics: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract all videos for a specific topic
 */
export async function extractTopicVideos(topicId: string): Promise<TopicVideo[]> {
  const url = WWDC_URLS.getTopicUrl(topicId);
  logger.info(`Extracting video list for topic ${topicId}...`);

  try {
    const response = await httpClient.get(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const videos: TopicVideo[] = [];

    // Find video cards
    const videoCards = document.querySelectorAll('a[href*="/videos/play/"]');

    videoCards.forEach((card: Element) => {
      const href = card.getAttribute('href') || '';
      const match = href.match(/\/videos\/play\/wwdc(\d{4})\/(\d+)\//);

      if (match) {
        const year = match[1];
        const id = match[2];

        // Extract title
        const titleEl = card.querySelector('h4, .title, [class*="title"]');
        const title = titleEl?.textContent?.trim() || '';

        // Extract duration
        const durationEl = card.querySelector('.video-duration, [class*="duration"], time');
        const duration = durationEl?.textContent?.trim() || '';

        // Extract description
        const descEl = card.querySelector('p, .description, [class*="description"]');
        const description = descEl?.textContent?.trim();

        // Extract thumbnail
        const imgEl = card.querySelector('img');
        const thumbnail = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || undefined;

        if (title) {
          videos.push({
            id,
            year,
            title,
            duration,
            description,
            thumbnail,
            url: `${WWDC_URLS.BASE.replace('/videos', '')}${href}`,
          });
        }
      }
    });

    logger.info(`Found ${videos.length} videos`);
    return videos;

  } catch (error) {
    logger.error(`Failed to extract videos for topic ${topicId}:`, error);
    throw error;
  }
}

/**
 * Standard topic mapping (ensures consistency)
 */
export const TOPIC_ID_TO_NAME: Record<string, string> = {
  'accessibility-inclusion': 'Accessibility & Inclusion',
  'app-services': 'App Services',
  'app-store-distribution-marketing': 'App Store, Distribution & Marketing',
  'audio-video': 'Audio & Video',
  'business-education': 'Business & Education',
  'design': 'Design',
  'developer-tools': 'Developer Tools',
  'essentials': 'Essentials',
  'graphics-games': 'Graphics & Games',
  'health-fitness': 'Health & Fitness',
  'maps-location': 'Maps & Location',
  'machine-learning-ai': 'Machine Learning & AI',
  'photos-camera': 'Photos & Camera',
  'privacy-security': 'Privacy & Security',
  'safari-web': 'Safari & Web',
  'spatial-computing': 'Spatial Computing',
  'swift': 'Swift',
  'swiftui-ui-frameworks': 'SwiftUI & UI Frameworks',
  'system-services': 'System Services',
};