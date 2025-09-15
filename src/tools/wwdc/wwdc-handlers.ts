/**
 * WWDC Video MCP Tool Handlers
 */

import type { WWDCVideo } from '../../types/wwdc.js';
import { logger } from '../../utils/logger.js';
import {
  loadGlobalMetadata,
  loadTopicIndex,
  loadYearIndex,
  loadVideoData,
} from '../../utils/wwdc-data-source.js';

/**
 * Helper function to load multiple video data files
 */
async function loadVideosData(videoFiles: string[]): Promise<WWDCVideo[]> {
  const videos: WWDCVideo[] = [];
  for (const file of videoFiles) {
    // Extract year and video ID from filename (e.g., "videos/2024-10015.json")
    const match = file.match(/(\d{4})-(\d+)\.json$/);
    if (match) {
      const [, year, videoId] = match;
      try {
        const video = await loadVideoData(year, videoId);
        videos.push(video);
      } catch (error) {
        // Skip videos that can't be loaded
        logger.debug(`Failed to load video ${file}:`, error);
      }
    }
  }
  return videos;
}

/**
 * List WWDC videos
 */
export async function handleListWWDCVideos(
  year?: string,
  topic?: string,
  hasCode?: boolean,
  limit: number = 50,
): Promise<string> {
  try {
    // Load metadata
    const metadata = await loadGlobalMetadata();

    let allVideos: Array<WWDCVideo & { year: string }> = [];

    if (topic?.includes('-')) {
      // If topic looks like a topic ID, try to use topic index
      try {
        const topicIndex = await loadTopicIndex(topic);

        // Filter by year
        const videosToLoad = year && year !== 'all'
          ? topicIndex.videos.filter(v => v.year === year)
          : topicIndex.videos;

        // Load video data
        const videoFiles = videosToLoad.map((v: any) => v.dataFile);
        const videos = await loadVideosData(videoFiles);

        allVideos = videos.map((v: WWDCVideo) => ({ ...v, year: v.year }));
      } catch (error) {
        logger.warn(`Failed to load topic index for ${topic}, will search by keyword instead`);
        // Fall through to load by year and filter by keyword
      }
    }

    if (allVideos.length === 0 && year && year !== 'all') {
      // If year is specified, use year index
      const yearIndex = await loadYearIndex(year);

      // 加载视频数据
      const videoFiles = yearIndex.videos.map((v: any) => v.dataFile);
      const videos = await loadVideosData(videoFiles);

      allVideos = videos.map((v: WWDCVideo) => ({ ...v, year: v.year }));
    } else if (allVideos.length === 0) {
      // Load all videos - through year indices
      const yearsToLoad = metadata.years;

      for (const y of yearsToLoad) {
        try {
          const yearIndex = await loadYearIndex(y);
          const videoFiles = yearIndex.videos.map((v: any) => v.dataFile);
          const videos = await loadVideosData(videoFiles);

          const videosWithYear = videos.map((v: WWDCVideo) => ({ ...v, year: y }));
          allVideos.push(...videosWithYear);
        } catch (error) {
          logger.warn(`Failed to load year ${y}:`, error);
        }
      }
    }

    // Apply filters
    let filteredVideos = allVideos;

    // Topic filter (if not already filtered through topic index)
    if (topic && allVideos.length > 0) {
      // If we loaded videos but didn't use topic index, filter by keyword
      const topicLower = topic.toLowerCase();
      const wasFilteredByTopicIndex = topic.includes('-') && allVideos.length > 0;

      if (!wasFilteredByTopicIndex) {
        filteredVideos = filteredVideos.filter(v =>
          v.topics.some(t => t.toLowerCase().includes(topicLower)) ||
          v.title.toLowerCase().includes(topicLower),
        );
      }
    }

    // Code filter
    if (hasCode !== undefined) {
      filteredVideos = filteredVideos.filter(v => v.hasCode === hasCode);
    }

    // Apply limit
    const limitedVideos = filteredVideos.slice(0, limit);

    // Format output
    return formatVideoList(limitedVideos, year, topic, hasCode);

  } catch (error) {
    logger.error('Failed to list WWDC videos:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to list WWDC videos: ${errorMessage}`;
  }
}

/**
 * Search WWDC content
 */
export async function handleSearchWWDCContent(
  query: string,
  searchIn: 'transcript' | 'code' | 'both' = 'both',
  year?: string,
  language?: string,
  limit: number = 20,
): Promise<string> {
  try {
    const metadata = await loadGlobalMetadata();
    const queryLower = query.toLowerCase();
    const results: Array<{
      video: WWDCVideo & { year: string };
      matches: Array<{ type: 'transcript' | 'code'; context: string; timestamp?: string }>;
    }> = [];

    // Determine years to search
    const yearsToSearch = year ? [year] : metadata.years;

    // Search each year
    for (const y of yearsToSearch) {
      try {
        const yearIndex = await loadYearIndex(y);

        // Pre-filter: only load videos that might contain search content
        const potentialVideos = yearIndex.videos.filter(v => {
          // Basic title and topic matching
          const titleMatch = v.title?.toLowerCase().includes(queryLower) || false;
          const topicMatch = v.topics?.some(t => t.toLowerCase().includes(queryLower)) || false;
          return titleMatch || topicMatch ||
                 (searchIn === 'code' || searchIn === 'both') && v.hasCode ||
                 (searchIn === 'transcript' || searchIn === 'both') && v.hasTranscript;
        });

        if (potentialVideos.length === 0) {
          continue;
        }

        // 加载视频数据
        const videoFiles = potentialVideos.map((v: any) => v.dataFile);
        const videos = await loadVideosData(videoFiles);

        // Search each video
        for (const video of videos) {
          const matches: Array<{ type: 'transcript' | 'code'; context: string; timestamp?: string }> = [];

          // Search transcript
          if ((searchIn === 'transcript' || searchIn === 'both') && video.transcript) {
            const transcriptMatches = searchInTranscript(video.transcript.fullText, queryLower);
            matches.push(...transcriptMatches.map(m => ({
              type: 'transcript' as const,
              context: m.context,
              timestamp: m.timestamp,
            })));
          }

          // Search code
          if ((searchIn === 'code' || searchIn === 'both') && video.codeExamples) {
            const codeMatches = searchInCode(video.codeExamples, queryLower, language);
            matches.push(...codeMatches.map(m => ({
              type: 'code' as const,
              context: m.context,
              timestamp: m.timestamp,
            })));
          }

          if (matches.length > 0) {
            results.push({
              video: { ...video, year: y },
              matches: matches.slice(0, 3), // Max 3 matches per video
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to search year ${y}:`, error);
      }
    }

    // Sort by match count
    results.sort((a, b) => b.matches.length - a.matches.length);

    // Apply limit
    const limitedResults = results.slice(0, limit);

    return formatSearchResults(limitedResults, query, searchIn);

  } catch (error) {
    logger.error('Failed to search WWDC content:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to search WWDC content: ${errorMessage}`;
  }
}

/**
 * Get WWDC video details
 */
export async function handleGetWWDCVideo(
  year: string,
  videoId: string,
  includeTranscript: boolean = true,
  includeCode: boolean = true,
): Promise<string> {
  try {
    // Load video data directly
    const video = await loadVideoData(year, videoId);

    return formatVideoDetail(video, includeTranscript, includeCode);

  } catch (error) {
    logger.error('Failed to get WWDC video:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to get WWDC video: ${errorMessage}`;
  }
}

/**
 * Get WWDC code examples
 */
export async function handleGetWWDCCodeExamples(
  framework?: string,
  topic?: string,
  year?: string,
  language?: string,
  limit: number = 30,
): Promise<string> {
  try {
    const metadata = await loadGlobalMetadata();
    const codeExamples: Array<{
      code: string;
      language: string;
      title?: string;
      timestamp?: string;
      videoTitle: string;
      videoUrl: string;
      year: string;
    }> = [];

    // Determine years to search
    const yearsToSearch = year ? [year] : metadata.years;

    for (const y of yearsToSearch) {
      try {
        const yearIndex = await loadYearIndex(y);

        // Pre-filter: only load videos with code
        const videosWithCode = yearIndex.videos.filter(v => v.hasCode);

        // Topic filter
        let filteredVideos = videosWithCode;
        if (topic) {
          if (topic.includes('-')) {
            // If it's a standard topic ID, use topic index directly
            try {
              const topicIndex = await loadTopicIndex(topic);
              const topicVideoIds = new Set(topicIndex.videos.map((v: any) => v.id));
              filteredVideos = videosWithCode.filter(v => topicVideoIds.has(v.id));
            } catch (error) {
              // If topic index doesn't exist, fallback to string matching
              const topicLower = topic.toLowerCase();
              filteredVideos = videosWithCode.filter(v =>
                v.topics.some(t => t.toLowerCase().includes(topicLower)) ||
                v.title.toLowerCase().includes(topicLower),
              );
            }
          } else {
            // Search by name
            const topicLower = topic.toLowerCase();
            filteredVideos = videosWithCode.filter(v =>
              v.topics.some(t => t.toLowerCase().includes(topicLower)) ||
              v.title.toLowerCase().includes(topicLower),
            );
          }
        }

        if (filteredVideos.length === 0) {
          continue;
        }

        // 加载视频数据
        const videoFiles = filteredVideos.map((v: any) => v.dataFile);
        const videos = await loadVideosData(videoFiles);

        // Extract code examples
        for (const video of videos) {
          if (!video.codeExamples || video.codeExamples.length === 0) {
            continue;
          }

          for (const example of video.codeExamples) {
            // Language filter
            if (language && example.language.toLowerCase() !== language.toLowerCase()) {
              continue;
            }

            // Framework filter (search in code)
            if (framework && !example.code.toLowerCase().includes(framework.toLowerCase())) {
              continue;
            }

            codeExamples.push({
              code: example.code,
              language: example.language,
              title: example.title,
              timestamp: example.timestamp,
              videoTitle: video.title,
              videoUrl: video.url,
              year: y,
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to search code examples for year ${y}:`, error);
      }
    }

    // Limit result count
    const limitedExamples = codeExamples.slice(0, limit);

    return formatCodeExamples(limitedExamples, framework, topic, language);

  } catch (error) {
    logger.error('Failed to get WWDC code examples:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to get WWDC code examples: ${errorMessage}`;
  }
}

/**
 * Search in transcript
 */
function searchInTranscript(
  fullText: string,
  query: string,
): Array<{ context: string; timestamp?: string }> {
  const matches: Array<{ context: string; timestamp?: string }> = [];
  const lines = fullText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(query)) {
      // Get context (one line before and after)
      const context = [
        lines[i - 1] || '',
        line,
        lines[i + 1] || '',
      ].filter(l => l.trim()).join(' ... ');

      matches.push({ context });
    }
  }

  return matches;
}

/**
 * Search in code
 */
function searchInCode(
  codeExamples: Array<{ code: string; language: string; timestamp?: string; title?: string }>,
  query: string,
  language?: string,
): Array<{ context: string; timestamp?: string }> {
  const matches: Array<{ context: string; timestamp?: string }> = [];

  for (const example of codeExamples) {
    // Language filter
    if (language && example.language.toLowerCase() !== language.toLowerCase()) {
      continue;
    }

    if (example.code.toLowerCase().includes(query)) {
      // Extract code snippet containing the query
      const lines = example.code.split('\n');
      const matchingLines = lines.filter(line => line.toLowerCase().includes(query));

      matches.push({
        context: `[${example.language}] ${example.title || ''}: ${matchingLines[0]}`,
        timestamp: example.timestamp,
      });
    }
  }

  return matches;
}

/**
 * Format video list
 */
function formatVideoList(
  videos: Array<WWDCVideo & { year: string }>,
  year?: string,
  topic?: string,
  hasCode?: boolean,
): string {
  if (videos.length === 0) {
    return 'No WWDC videos found matching the criteria.';
  }

  let content = '# WWDC Video List\n\n';

  // Filter conditions
  const filters: string[] = [];
  if (year && year !== 'all') {
    filters.push(`Year: ${year}`);
  }
  if (topic) {
    filters.push(`Topic: ${topic}`);
  }
  if (hasCode !== undefined) {
    filters.push(`Has Code: ${hasCode ? 'Yes' : 'No'}`);
  }

  if (filters.length > 0) {
    content += `**Filter Conditions:** ${filters.join(', ')}\n\n`;
  }

  content += `**Found ${videos.length} videos**\n\n`;

  // Group by year
  const videosByYear = videos.reduce((acc, video) => {
    if (!acc[video.year]) {
      acc[video.year] = [];
    }
    acc[video.year].push(video);
    return acc;
  }, {} as Record<string, typeof videos>);

  // Format each year
  Object.keys(videosByYear)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .forEach(y => {
      content += `## WWDC${y}\n\n`;

      videosByYear[y].forEach(video => {
        content += `### [${video.title}](${video.url})\n`;

        const metadata: string[] = [];
        if (video.duration) {
          metadata.push(`Duration: ${video.duration}`);
        }
        if (video.speakers && video.speakers.length > 0) {
          metadata.push(`Speakers: ${video.speakers.join(', ')}`);
        }
        if (video.hasTranscript) {
          metadata.push('Transcript');
        }
        if (video.hasCode) {
          metadata.push('Code Examples');
        }

        if (metadata.length > 0) {
          content += `*${metadata.join(' | ')}*\n`;
        }

        if (video.topics.length > 0) {
          content += `**Topics:** ${video.topics.join(', ')}\n`;
        }

        content += '\n';
      });
    });

  return content;
}

/**
 * Format search results
 */
function formatSearchResults(
  results: Array<{
    video: WWDCVideo & { year: string };
    matches: Array<{ type: 'transcript' | 'code'; context: string; timestamp?: string }>;
  }>,
  query: string,
  searchIn: string,
): string {
  if (results.length === 0) {
    return `No ${searchIn === 'code' ? 'code' : searchIn === 'transcript' ? 'transcript' : 'content'} found containing "${query}".`;
  }

  let content = '# WWDC Content Search Results\n\n';
  content += `**Search Query:** "${query}"\n`;
  content += `**Search Scope:** ${searchIn === 'code' ? 'Code' : searchIn === 'transcript' ? 'Transcript' : 'All Content'}\n`;
  content += `**Found ${results.length} related videos**\n\n`;

  results.forEach(result => {
    content += `## [${result.video.title}](${result.video.url})\n`;
    content += `*WWDC${result.video.year} | ${result.matches.length} matches*\n\n`;

    result.matches.forEach(match => {
      content += `**${match.type === 'code' ? 'Code' : 'Transcript'}**`;
      if (match.timestamp) {
        content += ` (${match.timestamp})`;
      }
      content += '\n';
      content += `> ${match.context}\n\n`;
    });
  });

  return content;
}

/**
 * Format video details
 */
function formatVideoDetail(
  video: WWDCVideo,
  includeTranscript: boolean,
  includeCode: boolean,
): string {
  let content = `# ${video.title}\n\n`;
  content += `**WWDC${video.year}** | [Watch Video](${video.url})\n\n`;

  // Basic information
  if (video.duration) {
    content += `**Duration:** ${video.duration}\n`;
  }
  if (video.speakers && video.speakers.length > 0) {
    content += `**Speakers:** ${video.speakers.join(', ')}\n`;
  }
  if (video.topics.length > 0) {
    content += `**Topics:** ${video.topics.join(', ')}\n`;
  }

  // Resource links
  if (video.resources.hdVideo || video.resources.sdVideo || video.resources.resourceLinks) {
    content += '\n**Resources:**\n';
    if (video.resources.hdVideo) {
      content += `- [HD Video](${video.resources.hdVideo})\n`;
    }
    if (video.resources.sdVideo) {
      content += `- [SD Video](${video.resources.sdVideo})\n`;
    }
    if (video.resources.resourceLinks && video.resources.resourceLinks.length > 0) {
      video.resources.resourceLinks.forEach(link => {
        content += `- [${link.title}](${link.url})\n`;
      });
    }
  }

  // Chapters
  if (video.chapters && video.chapters.length > 0) {
    content += '\n## Chapters\n\n';
    video.chapters.forEach(chapter => {
      content += `- **${chapter.timestamp}** ${chapter.title}\n`;
    });
  }

  // Transcript
  if (includeTranscript && video.transcript) {
    content += '\n## Transcript\n\n';

    // If there are timestamped segments, use them
    if (video.transcript.segments.length > 0) {
      video.transcript.segments.forEach(segment => {
        content += `**${segment.timestamp}**\n`;
        content += `${segment.text}\n\n`;
      });
    } else {
      // Show full transcript text
      content += video.transcript.fullText;
    }
  }

  // Code examples
  if (includeCode && video.codeExamples && video.codeExamples.length > 0) {
    content += '\n## Code Examples\n\n';

    video.codeExamples.forEach((example, index) => {
      if (example.title) {
        content += `### ${example.title}`;
      } else {
        content += `### Code Example ${index + 1}`;
      }

      if (example.timestamp) {
        content += ` (${example.timestamp})`;
      }
      content += '\n\n';

      content += `\`\`\`${example.language}\n`;
      content += example.code;
      content += '\n\`\`\`\n\n';

      if (example.context) {
        content += `*${example.context}*\n\n`;
      }
    });
  }

  // Related videos
  if (video.relatedVideos && video.relatedVideos.length > 0) {
    content += '\n## Related Videos\n\n';
    video.relatedVideos.forEach(related => {
      content += `- [${related.title}](${related.url}) (WWDC${related.year})\n`;
    });
  }

  return content;
}

/**
 * Format code examples
 */
function formatCodeExamples(
  examples: Array<{
    code: string;
    language: string;
    title?: string;
    timestamp?: string;
    videoTitle: string;
    videoUrl: string;
    year: string;
  }>,
  framework?: string,
  topic?: string,
  language?: string,
): string {
  if (examples.length === 0) {
    return 'No code examples found matching the criteria.';
  }

  let content = '# WWDC Code Examples\n\n';

  // Filter conditions
  const filters: string[] = [];
  if (framework) {
    filters.push(`Framework: ${framework}`);
  }
  if (topic) {
    filters.push(`Topic: ${topic}`);
  }
  if (language) {
    filters.push(`Language: ${language}`);
  }

  if (filters.length > 0) {
    content += `**Filter Conditions:** ${filters.join(', ')}\n\n`;
  }

  content += `**Found ${examples.length} code examples**\n\n`;

  // Group by language
  const examplesByLanguage = examples.reduce((acc, ex) => {
    if (!acc[ex.language]) {
      acc[ex.language] = [];
    }
    acc[ex.language].push(ex);
    return acc;
  }, {} as Record<string, typeof examples>);

  Object.keys(examplesByLanguage).forEach(lang => {
    content += `## ${lang.charAt(0).toUpperCase() + lang.slice(1)}\n\n`;

    examplesByLanguage[lang].forEach(example => {
      content += `### ${example.title || 'Code Example'}\n`;
      content += `*From: [${example.videoTitle}](${example.videoUrl}) (WWDC${example.year})*`;

      if (example.timestamp) {
        content += ` *@ ${example.timestamp}*`;
      }
      content += '\n\n';

      content += `\`\`\`${example.language}\n`;
      content += example.code;
      content += '\n\`\`\`\n\n';
    });
  });

  return content;
}

/**
 * Browse WWDC topics
 */
export async function handleBrowseWWDCTopics(
  topicId?: string,
  includeVideos: boolean = true,
  year?: string,
  limit: number = 20,
): Promise<string> {
  try {
    const metadata = await loadGlobalMetadata();

    if (!topicId) {
      // List all available topics
      let content = '# WWDC Topics\n\n';
      content += `Found ${metadata.topics.length} topics:\n\n`;

      metadata.topics.forEach(topic => {
        content += `## [${topic.name}](${topic.url})\n`;
        content += `**Topic ID:** ${topic.id}\n`;

        // Show video count for this topic
        const topicStats = metadata.statistics.byTopic[topic.id];
        if (topicStats) {
          content += `**Videos:** ${topicStats}\n`;
        }

        content += '\n';
      });

      return content;
    }

    // Browse specific topic
    const topic = metadata.topics.find(t => t.id === topicId);
    if (!topic) {
      return `Topic "${topicId}" not found. Available topics: ${metadata.topics.map(t => t.id).join(', ')}`;
    }

    let content = `# ${topic.name}\n\n`;
    content += `**Topic ID:** ${topic.id}\n`;
    content += `**URL:** [${topic.url}](${topic.url})\n\n`;

    if (includeVideos) {
      try {
        const topicIndex = await loadTopicIndex(topicId);

        // Filter by year if specified
        let videosToShow = topicIndex.videos;
        if (year && year !== 'all') {
          videosToShow = videosToShow.filter(v => v.year === year);
        }

        // Apply limit
        videosToShow = videosToShow.slice(0, limit);

        content += `## Videos (${videosToShow.length}${videosToShow.length === limit ? '+' : ''})\n\n`;

        if (videosToShow.length === 0) {
          content += 'No videos found for this topic.\n';
        } else {
          // Group by year
          const videosByYear = videosToShow.reduce((acc, video) => {
            if (!acc[video.year]) {
              acc[video.year] = [];
            }
            acc[video.year].push(video);
            return acc;
          }, {} as Record<string, typeof videosToShow>);

          Object.keys(videosByYear)
            .sort((a, b) => parseInt(b) - parseInt(a))
            .forEach(y => {
              content += `### WWDC${y}\n\n`;

              videosByYear[y].forEach(video => {
                content += `- [${video.title}](${video.url})`;

                const features: string[] = [];
                if (video.hasTranscript) {
                  features.push('Transcript');
                }
                if (video.hasCode) {
                  features.push('Code');
                }

                if (features.length > 0) {
                  content += ` | ${features.join(' | ')}`;
                }

                content += '\n';
              });

              content += '\n';
            });
        }

      } catch (error) {
        content += `Error loading videos for topic: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    }

    return content;

  } catch (error) {
    logger.error('Failed to browse WWDC topics:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to browse WWDC topics: ${errorMessage}`;
  }
}

/**
 * Find related WWDC videos
 */
export async function handleFindRelatedWWDCVideos(
  videoId: string,
  year: string,
  includeExplicitRelated: boolean = true,
  includeTopicRelated: boolean = true,
  includeYearRelated: boolean = false,
  limit: number = 15,
): Promise<string> {
  try {
    // Load the source video
    const sourceVideo = await loadVideoData(year, videoId);

    let content = `# Related Videos for "${sourceVideo.title}"\n\n`;
    content += `**Source:** [${sourceVideo.title}](${sourceVideo.url}) (WWDC${year})\n\n`;

    const relatedVideos: Array<{
      video: WWDCVideo & { year: string };
      relationship: string;
      score: number;
    }> = [];

    // 1. Explicit related videos from video metadata
    if (includeExplicitRelated && sourceVideo.relatedVideos) {
      for (const related of sourceVideo.relatedVideos) {
        try {
          const relatedVideo = await loadVideoData(related.year, related.id);

          relatedVideos.push({
            video: { ...relatedVideo, year: related.year },
            relationship: 'Explicitly related',
            score: 10,
          });
        } catch (error) {
          logger.warn(`Failed to load related video ${related.year}-${related.id}:`, error);
        }
      }
    }

    // 2. Topic-related videos
    if (includeTopicRelated && sourceVideo.topics && sourceVideo.topics.length > 0) {
      for (const topic of sourceVideo.topics) {
        try {
          // Try to find topic by name mapping
          const metadata = await loadGlobalMetadata();
          const topicEntry = metadata.topics.find(t =>
            t.name.toLowerCase() === topic.toLowerCase() ||
            t.id.toLowerCase().includes(topic.toLowerCase().replace(/\s+/g, '-')),
          );

          if (topicEntry) {
            const topicIndex = await loadTopicIndex(topicEntry.id);

            // Get videos from same topic (excluding source video)
            const topicVideos = topicIndex.videos.filter(v => v.id !== videoId);

            // Load video data for scoring
            const videoFiles = topicVideos.slice(0, 10).map((v: any) => v.dataFile); // Limit to avoid too many requests
            const videos = await loadVideosData(videoFiles);

            for (const video of videos) {
              // Skip if already added
              if (relatedVideos.find(r => r.video.id === video.id && r.video.year === video.year)) {
                continue;
              }

              // Calculate similarity score based on shared topics
              const sharedTopics = (sourceVideo.topics || []).filter(t =>
                video.topics?.some(vt => vt.toLowerCase() === t.toLowerCase()) || false,
              );
              const score = sharedTopics.length * 2;

              relatedVideos.push({
                video: { ...video, year: video.year },
                relationship: `Same topic: ${topicEntry.name}`,
                score,
              });
            }
          }
        } catch (error) {
          logger.warn(`Failed to find topic-related videos for topic ${topic}:`, error);
        }
      }
    }

    // 3. Year-related videos (same year, similar topics)
    if (includeYearRelated) {
      try {
        const yearIndex = await loadYearIndex(year);

        // Get videos from same year with overlapping topics
        const yearVideos = yearIndex.videos.filter(v =>
          v.id !== videoId &&
          v.topics.some(t => sourceVideo.topics?.some(st => st.toLowerCase() === t.toLowerCase()) || false),
        );

        // Load a sample of videos
        const videoFiles = yearVideos.slice(0, 10).map((v: any) => v.dataFile);
        const videos = await loadVideosData(videoFiles);

        for (const video of videos) {
          // Skip if already added
          if (relatedVideos.find(r => r.video.id === video.id && r.video.year === video.year)) {
            continue;
          }

          const sharedTopics = (sourceVideo.topics || []).filter(t =>
            video.topics?.some(vt => vt.toLowerCase() === t.toLowerCase()) || false,
          );
          const score = sharedTopics.length;

          relatedVideos.push({
            video: { ...video, year: video.year },
            relationship: `Same year, shared topics: ${sharedTopics.join(', ')}`,
            score,
          });
        }
      } catch (error) {
        logger.warn('Failed to find year-related videos:', error);
      }
    }

    // Sort by score (descending) and apply limit
    relatedVideos.sort((a, b) => b.score - a.score);
    const limitedResults = relatedVideos.slice(0, limit);

    if (limitedResults.length === 0) {
      content += 'No related videos found.\n';
    } else {
      content += `## Related Videos (${limitedResults.length})\n\n`;

      limitedResults.forEach(result => {
        content += `### [${result.video.title}](${result.video.url})\n`;
        content += `*WWDC${result.video.year} | ${result.relationship}*\n\n`;

        const features: string[] = [];
        if (result.video.duration) {
          features.push(`Duration: ${result.video.duration}`);
        }
        if (result.video.hasTranscript) {
          features.push('Transcript');
        }
        if (result.video.hasCode) {
          features.push('Code');
        }

        if (features.length > 0) {
          content += `${features.join(' | ')}\n`;
        }

        if (result.video.topics.length > 0) {
          content += `**Topics:** ${result.video.topics.join(', ')}\n`;
        }

        content += '\n';
      });
    }

    return content;

  } catch (error) {
    logger.error('Failed to find related WWDC videos:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to find related WWDC videos: ${errorMessage}`;
  }
}

/**
 * List all available WWDC years
 */
export async function handleListWWDCYears(): Promise<string> {
  try {
    // Load metadata to get available years
    const metadata = await loadGlobalMetadata();

    let content = '# Available WWDC Years\n\n';

    // Check if years exist in metadata
    if (!metadata.years || metadata.years.length === 0) {
      return 'No WWDC years available.';
    }

    // Sort years in descending order (newest first)
    const sortedYears = [...metadata.years].sort((a, b) => b.localeCompare(a));

    content += `**Total Years:** ${sortedYears.length}\n\n`;
    content += '## Years with Video Counts\n\n';

    // Get video count for each year from statistics
    for (const year of sortedYears) {
      const videoCount = metadata.statistics?.byYear?.[year] || 0;
      content += `- **${year}**: ${videoCount} videos\n`;
    }

    // Add total video count
    content += `\n**Total Videos:** ${metadata.totalVideos || 0}\n`;

    // Add statistics summary if available
    if (metadata.statistics) {
      content += '\n## Statistics\n\n';
      content += `- **Videos with Code:** ${metadata.statistics.videosWithCode || 0}\n`;
      content += `- **Videos with Transcript:** ${metadata.statistics.videosWithTranscript || 0}\n`;
      content += `- **Videos with Resources:** ${metadata.statistics.videosWithResources || 0}\n`;
    }

    return content;

  } catch (error) {
    logger.error('Failed to list WWDC years:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to list WWDC years: ${errorMessage}`;
  }
}