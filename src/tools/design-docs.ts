import type {
  CallToolResult,
  ContentBlock,
  ImageContent,
  ListResourcesResult,
  ReadResourceResult,
  Resource,
  ResourceLink,
} from '@modelcontextprotocol/sdk/types.js';
import * as cheerio from 'cheerio';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, type Dirent } from 'node:fs';
import { mkdir, open, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { designContentCache, designResourcesCache } from '../utils/cache.js';
import { APPLE_URLS, REQUEST_CONFIG } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';
import { convertToDesignJsonApiUrl } from '../utils/url-converter.js';

const APPLE_DESIGN_DOWNLOAD_HOSTS = new Set([
  'developer.apple.com',
  'docs-assets.developer.apple.com',
  'devimages-cdn.apple.com',
  'itunespartner.apple.com',
]);
const DEFAULT_DOWNLOAD_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_DOWNLOAD_CACHE_MAX_BYTES = 1024 * 1024 * 1024;
const DEFAULT_PREVIEW_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_INLINE_DOWNLOAD_IMAGE_MAX_BYTES = DEFAULT_PREVIEW_IMAGE_MAX_BYTES;
const DEFAULT_DESIGN_CONTENT_MAX_BYTES = 20 * 1024 * 1024;
const MAX_APPLE_DESIGN_REDIRECTS = 5;
const DIRECT_RESOURCE_EXTENSIONS = new Set([
  '.dmg',
  '.fig',
  '.gif',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.sketch',
  '.svg',
  '.webp',
  '.zip',
]);
const IMAGE_MIME_PREFIX = 'image/';
const RESOURCE_URI_PREFIX = 'apple-design://cache/';

export interface DesignResourceCatalogEntry {
  resourceId: string;
  category: string;
  platform?: string;
  title: string;
  downloadLabel: string;
  downloadUrl: string;
  format: string;
  note?: string;
  previewImageUrl?: string;
  relatedGuidelineLinks: string[];
}

interface CachedDesignResource {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
  filePath: string;
  sourceUrl: string;
  size: number;
}

interface DesignSearchResult {
  title: string;
  type: 'hig' | 'resource' | 'page';
  url: string;
  description?: string;
  resourceId?: string;
  platform?: string;
  format?: string;
  previewImageUrl?: string;
}

interface DesignImageCandidate {
  url: string;
  alt?: string;
  strict?: boolean;
}

interface InFlightDesignDownload {
  byteLimit: number;
  promise: Promise<CachedDesignResource>;
}

type AppleDesignUrlValidator = (url: string, description: string) => void;

export interface SearchAppleDesignDocsArgs {
  query: string;
  contentType?: 'all' | 'hig' | 'resource' | 'page';
  platform?: string;
  limit?: number;
}

export interface ListAppleDesignResourcesArgs {
  category?: string;
  platform?: string;
  format?: string;
  searchQuery?: string;
  limit?: number;
}

export interface DownloadAppleDesignResourceArgs {
  resourceId?: string;
  url?: string;
  maxBytes?: number;
}

export interface GetAppleDesignExamplesArgs {
  url?: string;
  resourceId?: string;
  query?: string;
  limit?: number;
}

const cachedResourcesByUri = new Map<string, CachedDesignResource>();
const cachedResourcesBySourceUrl = new Map<string, CachedDesignResource>();
const inFlightDownloadsBySourceUrl = new Map<string, InFlightDesignDownload>();
const resourceCatalogById = new Map<string, DesignResourceCatalogEntry>();
let defaultDesignCacheDirectory: string | undefined;
let designCacheWriteQueue: Promise<void> = Promise.resolve();

/**
 * Format Apple Design HIG JSON as readable Markdown.
 * @param jsonData Apple Design JSON payload.
 * @param originalUrl Source Apple Design URL.
 * @returns Markdown content.
 */
export function formatAppleDesignDocument(jsonData: unknown, originalUrl: string): string {
  const documentRecord = asRecord(jsonData);
  if (!documentRecord) {
    return `# Apple Design\n\nUnable to parse Apple Design content.\n\n---\n\n[View on Apple Developer](${originalUrl})`;
  }

  const references = getRecordMap(documentRecord.references);
  const metadata = asRecord(documentRecord.metadata);
  const title = getString(metadata, 'title') ?? getString(documentRecord, 'title') ?? 'Apple Design';
  let content = `# ${title}\n\n`;

  const abstractText = renderInlineCollection(
    getArray(documentRecord.abstract).length > 0
      ? getArray(documentRecord.abstract)
      : getArray(metadata?.abstract),
    references,
    originalUrl,
  );
  if (abstractText) {
    content += `${abstractText}\n\n`;
  }

  const supportedPlatforms = getSupportedPlatforms(documentRecord);
  if (supportedPlatforms.length > 0) {
    content += '## Supported Platforms\n\n';
    content += `${supportedPlatforms.map(platform => `- ${platform}`).join('\n')}\n\n`;
  }

  const alertText = getCustomMetadataString(documentRecord, 'alert-text');
  const alertDate = getCustomMetadataString(documentRecord, 'alert-date');
  if (alertText) {
    content += '## Alert\n\n';
    if (alertDate) {
      content += `**${alertDate}**: `;
    }
    content += `${alertText}\n\n`;
  }

  const primarySections = getRecordArray(documentRecord.primaryContentSections);
  for (const section of primarySections) {
    content += formatDesignContentSection(section, references, originalUrl, 2);
  }

  const topicSections = getRecordArray(documentRecord.topicSections);
  if (topicSections.length > 0) {
    content += formatTopicSections(topicSections, references, originalUrl);
  }

  const secondarySections = getRecordArray(documentRecord.sections);
  for (const section of secondarySections) {
    content += formatSecondarySection(section, references, originalUrl);
  }

  content += `---\n\n[View on Apple Developer](${originalUrl})`;
  return content;
}

/**
 * Parse static Apple Design HTML pages as Markdown.
 * @param html Apple Design HTML.
 * @param sourceUrl Source URL.
 * @returns Markdown content.
 */
export function parseAppleDesignHtmlPage(html: string, sourceUrl: string): string {
  const $ = cheerio.load(html);
  const mainElement = $('main').first();
  const rootElement = mainElement.length > 0 ? mainElement : $('body').first();
  const title = normalizeWhitespace(rootElement.find('h1').first().text())
    || normalizeWhitespace($('title').first().text())
    || 'Apple Design';
  let content = `# ${title}\n\n`;

  rootElement.find('p').each((_index, element) => {
    const paragraph = normalizeWhitespace($(element).text());
    if (paragraph) {
      content += `${paragraph}\n\n`;
    }
  });

  const links = new Map<string, { title: string; description?: string }>();
  rootElement.find('a[href]').each((_index, element) => {
    const linkElement = $(element);
    const href = linkElement.attr('href');
    const normalizedUrl = normalizeUrl(href, sourceUrl);
    if (!normalizedUrl) {
      return;
    }

    const parsedUrl = safeUrl(normalizedUrl);
    if (!parsedUrl || parsedUrl.hostname !== 'developer.apple.com' || !parsedUrl.pathname.startsWith('/design/')) {
      return;
    }

    const linkTitle = normalizeWhitespace(
      linkElement.find('h2, h3, h4, h5').first().text(),
    ) || normalizeWhitespace(linkElement.text());
    if (!linkTitle) {
      return;
    }

    const description = normalizeWhitespace(linkElement.find('p').first().text());
    links.set(normalizedUrl, {
      title: linkTitle,
      description: description || undefined,
    });
  });

  if (links.size > 0) {
    content += '## Links\n\n';
    for (const [url, link] of links.entries()) {
      content += `- [${link.title}](${url})`;
      if (link.description) {
        content += `: ${link.description}`;
      }
      content += '\n';
    }
    content += '\n';
  }

  content += `---\n\n[View on Apple Developer](${sourceUrl})`;
  return content;
}

/**
 * Parse Apple Design Resources HTML into catalog entries.
 * @param html Apple Design Resources HTML.
 * @param sourceUrl Source URL.
 * @returns Resource catalog entries.
 */
export function parseDesignResourcesHtml(
  html: string,
  sourceUrl: string,
): DesignResourceCatalogEntry[] {
  const $ = cheerio.load(html);
  const entries: DesignResourceCatalogEntry[] = [];
  const seenResourceIds = new Map<string, number>();
  const sections = $('section.section-download');
  const sectionElements = sections.length > 0 ? sections : $('section');

  sectionElements.each((_sectionIndex, sectionElement) => {
    const section = $(sectionElement);
    const category = normalizeWhitespace(section.find('h2').first().text()) || 'Design Resources';
    let currentPlatform = '';

    section.children().each((_childIndex, childElement) => {
      const child = $(childElement);
      if (child.is('h3, h4')) {
        currentPlatform = normalizeWhitespace(child.text());
      }

      const itemElements = child.hasClass('grid-item') ? child : child.find('.grid-item');
      itemElements.each((_itemIndex, itemElement) => {
        const item = $(itemElement);
        const platform = currentPlatform || findNearestHeadingText($, item);
        const itemEntries = parseDesignResourceItem(
          $,
          item,
          category,
          platform,
          sourceUrl,
          seenResourceIds,
        );
        entries.push(...itemEntries);
      });
    });
  });

  return entries;
}

/**
 * Search Apple Design, HIG, and Design Resources content.
 * @param args Search arguments.
 * @returns MCP tool result.
 */
export async function handleSearchAppleDesignDocs(
  args: SearchAppleDesignDocsArgs,
): Promise<CallToolResult> {
  const query = args.query.trim();
  const contentType = args.contentType ?? 'all';
  const platform = args.platform ?? 'all';
  const limit = args.limit ?? 20;

  const results = await collectDesignSearchResults(query, contentType, platform, limit);
  return {
    content: [
      createTextContent(formatDesignSearchResults(results, query)),
    ],
  };
}

/**
 * Read an Apple Design URL.
 * @param args Content arguments.
 * @returns MCP tool result.
 */
export async function handleGetAppleDesignContent(
  args: { url: string } | string,
): Promise<CallToolResult> {
  const url = typeof args === 'string' ? args : args.url;
  validateAppleDesignContentUrl(url);
  const content = await fetchAppleDesignContent(url);
  return {
    content: [
      createTextContent(content),
    ],
  };
}

/**
 * List Apple Design Resources catalog entries.
 * @param args List arguments.
 * @returns MCP tool result.
 */
export async function handleListAppleDesignResources(
  args: ListAppleDesignResourcesArgs = {},
): Promise<CallToolResult> {
  const resources = await getDesignResourcesCatalog();
  const filteredResources = filterDesignResources(resources, args);
  const limitedResources = filteredResources.slice(0, args.limit ?? 50);

  return {
    content: [
      createTextContent(formatDesignResources(limitedResources)),
    ],
  };
}

/**
 * Download a direct Apple Design resource into the local MCP cache.
 * @param args Download arguments.
 * @returns MCP tool result.
 */
export async function handleDownloadAppleDesignResource(
  args: DownloadAppleDesignResourceArgs,
): Promise<CallToolResult> {
  const resource = await resolveDownloadResource(args);
  if (!resource.downloadUrl) {
    throw new Error('A resourceId or direct URL is required.');
  }

  if (!isDirectAppleDownloadUrl(resource.downloadUrl)) {
    if (!args.resourceId) {
      validateDownloadUrl(resource.downloadUrl);
    }

    return {
      content: [
        createTextContent(formatNonDownloadableResource(resource)),
      ],
    };
  }

  validateDownloadUrl(resource.downloadUrl);
  const cachedResource = await downloadDesignResource(resource, args.maxBytes);
  return {
    content: await createDownloadedResourceContent(cachedResource),
  };
}

/**
 * Return visual examples as MCP image content blocks.
 * @param args Example lookup arguments.
 * @returns MCP tool result.
 */
export async function handleGetAppleDesignExamples(
  args: GetAppleDesignExamplesArgs = {},
): Promise<CallToolResult> {
  const limit = args.limit ?? 3;
  const candidates = await collectImageCandidates(args);
  const uniqueCandidates = dedupeImageCandidates(candidates);
  const imageContentBlocks: ContentBlock[] = [];

  for (const candidate of uniqueCandidates) {
    if (imageContentBlocks.length >= limit) {
      break;
    }

    let imageContent: ImageContent | null;
    try {
      imageContent = await fetchImageContent(candidate.url);
    } catch (error) {
      if (candidate.strict) {
        throw error;
      }
      continue;
    }

    if (imageContent) {
      imageContentBlocks.push(imageContent);
    }
  }

  if (imageContentBlocks.length === 0) {
    return {
      content: [
        createTextContent('Apple Design Examples\n\nNo directly fetchable image examples were found.'),
      ],
    };
  }

  return {
    content: [
      createTextContent(`Apple Design Examples\n\nFound ${imageContentBlocks.length} image example${imageContentBlocks.length === 1 ? '' : 's'}.`),
      ...imageContentBlocks,
    ],
  };
}

/**
 * List cached downloaded resources for MCP resources/list.
 * @returns MCP resources/list result.
 */
export async function listCachedDesignResources(): Promise<ListResourcesResult> {
  const resources: Resource[] = [];
  for (const cachedResource of cachedResourcesByUri.values()) {
    resources.push({
      uri: cachedResource.uri,
      name: cachedResource.name,
      title: cachedResource.title,
      description: cachedResource.description,
      mimeType: cachedResource.mimeType,
    });
  }

  return { resources };
}

/**
 * Read cached downloaded resources for MCP resources/read.
 * @param uri Resource URI.
 * @returns MCP resources/read result.
 */
export async function readCachedDesignResource(uri: string): Promise<ReadResourceResult> {
  const cachedResource = await getCachedResourceForRead(uri);
  const data = await readFile(cachedResource.filePath);
  return {
    contents: [
      {
        uri: cachedResource.uri,
        mimeType: cachedResource.mimeType,
        blob: data.toString('base64'),
      },
    ],
  };
}

async function getCachedResourceForRead(uri: string): Promise<CachedDesignResource> {
  const cachedResource = cachedResourcesByUri.get(uri);
  if (cachedResource) {
    return cachedResource;
  }

  const persistedResource = await resolvePersistedCachedResource(uri);
  if (persistedResource) {
    cachedResourcesByUri.set(uri, persistedResource);
    return persistedResource;
  }

  throw new Error(`Unknown Apple Design resource URI: ${uri}`);
}

async function resolvePersistedCachedResource(uri: string): Promise<CachedDesignResource | undefined> {
  const parsedUri = parseCachedResourceUri(uri);
  if (!parsedUri) {
    return undefined;
  }

  const cacheDirectory = path.resolve(getDesignCacheDirectory());
  const filePath = path.resolve(cacheDirectory, parsedUri.cacheFilename);
  const relativePath = path.relative(cacheDirectory, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined;
  }

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return undefined;
    }
    throw error;
  }

  if (!fileStats.isFile()) {
    return undefined;
  }

  const name = getNameFromCacheFilename(parsedUri.hash, parsedUri.cacheFilename);
  return {
    uri,
    name,
    title: name,
    description: 'Persisted Apple Design resource',
    mimeType: detectMimeType(undefined, parsedUri.cacheFilename),
    filePath,
    sourceUrl: '',
    size: fileStats.size,
  };
}

