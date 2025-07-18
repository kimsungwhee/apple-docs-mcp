import { technologiesCache, generateUrlCacheKey } from '../utils/cache.js';
import { APPLE_URLS, API_LIMITS } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { logger } from '../utils/logger.js';

/**
 * 技术信息接口
 */
interface Technology {
  title: string;
  identifier: string;
  tags: string[];
  languages: string[];
  url?: string;
  destination?: {
    identifier: string;
  };
}

interface TechnologyGroup {
  name: string;
  technologies: Technology[];
}

interface TechnologiesData {
  sections: Array<{
    kind: string;
    groups: TechnologyGroup[];
  }>;
}

/**
 * 获取技术列表
 */
export async function handleListTechnologies(
  category?: string,
  language?: string,
  includeBeta: boolean = true,
  limit: number = API_LIMITS.DEFAULT_TECHNOLOGIES_LIMIT,
): Promise<string> {
  try {
    logger.info('Fetching technologies list...');

    // Generate cache key
    const cacheKey = generateUrlCacheKey('technologies', { category, language, includeBeta, limit });

    // Try to get from cache first
    const cachedResult = technologiesCache.get<string>(cacheKey);
    if (cachedResult) {
      logger.debug('Technologies cache hit');
      return cachedResult;
    }

    // 获取技术列表
    const data = await httpClient.getJson<TechnologiesData>(APPLE_URLS.TECHNOLOGIES_JSON);

    // 解析技术列表
    const technologies = parseTechnologies(data);

    // 应用过滤器
    const filteredTechnologies = applyTechnologyFilters(technologies, {
      category,
      language,
      includeBeta,
      limit,
    });

    // 格式化输出
    const result = formatTechnologiesList(filteredTechnologies);

    // Cache the result
    technologiesCache.set(cacheKey, result);

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error: Failed to list technologies: ${errorMessage}`;
  }
}

/**
 * 解析技术数据
 */
function parseTechnologies(data: TechnologiesData): TechnologyGroup[] {
  const groups: TechnologyGroup[] = [];

  if (data.sections) {
    data.sections.forEach(section => {
      if (section.kind === 'technologies' && section.groups) {
        section.groups.forEach(group => {
          if (group.technologies && Array.isArray(group.technologies)) {
            const technologies: Technology[] = group.technologies.map(tech => ({
              title: tech.title || '',
              identifier: tech.destination?.identifier || tech.identifier || '',
              tags: tech.tags || [],
              languages: tech.languages || [],
              url: tech.destination?.identifier
                ? tech.destination.identifier.replace('doc://com.apple.documentation/documentation/', 'https://developer.apple.com/documentation/')
                : undefined,
            }));

            groups.push({
              name: group.name,
              technologies,
            });
          }
        });
      }
    });
  }

  return groups;
}

/**
 * 应用过滤器
 */
function applyTechnologyFilters(
  groups: TechnologyGroup[],
  filters: {
    category?: string;
    language?: string;
    includeBeta?: boolean;
    limit?: number;
  },
): TechnologyGroup[] {
  let filteredGroups = groups
    .map(group => {
      // 分类过滤
      if (filters.category && !group.name.toLowerCase().includes(filters.category.toLowerCase())) {
        return null;
      }

      // 技术过滤
      const filteredTechnologies = group.technologies.filter(tech => {
        // Beta 过滤
        if (!filters.includeBeta && tech.tags.includes('Beta')) {
          return false;
        }

        // 语言过滤
        if (filters.language && !tech.languages.includes(filters.language)) {
          return false;
        }

        return true;
      });

      return filteredTechnologies.length > 0
        ? { ...group, technologies: filteredTechnologies }
        : null;
    })
    .filter((group): group is TechnologyGroup => group !== null);

  // 应用 limit 限制
  if (filters.limit !== undefined && filters.limit >= 0) {
    if (filters.limit === 0) {
      // 如果 limit 为 0，返回空数组
      return [];
    }

    let totalCount = 0;
    filteredGroups = filteredGroups.map(group => {
      const availableSlots = filters.limit! - totalCount;
      if (availableSlots <= 0) {
        return null;
      }

      const limitedTechnologies = group.technologies.slice(0, availableSlots);
      totalCount += limitedTechnologies.length;

      return {
        ...group,
        technologies: limitedTechnologies,
      };
    }).filter((group): group is TechnologyGroup => group !== null && group.technologies.length > 0);
  }

  return filteredGroups;
}

/**
 * 格式化技术列表
 */
function formatTechnologiesList(groups: TechnologyGroup[]): string {
  if (groups.length === 0) {
    return 'No technologies found matching the specified criteria.';
  }

  let content = '# Apple Developer Technologies\n\n';

  // 统计信息
  const totalTechs = groups.reduce((sum, group) => sum + group.technologies.length, 0);
  const betaTechs = groups.reduce((sum, group) =>
    sum + group.technologies.filter(tech => tech.tags.includes('Beta')).length, 0);

  content += `*Found ${totalTechs} technologies`;
  if (betaTechs > 0) {
    content += ` (${betaTechs} in beta)`;
  }
  content += '*\n\n';

  // 按分类显示
  groups.forEach(group => {
    content += `## ${group.name}\n\n`;

    group.technologies.forEach(tech => {
      // Create title with status information
      const isBeta = tech.tags.includes('Beta');
      const titleWithStatus = isBeta ? `${tech.title} (Beta)` : tech.title;

      content += `### [${titleWithStatus}](${tech.url || '#'})\n`;

      // Build metadata array
      const metadata = [];

      // Add languages
      if (tech.languages.length > 0) {
        metadata.push(`Languages: ${tech.languages.join(', ')}`);
      }

      // Add categories (excluding Beta since it's in title)
      const nonBetaTags = tech.tags.filter(tag => tag !== 'Beta');
      if (nonBetaTags.length > 0) {
        metadata.push(`Categories: ${nonBetaTags.join(', ')}`);
      }

      // Add metadata line if any
      if (metadata.length > 0) {
        content += `*${metadata.join(' | ')}*\n`;
      }

      content += '\n';
    });
  });

  content += '\n---\n\n[View all technologies on Apple Developer](https://developer.apple.com/documentation/technologies)';

  return content;
}