function parseCachedResourceUri(uri: string): { hash: string; cacheFilename: string } | undefined {
  if (!uri.startsWith(RESOURCE_URI_PREFIX)) {
    return undefined;
  }

  const suffix = uri.slice(RESOURCE_URI_PREFIX.length);
  const parts = suffix.split('/');
  if (parts.length !== 2) {
    return undefined;
  }

  const [hash, cacheFilename] = parts;
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
    return undefined;
  }

  if (
    !cacheFilename
    || cacheFilename.includes('\\')
    || cacheFilename.includes('\0')
    || cacheFilename === '.'
    || cacheFilename === '..'
    || cacheFilename !== path.basename(cacheFilename)
    || !cacheFilename.startsWith(`${hash}-`)
  ) {
    return undefined;
  }

  return {
    hash,
    cacheFilename,
  };
}

function getNameFromCacheFilename(hash: string, cacheFilename: string): string {
  const filenameWithUuid = cacheFilename.slice(`${hash}-`.length);
  if (filenameWithUuid.length > 37 && filenameWithUuid[36] === '-') {
    return filenameWithUuid.slice(37);
  }

  return cacheFilename;
}

async function cancelResponseBody(response: Response): Promise<void> {
  if (!response.body) {
    return;
  }

  await response.body.cancel().catch(() => undefined);
}

/**
 * Clear process-local Design download state for tests.
 * @returns Nothing.
 */
export function clearDesignResourceCacheForTesting(): void {
  designContentCache.clear();
  designResourcesCache.clear();
  cachedResourcesByUri.clear();
  cachedResourcesBySourceUrl.clear();
  inFlightDownloadsBySourceUrl.clear();
  resourceCatalogById.clear();
  designCacheWriteQueue = Promise.resolve();
}

async function fetchAppleDesignContent(url: string): Promise<string> {
  const cacheKey = `design-content:${url}`;
  const cachedContent = designContentCache.get<string>(cacheKey);
  if (cachedContent) {
    return cachedContent;
  }

  const jsonUrl = convertToDesignJsonApiUrl(url);
  let content: string;
  if (jsonUrl) {
    const jsonData = await fetchAppleDesignJson(jsonUrl);
    content = formatAppleDesignDocument(jsonData, url);
  } else {
    const { html, finalUrl } = await fetchAppleDesignHtml(url);
    if (isDesignResourcesUrl(finalUrl)) {
      const resources = parseDesignResourcesHtml(html, finalUrl);
      updateResourceCatalogIndex(resources);
      content = `${parseAppleDesignHtmlPage(html, finalUrl)}\n\n${formatDesignResources(resources)}`;
    } else {
      content = parseAppleDesignHtmlPage(html, finalUrl);
    }
  }

  designContentCache.set(cacheKey, content);
  return content;
}

async function getDesignResourcesCatalog(): Promise<DesignResourceCatalogEntry[]> {
  const cachedResources = designResourcesCache.get<DesignResourceCatalogEntry[]>('design-resources');
  if (cachedResources) {
    updateResourceCatalogIndex(cachedResources);
    return cachedResources;
  }

  const { html, finalUrl } = await fetchAppleDesignHtml(APPLE_URLS.DESIGN_RESOURCES);
  const resources = parseDesignResourcesHtml(html, finalUrl);
  updateResourceCatalogIndex(resources);
  designResourcesCache.set('design-resources', resources);
  return resources;
}

async function collectDesignSearchResults(
  query: string,
  contentType: 'all' | 'hig' | 'resource' | 'page',
  platform: string,
  limit: number,
): Promise<DesignSearchResult[]> {
  const normalizedQuery = query.toLowerCase();
  const results: DesignSearchResult[] = [];

  if (contentType === 'all' || contentType === 'hig') {
    const higResults = await collectHigSearchResults(normalizedQuery, platform);
    results.push(...higResults);
  }

  if (contentType === 'all' || contentType === 'resource') {
    const resources = await getDesignResourcesCatalog();
    for (const resource of resources) {
      if (!resourceMatchesPlatform(resource, platform)) {
        continue;
      }
      const searchableText = [
        resource.title,
        resource.category,
        resource.platform,
        resource.downloadLabel,
        resource.format,
        resource.note,
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchableText.includes(normalizedQuery)) {
        continue;
      }

      results.push({
        title: resource.title,
        type: 'resource',
        url: resource.downloadUrl,
        description: resource.note,
        resourceId: resource.resourceId,
        platform: resource.platform,
        format: resource.format,
        previewImageUrl: resource.previewImageUrl,
      });
    }
  }

  if (contentType === 'all' || contentType === 'page') {
    const pageResults = getStaticDesignPageResults(normalizedQuery);
    results.push(...pageResults);
  }

  return results.slice(0, limit);
}

async function collectHigSearchResults(query: string, platform: string): Promise<DesignSearchResult[]> {
  try {
    const rootJson = await fetchAppleDesignJson(APPLE_URLS.DESIGN_HIG_JSON);
    const documentRecord = asRecord(rootJson);
    if (!documentRecord) {
      return [];
    }

    const references = getRecordMap(documentRecord.references);
    const results: DesignSearchResult[] = [];
    const metadata = asRecord(documentRecord.metadata);
    const rootTitle = getString(metadata, 'title') ?? 'Human Interface Guidelines';
    const rootAbstract = renderInlineCollection(getArray(documentRecord.abstract), references, APPLE_URLS.DESIGN);
    if (
      `${rootTitle} ${rootAbstract}`.toLowerCase().includes(query)
      && designRecordMatchesPlatform(documentRecord, platform, `${rootTitle} ${rootAbstract}`)
    ) {
      results.push({
        title: rootTitle,
        type: 'hig',
        url: 'https://developer.apple.com/design/human-interface-guidelines',
        description: rootAbstract,
      });
    }

    for (const reference of references.values()) {
      const title = getString(reference, 'title');
      const url = normalizeReferenceUrl(reference, APPLE_URLS.DESIGN);
      if (!title || !url || !url.includes('/design/human-interface-guidelines')) {
        continue;
      }

      const description = renderInlineCollection(getArray(reference.abstract), references, APPLE_URLS.DESIGN);
      if (
        `${title} ${description}`.toLowerCase().includes(query)
        && designRecordMatchesPlatform(reference, platform, `${title} ${description}`)
      ) {
        results.push({
          title,
          type: 'hig',
          url,
          description,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

function getStaticDesignPageResults(query: string): DesignSearchResult[] {
  const pages: DesignSearchResult[] = [
    {
      title: 'Apple Design',
      type: 'page',
      url: APPLE_URLS.DESIGN,
      description: 'Apple Design guidance, videos, resources, and Human Interface Guidelines.',
    },
    {
      title: 'Design Resources',
      type: 'page',
      url: APPLE_URLS.DESIGN_RESOURCES,
      description: 'Templates, product bezels, fonts, tools, and downloadable resources.',
    },
    {
      title: 'What is new in Apple Design',
      type: 'page',
      url: 'https://developer.apple.com/design/whats-new/',
      description: 'Recent Apple Design updates and platform guidance.',
    },
    {
      title: 'Get started with Apple Design',
      type: 'page',
      url: 'https://developer.apple.com/design/get-started/',
      description: 'Introductory Apple Design guidance.',
    },
  ];

  return pages.filter(page => {
    const searchableText = `${page.title} ${page.description ?? ''}`.toLowerCase();
    return searchableText.includes(query);
  });
}

function formatDesignSearchResults(results: DesignSearchResult[], query: string): string {
  let content = `# Apple Design Search Results\n\nQuery: "${query}"\n\n`;
  if (results.length === 0) {
    return `${content}No Apple Design results found.`;
  }

  results.forEach((result, index) => {
    content += `## ${index + 1}. ${result.title}\n\n`;
    content += `- Type: ${result.type}\n`;
    content += `- URL: ${result.url}\n`;
    if (result.resourceId) {
      content += `- Resource ID: ${result.resourceId}\n`;
    }
    if (result.platform) {
      content += `- Platform: ${result.platform}\n`;
    }
    if (result.format) {
      content += `- Format: ${result.format}\n`;
    }
    if (result.previewImageUrl) {
      content += `- Preview: ${result.previewImageUrl}\n`;
    }
    if (result.description) {
      content += `\n${result.description}\n`;
    }
    content += '\n';
  });

  return content.trimEnd();
}

function filterDesignResources(
  resources: DesignResourceCatalogEntry[],
  args: ListAppleDesignResourcesArgs,
): DesignResourceCatalogEntry[] {
  return resources.filter(resource => {
    if (args.category && !containsText(resource.category, args.category)) {
      return false;
    }
    if (args.platform && !containsText(resource.platform, args.platform)) {
      return false;
    }
    if (args.format && !containsText(resource.format, args.format)) {
      return false;
    }
    if (args.searchQuery) {
      const searchableText = [
        resource.title,
        resource.category,
        resource.platform,
        resource.downloadLabel,
        resource.format,
        resource.note,
      ].filter(Boolean).join(' ');
      if (!containsText(searchableText, args.searchQuery)) {
        return false;
      }
    }
    return true;
  });
}

function formatDesignResources(resources: DesignResourceCatalogEntry[]): string {
  let content = '# Apple Design Resources\n\n';
  if (resources.length === 0) {
    return `${content}No matching Design Resources found.`;
  }

  for (const resource of resources) {
    content += `## ${resource.title}\n\n`;
    content += `- Resource ID: ${resource.resourceId}\n`;
    content += `- Category: ${resource.category}\n`;
    if (resource.platform) {
      content += `- Platform: ${resource.platform}\n`;
    }
    content += `- Format: ${resource.format}\n`;
    content += `- Download Label: ${resource.downloadLabel}\n`;
    content += `- Download URL: ${resource.downloadUrl}\n`;
    if (resource.previewImageUrl) {
      content += `- Preview Image URL: ${resource.previewImageUrl}\n`;
    }
    if (resource.note) {
      content += `- Notes: ${resource.note}\n`;
    }
    if (resource.relatedGuidelineLinks.length > 0) {
      content += `- Related HIG Links: ${resource.relatedGuidelineLinks.join(', ')}\n`;
    }
    content += '\n';
  }

  return content.trimEnd();
}

async function resolveDownloadResource(
  args: DownloadAppleDesignResourceArgs,
): Promise<DesignResourceCatalogEntry> {
  if (args.resourceId) {
    if (!resourceCatalogById.has(args.resourceId)) {
      await getDesignResourcesCatalog();
    }

    const resource = resourceCatalogById.get(args.resourceId);
    if (!resource) {
      throw new Error(`Unknown Apple Design resourceId: ${args.resourceId}`);
    }
    return resource;
  }

  if (!args.url) {
    throw new Error('A resourceId or direct URL is required.');
  }

  return {
    resourceId: `direct:${hashString(args.url).slice(0, 12)}`,
    category: 'Direct URL',
    title: getFilenameFromUrl(args.url),
    downloadLabel: 'Download',
    downloadUrl: args.url,
    format: inferFormat(args.url, 'Download'),
    relatedGuidelineLinks: [],
  };
}

async function downloadDesignResource(
  resource: DesignResourceCatalogEntry,
  maxBytes: number | undefined,
): Promise<CachedDesignResource> {
  const normalizedSourceUrl = resource.downloadUrl;
  const byteLimit = maxBytes ?? DEFAULT_DOWNLOAD_MAX_BYTES;
  const cachedResource = cachedResourcesBySourceUrl.get(normalizedSourceUrl);
  if (cachedResource) {
    if (cachedResource.size > byteLimit) {
      throw new Error(`Apple Design resource exceeds the ${byteLimit} byte download limit.`);
    }
    return cachedResource;
  }

  const inFlightDownload = inFlightDownloadsBySourceUrl.get(normalizedSourceUrl);
  if (inFlightDownload && inFlightDownload.byteLimit >= byteLimit) {
    const downloadedResource = await inFlightDownload.promise;
    if (downloadedResource.size > byteLimit) {
      throw new Error(`Apple Design resource exceeds the ${byteLimit} byte download limit.`);
    }
    return downloadedResource;
  }

  const downloadPromise = downloadDesignResourceToCache(resource, byteLimit, normalizedSourceUrl);
  inFlightDownloadsBySourceUrl.set(normalizedSourceUrl, {
    byteLimit,
    promise: downloadPromise,
  });

  try {
    return await downloadPromise;
  } finally {
    if (inFlightDownloadsBySourceUrl.get(normalizedSourceUrl)?.promise === downloadPromise) {
      inFlightDownloadsBySourceUrl.delete(normalizedSourceUrl);
    }
  }
}

async function downloadDesignResourceToCache(
  resource: DesignResourceCatalogEntry,
  byteLimit: number,
  normalizedSourceUrl: string,
): Promise<CachedDesignResource> {
  const {
    response,
    finalUrl,
  } = await fetchAppleDesignAssetResponse(normalizedSourceUrl, 'Apple Design resource', {
    headers: {
      Accept: '*/*',
    },
  });

  const data = await readLimitedResponseBytes(
    response,
    byteLimit,
    'Apple Design resource',
  );

  const mimeType = detectMimeType(response.headers.get('content-type'), finalUrl);
  const hash = hashBuffer(data);
  const filename = sanitizeFilename(getFilenameFromUrl(finalUrl));
  const cacheDirectory = getDesignCacheDirectory();
  const {
    cacheFilename,
    filePath,
  } = await withDesignCacheWriteLock(async () => {
    await mkdir(cacheDirectory, { recursive: true, mode: 0o700 });
    await assertDesignCacheCapacity(cacheDirectory, data.length);
    return await writeExclusiveDesignCacheFile(cacheDirectory, hash, filename, data);
  });

  const uri = `${RESOURCE_URI_PREFIX}${hash}/${cacheFilename}`;
  const newCachedResource: CachedDesignResource = {
    uri,
    name: filename,
    title: resource.title,
    description: `${resource.category}${resource.platform ? `, ${resource.platform}` : ''}`,
    mimeType,
    filePath,
    sourceUrl: normalizedSourceUrl,
    size: data.length,
  };

  cachedResourcesByUri.set(uri, newCachedResource);
  cachedResourcesBySourceUrl.set(normalizedSourceUrl, newCachedResource);
  return newCachedResource;
}

async function createDownloadedResourceContent(
  cachedResource: CachedDesignResource,
): Promise<ContentBlock[]> {
  const content: ContentBlock[] = [
    createTextContent(
      `Downloaded Apple Design resource: ${cachedResource.name}\n\n` +
      `- URI: ${cachedResource.uri}\n` +
      `- MIME Type: ${cachedResource.mimeType}\n` +
      `- Size: ${cachedResource.size} bytes`,
    ),
  ];

  if (
    isImageMimeType(cachedResource.mimeType)
    && cachedResource.size <= DEFAULT_INLINE_DOWNLOAD_IMAGE_MAX_BYTES
  ) {
    const data = await readFile(cachedResource.filePath);
    content.push({
      type: 'image',
      data: data.toString('base64'),
      mimeType: cachedResource.mimeType,
    });
  }

  content.push(createResourceLink(cachedResource));
  return content;
}

function formatNonDownloadableResource(resource: DesignResourceCatalogEntry): string {
  return (
    '# Apple Design Resource\n\n' +
    `${resource.title} is catalog metadata or an external design-tool link, so it was not downloaded.\n\n` +
    `- Resource ID: ${resource.resourceId}\n` +
    `- Format: ${resource.format}\n` +
    `- URL: ${resource.downloadUrl}`
  );
}

async function collectImageCandidates(args: GetAppleDesignExamplesArgs): Promise<DesignImageCandidate[]> {
  const candidates: DesignImageCandidate[] = [];

  if (args.resourceId) {
    if (!resourceCatalogById.has(args.resourceId)) {
      await getDesignResourcesCatalog();
    }
    const resource = resourceCatalogById.get(args.resourceId);
    if (!resource) {
      throw new Error(`Unknown Apple Design resourceId: ${args.resourceId}`);
    }

    if (resource.previewImageUrl) {
      candidates.push({
        url: resource.previewImageUrl,
        alt: resource.title,
      });
    }
  }

  if (args.query) {
    const resources = filterDesignResources(await getDesignResourcesCatalog(), {
      searchQuery: args.query,
      limit: args.limit,
    });
    const queryPreviewLimit = args.limit ?? 3;
    let queryPreviewCount = 0;
    for (const resource of resources) {
      if (resource.previewImageUrl) {
        candidates.push({
          url: resource.previewImageUrl,
          alt: resource.title,
        });
        queryPreviewCount++;
        if (queryPreviewCount >= queryPreviewLimit) {
          break;
        }
      }
    }
  }

  if (args.url) {
    const url = args.url;
    validateAppleDesignExampleUrl(url);
    if (isDirectAppleImageCandidateUrl(url)) {
      candidates.push({ url, strict: true });
    } else {
      const jsonUrl = convertToDesignJsonApiUrl(url);
      if (jsonUrl) {
        const jsonData = await fetchAppleDesignJson(jsonUrl);
        candidates.push(...extractImageCandidatesFromDesignDocument(jsonData, url));
      } else {
        const { html, finalUrl } = await fetchAppleDesignHtml(url);
        candidates.push(...extractImageCandidatesFromHtml(html, finalUrl));
      }
    }
  }

  return candidates;
}

async function fetchImageContent(url: string): Promise<ImageContent | null> {
  const parsedUrl = safeUrl(url);
  if (
    !parsedUrl
    || parsedUrl.protocol !== 'https:'
    || !APPLE_DESIGN_DOWNLOAD_HOSTS.has(parsedUrl.hostname)
  ) {
    return null;
  }

  const {
    response,
    finalUrl,
  } = await fetchAppleDesignAssetResponse(url, 'Apple Design image preview', {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  const mimeType = detectMimeType(response.headers.get('content-type'), finalUrl);
  if (!isImageMimeType(mimeType)) {
    return null;
  }

  const data = await readLimitedResponseBytes(
    response,
    DEFAULT_PREVIEW_IMAGE_MAX_BYTES,
    'Apple Design image preview',
  );
  return {
    type: 'image',
    data: data.toString('base64'),
    mimeType,
  };
}

function extractImageCandidatesFromDesignDocument(
  jsonData: unknown,
  sourceUrl: string,
): DesignImageCandidate[] {
  const documentRecord = asRecord(jsonData);
  if (!documentRecord) {
    return [];
  }

  const references = getRecordMap(documentRecord.references);
  const candidates: DesignImageCandidate[] = [];
  for (const reference of references.values()) {
    if (getString(reference, 'type') !== 'image') {
      continue;
    }
    const imageUrl = getImageUrlFromReference(reference, sourceUrl);
    if (imageUrl) {
      candidates.push({
        url: imageUrl,
        alt: getString(reference, 'alt') ?? getString(reference, 'title'),
      });
    }
  }

  collectImageCandidatesFromContent(getArray(documentRecord.primaryContentSections), references, sourceUrl, candidates);
  collectImageCandidatesFromContent(getArray(documentRecord.sections), references, sourceUrl, candidates);
  return candidates;
}

function collectImageCandidatesFromContent(
  nodes: unknown[],
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
  candidates: DesignImageCandidate[],
): void {
  for (const node of nodes) {
    const record = asRecord(node);
    if (!record) {
      continue;
    }

    const type = getString(record, 'type');
    if (type === 'image' || type === 'icon') {
      const imageUrl = resolveImageBlockUrl(record, references, sourceUrl);
      if (imageUrl) {
        candidates.push({
          url: imageUrl,
          alt: getString(record, 'alt') ?? getString(record, 'title'),
        });
      }
    }

    for (const nestedKey of ['content', 'items', 'rows', 'cells', 'inlineContent', 'tabs']) {
      collectImageCandidatesFromContent(getArray(record[nestedKey]), references, sourceUrl, candidates);
    }
  }
}

function extractImageCandidatesFromHtml(html: string, sourceUrl: string): DesignImageCandidate[] {
  const $ = cheerio.load(html);
  const candidates: DesignImageCandidate[] = [];
  $('main img, body img').each((_index, element) => {
    const image = $(element);
    const imageUrl = normalizeUrl(image.attr('src') ?? image.attr('data-src'), sourceUrl);
    if (!imageUrl) {
      return;
    }
    candidates.push({
      url: imageUrl,
      alt: image.attr('alt') ?? undefined,
    });
  });
  return candidates;
}

function dedupeImageCandidates(candidates: DesignImageCandidate[]): DesignImageCandidate[] {
  const seenUrls = new Set<string>();
  const dedupedCandidates: DesignImageCandidate[] = [];
  for (const candidate of candidates) {
    if (seenUrls.has(candidate.url)) {
      continue;
    }
    seenUrls.add(candidate.url);
    dedupedCandidates.push(candidate);
  }
  return dedupedCandidates;
}

function parseDesignResourceItem(
  $: cheerio.CheerioAPI,
  item: cheerio.Cheerio<any>,
  category: string,
  platform: string | undefined,
  sourceUrl: string,
  seenResourceIds: Map<string, number>,
): DesignResourceCatalogEntry[] {
  const title = normalizeWhitespace(item.find('h5, h4, h3').first().text()) || category;
  const previewImageUrl = normalizeUrl(
    item.find('img.download-image, img').first().attr('src'),
    sourceUrl,
  );
  const noteParts = item.find('.download-text-description').map((_index, element) => {
    return normalizeWhitespace($(element).text());
  }).get().filter(Boolean);
  const note = noteParts.join(' ') || undefined;
  const relatedGuidelineLinks = item.find('a[href*="/design/human-interface-guidelines"]').map((_index, element) => {
    return normalizeUrl($(element).attr('href'), sourceUrl);
  }).get().filter((link): link is string => Boolean(link));
  const links = item.find('a[href]');
  const entries: DesignResourceCatalogEntry[] = [];
  const seenLinks = new Set<string>();

  links.each((_index, element) => {
    const link = $(element);
    const href = link.attr('href');
    const label = normalizeWhitespace(link.text()) || 'Download';
    if (!href || !isResourceCatalogLink(link, href, label)) {
      return;
    }

    const downloadUrl = normalizeUrl(href, sourceUrl);
    if (!downloadUrl) {
      return;
    }

    const linkKey = `${label}:${downloadUrl}`;
    if (seenLinks.has(linkKey)) {
      return;
    }
    seenLinks.add(linkKey);

    const format = inferFormat(downloadUrl, label);
    const resourceId = createResourceId(category, platform, title, label, downloadUrl, seenResourceIds);
    entries.push({
      resourceId,
      category,
      platform: platform || undefined,
      title,
      downloadLabel: label,
      downloadUrl,
      format,
      note,
      previewImageUrl,
      relatedGuidelineLinks: [...new Set(relatedGuidelineLinks)],
    });
  });

  return entries;
}

function formatDesignContentSection(
  section: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
  defaultHeadingLevel: number,
): string {
  let content = '';
  const title = getString(section, 'title');
  if (title) {
    content += `${'#'.repeat(defaultHeadingLevel)} ${title}\n\n`;
  }

  const blocks = getArray(section.content);
  for (const block of blocks) {
    content += formatDesignBlock(block, references, sourceUrl, defaultHeadingLevel);
  }

  return content;
}

function formatSecondarySection(
  section: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  const title = getString(section, 'title') ?? '';
  const kind = getString(section, 'kind') ?? '';
  const isChangeLog = `${title} ${kind}`.toLowerCase().includes('change');
  if (isChangeLog) {
    return formatChangeLogSection(section, references, sourceUrl);
  }

  return formatDesignContentSection(section, references, sourceUrl, 2);
}

function formatChangeLogSection(
  section: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  let content = '## Change Log\n\n';
  const items = getRecordArray(section.items);
  for (const item of items) {
    const date = getString(item, 'date') ?? getString(item, 'title');
    if (date) {
      content += `### ${date}\n\n`;
    }
    for (const block of getArray(item.content)) {
      content += formatDesignBlock(block, references, sourceUrl, 4);
    }
  }
  return content;
}

function formatTopicSections(
  topicSections: Record<string, unknown>[],
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  let content = '## Topics\n\n';
  for (const section of topicSections) {
    const title = getString(section, 'title');
    if (title) {
      content += `### ${title}\n\n`;
    }

    for (const identifier of getStringArray(section.identifiers)) {
      const reference = references.get(identifier);
      if (!reference) {
        continue;
      }
      const referenceTitle = getString(reference, 'title') ?? getIdentifierTitle(identifier);
      const referenceUrl = normalizeReferenceUrl(reference, sourceUrl);
      const abstractText = renderInlineCollection(getArray(reference.abstract), references, sourceUrl);
      if (referenceUrl) {
        content += `- [${referenceTitle}](${referenceUrl})`;
      } else {
        content += `- ${referenceTitle}`;
      }
      if (abstractText) {
        content += `: ${abstractText}`;
      }
      content += '\n';
    }
    content += '\n';
  }
  return content;
}

function formatDesignBlock(
  block: unknown,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
  headingLevel: number,
): string {
  const record = asRecord(block);
  if (!record) {
    return '';
  }

  const type = getString(record, 'type') ?? getString(record, 'kind');
  if (type === 'heading') {
    const rawLevel = getNumber(record, 'level') ?? headingLevel;
    const level = Math.min(Math.max(Math.trunc(rawLevel), 1), 6);
    const text = getString(record, 'text') ?? renderInlineCollection(getArray(record.inlineContent), references, sourceUrl);
    return text ? `${'#'.repeat(level)} ${text}\n\n` : '';
  }

  if (type === 'paragraph') {
    const text = renderInlineCollection(getArray(record.inlineContent), references, sourceUrl);
    return text ? `${text}\n\n` : '';
  }

  if (type === 'image' || type === 'icon') {
    const imageUrl = resolveImageBlockUrl(record, references, sourceUrl);
    if (!imageUrl) {
      return '';
    }
    const altText = resolveImageAltText(record, references) ?? 'Apple Design image';
    return `![${altText}](${imageUrl})\n\n`;
  }

  if (type === 'unorderedList' || type === 'orderedList') {
    return formatListBlock(record, references, sourceUrl, type === 'orderedList');
  }

  if (type === 'table') {
    return formatTableBlock(record, references, sourceUrl);
  }

  if (type === 'aside' || type === 'alert') {
    const blocks = getArray(record.content);
    const asideText = blocks.map(item => formatDesignBlock(item, references, sourceUrl, headingLevel + 1).trim())
      .filter(Boolean)
      .join('\n\n');
    return asideText ? `> ${asideText.replaceAll('\n', '\n> ')}\n\n` : '';
  }

  if (type === 'links' || type === 'linkGrid') {
    return formatLinksBlock(record, references, sourceUrl);
  }

  if (type === 'tabNavigator' || type === 'tabs') {
    return formatTabsBlock(record, references, sourceUrl, headingLevel);
  }

  if (type === 'reference') {
    const identifier = getString(record, 'identifier');
    if (!identifier) {
      return '';
    }
    const reference = references.get(identifier);
    const referenceTitle = reference ? getString(reference, 'title') : undefined;
    const referenceUrl = reference ? normalizeReferenceUrl(reference, sourceUrl) : undefined;
    if (referenceTitle && referenceUrl) {
      return `- [${referenceTitle}](${referenceUrl})\n\n`;
    }
  }

  const nestedContent = getArray(record.content);
  if (nestedContent.length > 0) {
    return nestedContent.map(item => formatDesignBlock(item, references, sourceUrl, headingLevel)).join('');
  }

  return renderInlineCollection(getArray(record.inlineContent), references, sourceUrl);
}

function formatListBlock(
  block: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
  ordered: boolean,
): string {
  let content = '';
  const items = getArray(block.items);
  items.forEach((item, index) => {
    const itemRecord = asRecord(item);
    if (!itemRecord) {
      return;
    }

    const itemContent = getArray(itemRecord.content)
      .map(contentBlock => formatDesignBlock(contentBlock, references, sourceUrl, 4).trim())
      .filter(Boolean)
      .join(' ');
    if (itemContent) {
      content += `${ordered ? `${index + 1}.` : '-'} ${itemContent}\n`;
    }
  });

  return content ? `${content}\n` : '';
}

function formatTableBlock(
  block: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  const headerCells = getArray(block.header).map(cell => renderTableCell(cell, references, sourceUrl));
  const rows = getRecordArray(block.rows);
  if (headerCells.length === 0 || rows.length === 0) {
    return '';
  }

  let content = `| ${headerCells.join(' | ')} |\n`;
  content += `| ${headerCells.map(() => '---').join(' | ')} |\n`;
  for (const row of rows) {
    const cells = getArray(row.cells).map(cell => renderTableCell(cell, references, sourceUrl));
    content += `| ${cells.join(' | ')} |\n`;
  }
  return `${content}\n`;
}

function formatLinksBlock(
  block: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  let content = '';
  for (const identifier of getStringArray(block.identifiers)) {
    const reference = references.get(identifier);
    if (!reference) {
      continue;
    }
    const title = getString(reference, 'title') ?? getIdentifierTitle(identifier);
    const url = normalizeReferenceUrl(reference, sourceUrl);
    if (url) {
      content += `- [${title}](${url})\n`;
    }
  }

  const links = getRecordArray(block.links);
  for (const link of links) {
    const title = getString(link, 'title') ?? renderInlineCollection(getArray(link.inlineContent), references, sourceUrl);
    const url = normalizeUrl(getString(link, 'url'), sourceUrl);
    if (title && url) {
      content += `- [${title}](${url})\n`;
    }
  }

  return content ? `${content}\n` : '';
}

function formatTabsBlock(
  block: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
  headingLevel: number,
): string {
  let content = '';
  const tabs = getRecordArray(block.tabs);
  for (const tab of tabs) {
    const title = getString(tab, 'title');
    if (title) {
      content += `${'#'.repeat(Math.min(headingLevel + 1, 6))} ${title}\n\n`;
    }
    for (const tabBlock of getArray(tab.content)) {
      content += formatDesignBlock(tabBlock, references, sourceUrl, headingLevel + 2);
    }
  }
  return content;
}

function renderTableCell(
  cell: unknown,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  const cellRecord = asRecord(cell);
  if (!cellRecord) {
    return '';
  }

  const inlineText = renderInlineCollection(getArray(cellRecord.inlineContent), references, sourceUrl);
  if (inlineText) {
    return inlineText.replaceAll('|', '\\|');
  }

  const blockText = getArray(cellRecord.content)
    .map(block => formatDesignBlock(block, references, sourceUrl, 4).trim())
    .join(' ');
  return blockText.replaceAll('|', '\\|');
}

function renderInlineCollection(
  inlineContent: unknown[],
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  return inlineContent.map(item => renderInlineContent(item, references, sourceUrl)).join('');
}

function renderInlineContent(
  inline: unknown,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string {
  const record = asRecord(inline);
  if (!record) {
    return '';
  }

  const type = getString(record, 'type');
  if (type === 'text') {
    return getString(record, 'text') ?? '';
  }

  if (type === 'strong') {
    return `**${renderInlineCollection(getArray(record.inlineContent), references, sourceUrl)}**`;
  }

  if (type === 'emphasis') {
    return `*${renderInlineCollection(getArray(record.inlineContent), references, sourceUrl)}*`;
  }

  if (type === 'codeVoice' || type === 'code') {
    return `\`${getString(record, 'code') ?? getString(record, 'text') ?? ''}\``;
  }

  if (type === 'reference') {
    const identifier = getString(record, 'identifier');
    if (!identifier) {
      return '';
    }
    const reference = references.get(identifier);
    const title = getString(record, 'title') ?? getString(reference, 'title') ?? getIdentifierTitle(identifier);
    const url = reference ? normalizeReferenceUrl(reference, sourceUrl) : undefined;
    if (url) {
      return `[${title}](${url})`;
    }
    return title;
  }

  if (type === 'link') {
    const title = getString(record, 'title')
      ?? getString(record, 'text')
      ?? renderInlineCollection(getArray(record.inlineContent), references, sourceUrl);
    const url = normalizeUrl(getString(record, 'url'), sourceUrl);
    if (title && url) {
      return `[${title}](${url})`;
    }
    return title;
  }

  const nestedInlineContent = getArray(record.inlineContent);
  if (nestedInlineContent.length > 0) {
    return renderInlineCollection(nestedInlineContent, references, sourceUrl);
  }

  return getString(record, 'text') ?? '';
}

function getSupportedPlatforms(documentRecord: Record<string, unknown>): string[] {
  const customMetadata = getDesignCustomMetadata(documentRecord);
  const supportedPlatforms = customMetadata?.['supported-platforms']
    ?? customMetadata?.supportedPlatforms
    ?? documentRecord['supported-platforms']
    ?? documentRecord.supportedPlatforms
    ?? documentRecord.platforms;
  return getStringArray(supportedPlatforms);
}

function designRecordMatchesPlatform(
  record: Record<string, unknown>,
  platform: string,
  fallbackText: string,
): boolean {
  if (platform === 'all') {
    return true;
  }

  const supportedPlatforms = getSupportedPlatforms(record);
  if (supportedPlatforms.length === 0) {
    return containsText(fallbackText, platform);
  }

  return supportedPlatforms.some(supportedPlatform => containsText(supportedPlatform, platform));
}

function getCustomMetadataString(documentRecord: Record<string, unknown>, key: string): string | undefined {
  const customMetadata = getDesignCustomMetadata(documentRecord);
  return getString(customMetadata, key);
}

function getDesignCustomMetadata(
  documentRecord: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const rootCustomMetadata = asRecord(documentRecord.customMetadata);
  if (rootCustomMetadata) {
    return rootCustomMetadata;
  }

  const metadata = asRecord(documentRecord.metadata);
  return asRecord(metadata?.customMetadata);
}

function resolveImageBlockUrl(
  block: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
  sourceUrl: string,
): string | undefined {
  const directUrl = normalizeUrl(getString(block, 'url') ?? getString(block, 'source'), sourceUrl);
  if (directUrl) {
    return directUrl;
  }

  const identifier = getString(block, 'identifier');
  if (!identifier) {
    return undefined;
  }

  const reference = references.get(identifier);
  if (!reference) {
    return undefined;
  }

  return getImageUrlFromReference(reference, sourceUrl);
}

function resolveImageAltText(
  block: Record<string, unknown>,
  references: Map<string, Record<string, unknown>>,
): string | undefined {
  const directAlt = getString(block, 'alt') ?? getString(block, 'title');
  if (directAlt) {
    return directAlt;
  }

  const identifier = getString(block, 'identifier');
  if (!identifier) {
    return undefined;
  }

  const reference = references.get(identifier);
  return getString(reference, 'alt') ?? getString(reference, 'title');
}

function getImageUrlFromReference(
  reference: Record<string, unknown>,
  sourceUrl: string,
): string | undefined {
  const directUrl = normalizeUrl(getString(reference, 'url'), sourceUrl);
  if (directUrl && isDirectImageUrl(directUrl)) {
    return directUrl;
  }

  const variants = getRecordArray(reference.variants);
  for (const variant of variants) {
    const variantUrl = normalizeUrl(getString(variant, 'url'), sourceUrl);
    if (variantUrl) {
      return variantUrl;
    }
  }

  const images = getRecordArray(reference.images);
  for (const image of images) {
    const imageUrl = normalizeUrl(getString(image, 'url'), sourceUrl);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return undefined;
}

function normalizeReferenceUrl(
  reference: Record<string, unknown> | undefined,
  sourceUrl: string,
): string | undefined {
  if (!reference) {
    return undefined;
  }

  const referenceUrl = getString(reference, 'url');
  return normalizeUrl(referenceUrl, sourceUrl);
}

function updateResourceCatalogIndex(resources: DesignResourceCatalogEntry[]): void {
  for (const resource of resources) {
    resourceCatalogById.set(resource.resourceId, resource);
  }
}

function isResourceCatalogLink(
  link: cheerio.Cheerio<any>,
  href: string,
  label: string,
): boolean {
  if (link.hasClass('download-text-link')) {
    return true;
  }

  if (href.startsWith('sketch://') || href.includes('figma.com')) {
    return true;
  }

  const parsedUrl = safeUrl(href);
  const pathname = parsedUrl?.pathname ?? href;
  const extension = path.extname(pathname).toLowerCase();
  if (DIRECT_RESOURCE_EXTENSIONS.has(extension)) {
    return true;
  }

  const normalizedLabel = label.toLowerCase();
  return normalizedLabel.includes('download')
    || normalizedLabel.includes('figma')
    || normalizedLabel.includes('sketch');
}

function createResourceId(
  category: string,
  platform: string | undefined,
  title: string,
  label: string,
  downloadUrl: string,
  seenResourceIds: Map<string, number>,
): string {
  const baseId = [
    'design-resource',
    slugify(category),
    slugify(platform || 'all'),
    slugify(title),
    slugify(label),
    hashString(downloadUrl).slice(0, 12),
  ].join(':');
  const seenCount = seenResourceIds.get(baseId) ?? 0;
  seenResourceIds.set(baseId, seenCount + 1);
  if (seenCount === 0) {
    return baseId;
  }
  return `${baseId}:${seenCount + 1}`;
}

function findNearestHeadingText(
  $: cheerio.CheerioAPI,
  item: cheerio.Cheerio<any>,
): string | undefined {
  const previousHeading = item.prevAll('h4, h3').first();
  if (previousHeading.length > 0) {
    return normalizeWhitespace(previousHeading.text());
  }

  const parentPreviousHeading = item.parent().prevAll('h4, h3').first();
  if (parentPreviousHeading.length > 0) {
    return normalizeWhitespace(parentPreviousHeading.text());
  }

  const sectionHeading = item.closest('section').find('h4, h3').first();
  const headingText = normalizeWhitespace($(sectionHeading).text());
  return headingText || undefined;
}

function normalizeUrl(url: string | undefined, sourceUrl: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url, sourceUrl).toString();
  } catch {
    return undefined;
  }
}

function safeUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

function isDesignResourcesUrl(url: string): boolean {
  const parsedUrl = safeUrl(url);
  return parsedUrl?.hostname === 'developer.apple.com' && parsedUrl.pathname.startsWith('/design/resources');
}

function validateAppleDesignContentUrl(url: string): void {
  if (!isAppleDesignContentUrl(url)) {
    throw new Error('Apple Design content URLs must use https://developer.apple.com/design/.');
  }
}

function validateAppleDesignExampleUrl(url: string): void {
  if (isDirectImageUrl(url) || isDirectAppleImageCandidateUrl(url)) {
    validateAppleDesignImageUrl(url);
    return;
  }

  validateAppleDesignContentUrl(url);
}

function validateAppleDesignImageUrl(url: string): void {
  const parsedUrl = safeUrl(url);
  if (!parsedUrl || parsedUrl.protocol !== 'https:' || !APPLE_DESIGN_DOWNLOAD_HOSTS.has(parsedUrl.hostname)) {
    throw new Error('Apple Design image URLs must use HTTPS and an allowed Apple host.');
  }
}

function isAppleDesignContentUrl(url: string): boolean {
  const parsedUrl = safeUrl(url);
  return Boolean(
    parsedUrl
    && parsedUrl.protocol === 'https:'
    && parsedUrl.hostname === 'developer.apple.com'
    && (parsedUrl.pathname === '/design' || parsedUrl.pathname.startsWith('/design/')),
  );
}

function isAppleDesignJsonUrl(url: string): boolean {
  const parsedUrl = safeUrl(url);
  return Boolean(
    parsedUrl
    && parsedUrl.protocol === 'https:'
    && parsedUrl.hostname === 'developer.apple.com'
    && parsedUrl.pathname.startsWith('/tutorials/data/design/'),
  );
}

function isDirectAppleDownloadUrl(url: string): boolean {
  const parsedUrl = safeUrl(url);
  return Boolean(parsedUrl && parsedUrl.protocol === 'https:' && APPLE_DESIGN_DOWNLOAD_HOSTS.has(parsedUrl.hostname));
}

function validateDownloadUrl(url: string): void {
  const parsedUrl = safeUrl(url);
  if (!parsedUrl || parsedUrl.protocol !== 'https:') {
    throw new Error('Apple Design downloads must use HTTPS URLs.');
  }

  if (!APPLE_DESIGN_DOWNLOAD_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(`Download domain is not allowed: ${parsedUrl.hostname}`);
  }
}

async function fetchAppleDesignHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const { response, finalUrl } = await fetchAppleDesignManualRedirectResponse(
    url,
    'Apple Design content page',
    {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      validateUrl: validateAppleDesignContentRedirectUrl,
    },
  );
  const data = await readLimitedResponseBytes(
    response,
    DEFAULT_DESIGN_CONTENT_MAX_BYTES,
    'Apple Design content page',
  );

  return {
    html: data.toString('utf8'),
    finalUrl,
  };
}

async function fetchAppleDesignJson(url: string): Promise<unknown> {
  const { response } = await fetchAppleDesignManualRedirectResponse(
    url,
    'Apple Design JSON',
    {
      headers: {
        Accept: 'application/json,*/*;q=0.8',
      },
      validateUrl: validateAppleDesignJsonRedirectUrl,
    },
  );
  const data = await readLimitedResponseBytes(
    response,
    DEFAULT_DESIGN_CONTENT_MAX_BYTES,
    'Apple Design JSON',
  );

  return JSON.parse(data.toString('utf8')) as unknown;
}

async function fetchAppleDesignAssetResponse(
  url: string,
  description: string,
  options: { headers: Record<string, string> },
): Promise<{ response: Response; finalUrl: string }> {
  return fetchAppleDesignManualRedirectResponse(url, description, {
    headers: options.headers,
    validateUrl: validateAppleDesignRedirectUrl,
  });
}

async function fetchAppleDesignManualRedirectResponse(
  url: string,
  description: string,
  options: {
    headers: Record<string, string>;
    validateUrl: AppleDesignUrlValidator;
  },
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = url;
  options.validateUrl(currentUrl, description);

  for (let redirectCount = 0; redirectCount <= MAX_APPLE_DESIGN_REDIRECTS; redirectCount++) {
    const response = await httpClient.get(currentUrl, {
      timeout: REQUEST_CONFIG.TIMEOUT,
      redirect: 'manual',
      allowManualRedirect: true,
      headers: options.headers,
    });
    validateAppleDesignFinalResponseUrl(response, description, options.validateUrl);

    if (!isRedirectResponse(response)) {
      return {
        response,
        finalUrl: response.url || currentUrl,
      };
    }

    if (redirectCount === MAX_APPLE_DESIGN_REDIRECTS) {
      await cancelResponseBody(response);
      throw new Error(`${description} exceeded the ${MAX_APPLE_DESIGN_REDIRECTS} redirect limit.`);
    }

    let redirectUrl: string;
    try {
      redirectUrl = getAppleDesignRedirectUrl(response, currentUrl, description);
      options.validateUrl(redirectUrl, description);
    } catch (error) {
      await cancelResponseBody(response);
      throw error;
    }

    await cancelResponseBody(response);
    currentUrl = redirectUrl;
  }

  throw new Error(`${description} exceeded the ${MAX_APPLE_DESIGN_REDIRECTS} redirect limit.`);
}

function getAppleDesignRedirectUrl(
  response: Response,
  currentUrl: string,
  description: string,
): string {
  const location = response.headers.get('location');
  if (!location) {
    throw new Error(`${description} returned a redirect without a Location header.`);
  }

  const redirectUrl = normalizeUrl(location, currentUrl);
  if (!redirectUrl) {
    throw new Error(`${description} returned an invalid redirect URL.`);
  }

  return redirectUrl;
}

function isRedirectResponse(response: Response): boolean {
  return response.status >= 300 && response.status < 400;
}

function validateAppleDesignRedirectUrl(url: string, description: string): void {
  const parsedUrl = safeUrl(url);
  if (!parsedUrl || parsedUrl.protocol !== 'https:' || !APPLE_DESIGN_DOWNLOAD_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(`${description} redirected to a URL outside the Apple Design allowlist.`);
  }
}

function validateAppleDesignContentRedirectUrl(url: string, description: string): void {
  if (!isAppleDesignContentUrl(url)) {
    throw new Error(`${description} redirected to a URL outside the Apple Design content allowlist.`);
  }
}

function validateAppleDesignJsonRedirectUrl(url: string, description: string): void {
  if (!isAppleDesignJsonUrl(url)) {
    throw new Error(`${description} redirected to a URL outside the Apple Design JSON allowlist.`);
  }
}

function validateAppleDesignFinalResponseUrl(
  response: Response,
  description: string,
  validateUrl: AppleDesignUrlValidator,
): void {
  if (!response.url) {
    return;
  }

  validateUrl(response.url, description);
}

function isDirectAppleImageCandidateUrl(url: string): boolean {
  const parsedUrl = safeUrl(url);
  if (!parsedUrl || parsedUrl.protocol !== 'https:' || !APPLE_DESIGN_DOWNLOAD_HOSTS.has(parsedUrl.hostname)) {
    return false;
  }

  if (parsedUrl.hostname !== 'developer.apple.com') {
    return true;
  }

  return isDirectImageUrl(url);
}

function isDirectImageUrl(url: string): boolean {
  const mimeType = detectMimeType(undefined, url);
  return isImageMimeType(mimeType);
}

function inferFormat(url: string, label: string): string {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes('figma') || url.includes('figma.com')) {
    return 'figma';
  }
  if (normalizedLabel.includes('sketch') || url.startsWith('sketch://')) {
    return 'sketch';
  }

  const parsedUrl = safeUrl(url);
  const extension = path.extname(parsedUrl?.pathname ?? url).replace('.', '').toLowerCase();
  if (extension) {
    return extension;
  }

  return 'external';
}

function detectMimeType(contentType: string | null | undefined, url: string): string {
  if (contentType) {
    return contentType.split(';')[0].trim().toLowerCase();
  }

  const parsedUrl = safeUrl(url);
  const extension = path.extname(parsedUrl?.pathname ?? url).toLowerCase();
  switch (extension) {
    case '.dmg':
      return 'application/x-apple-diskimage';
    case '.gif':
      return 'image/gif';
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg';
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.webp':
      return 'image/webp';
    case '.zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith(IMAGE_MIME_PREFIX);
}

function getContentLength(response: Response): number | undefined {
  const contentLengthHeader = response.headers.get('content-length');
  if (!contentLengthHeader) {
    return undefined;
  }

  const contentLength = Number.parseInt(contentLengthHeader, 10);
  if (Number.isNaN(contentLength)) {
    return undefined;
  }
  return contentLength;
}

async function readLimitedResponseBytes(
  response: Response,
  byteLimit: number,
  description: string,
): Promise<Buffer> {
  const contentLength = getContentLength(response);
  if (contentLength !== undefined && contentLength > byteLimit) {
    await cancelResponseBody(response);
    throw new Error(`${description} exceeds the ${byteLimit} byte download limit.`);
  }

  if (!response.body) {
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > byteLimit) {
      throw new Error(`${description} exceeds the ${byteLimit} byte download limit.`);
    }
    return data;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    let result = await reader.read();
    while (!result.done) {
      totalBytes += result.value.byteLength;
      if (totalBytes > byteLimit) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`${description} exceeds the ${byteLimit} byte download limit.`);
      }

      chunks.push(Buffer.from(result.value));
      result = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

async function assertDesignCacheCapacity(
  cacheDirectory: string,
  incomingBytes: number,
): Promise<void> {
  const cacheMaxBytes = getDesignCacheMaxBytes();
  const currentBytes = await getDirectoryFileBytes(cacheDirectory);
  const projectedBytes = currentBytes + incomingBytes;

  if (projectedBytes > cacheMaxBytes) {
    throw new Error(
      `Apple Design download cache exceeds the ${cacheMaxBytes} byte cache limit.`,
    );
  }
}

async function writeExclusiveDesignCacheFile(
  cacheDirectory: string,
  hash: string,
  filename: string,
  data: Buffer,
): Promise<{ cacheFilename: string; filePath: string }> {
  for (let attemptCount = 0; attemptCount < 3; attemptCount++) {
    const cacheFilename = createCacheFilename(hash, filename);
    const filePath = path.join(cacheDirectory, cacheFilename);

    try {
      const fileHandle = await open(filePath, 'wx', 0o600);
      let writeError: unknown;
      try {
        await fileHandle.writeFile(data);
      } catch (error) {
        writeError = error;
      } finally {
        await fileHandle.close();
      }
      if (writeError) {
        await rm(filePath, { force: true }).catch(() => undefined);
        throw writeError;
      }

      return {
        cacheFilename,
        filePath,
      };
    } catch (error) {
      if (hasErrorCode(error, 'EEXIST')) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Apple Design cache could not create a unique resource file.');
}

async function withDesignCacheWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previousWrite = designCacheWriteQueue;
  let releaseLock: (() => void) | undefined;
  designCacheWriteQueue = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await previousWrite.catch(() => undefined);
  try {
    return await operation();
  } finally {
    if (releaseLock) {
      releaseLock();
    }
  }
}

function createCacheFilename(hash: string, filename: string): string {
  return `${hash}-${randomUUID()}-${filename}`;
}

function getDesignCacheMaxBytes(): number {
  const configuredLimit = process.env.APPLE_DOCS_MCP_CACHE_MAX_BYTES;
  if (!configuredLimit) {
    return DEFAULT_DOWNLOAD_CACHE_MAX_BYTES;
  }

  const parsedLimit = Number.parseInt(configuredLimit, 10);
  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_DOWNLOAD_CACHE_MAX_BYTES;
  }

  return parsedLimit;
}

async function getDirectoryFileBytes(directory: string): Promise<number> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return 0;
    }
    throw error;
  }

  let totalBytes = 0;
  for (const entry of entries) {
    if (entry.isFile()) {
      totalBytes += await getFileSize(path.join(directory, entry.name));
    }
  }

  return totalBytes;
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      return 0;
    }
    return fileStats.size;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return 0;
    }
    throw error;
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const errorWithCode = error as { code?: unknown };
  return errorWithCode.code === code;
}

function getDesignCacheDirectory(): string {
  const configuredCacheDirectory = process.env.APPLE_DOCS_MCP_CACHE_DIR;
  if (configuredCacheDirectory) {
    return configuredCacheDirectory;
  }

  if (!defaultDesignCacheDirectory) {
    defaultDesignCacheDirectory = mkdtempSync(path.join(tmpdir(), 'apple-docs-mcp-design-'));
  }

  return defaultDesignCacheDirectory;
}

function createTextContent(text: string): ContentBlock {
  return {
    type: 'text',
    text,
  };
}

function createResourceLink(cachedResource: CachedDesignResource): ResourceLink {
  return {
    type: 'resource_link',
    uri: cachedResource.uri,
    name: cachedResource.name,
    title: cachedResource.title,
    description: cachedResource.description,
    mimeType: cachedResource.mimeType,
  };
}

function containsText(source: string | undefined, query: string): boolean {
  if (!source) {
    return false;
  }
  return source.toLowerCase().includes(query.toLowerCase());
}

function resourceMatchesPlatform(resource: DesignResourceCatalogEntry, platform: string): boolean {
  if (platform === 'all') {
    return true;
  }
  return containsText(resource.platform, platform) || containsText(resource.title, platform);
}

function getFilenameFromUrl(url: string): string {
  const parsedUrl = safeUrl(url);
  const basename = path.basename(parsedUrl?.pathname ?? url);
  return basename || 'apple-design-resource';
}

function sanitizeFilename(filename: string): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  return sanitizedFilename || 'apple-design-resource';
}

function slugify(value: string): string {
  const slug = value.toLowerCase()
    .replaceAll('&', 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'resource';
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashBuffer(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function getIdentifierTitle(identifier: string): string {
  return identifier.split('/').pop() ?? identifier;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getRecordMap(value: unknown): Map<string, Record<string, unknown>> {
  const valueRecord = asRecord(value);
  const map = new Map<string, Record<string, unknown>>();
  if (!valueRecord) {
    return map;
  }

  for (const [key, entryValue] of Object.entries(valueRecord)) {
    const entryRecord = asRecord(entryValue);
    if (entryRecord) {
      map.set(key, entryRecord);
    }
  }

  return map;
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  return getArray(value).flatMap(item => {
    const record = asRecord(item);
    if (!record) {
      return [];
    }
    return [record];
  });
}

function getArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

function getString(value: unknown, key: string): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const propertyValue = record[key];
  if (typeof propertyValue === 'string') {
    return propertyValue;
  }
  return undefined;
}

function getNumber(value: unknown, key: string): number | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const propertyValue = record[key];
  if (typeof propertyValue === 'number') {
    return propertyValue;
  }
  return undefined;
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

export async function removeCachedDesignResourcesForTesting(): Promise<void> {
  const cacheDirectory = getDesignCacheDirectory();
  await rm(cacheDirectory, {
    force: true,
    recursive: true,
  });
  if (!process.env.APPLE_DOCS_MCP_CACHE_DIR) {
    defaultDesignCacheDirectory = undefined;
  }
}
