import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  clearDesignResourceCacheForTesting,
  formatAppleDesignDocument,
  handleDownloadAppleDesignResource,
  handleGetAppleDesignContent,
  handleGetAppleDesignExamples,
  handleSearchAppleDesignDocs,
  listCachedDesignResources,
  parseAppleDesignHtmlPage,
  parseDesignResourcesHtml,
  readCachedDesignResource,
} from '../../src/tools/design-docs.js';
import { httpClient } from '../../src/utils/http-client.js';

jest.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    get: jest.fn(),
    getJson: jest.fn(),
    getText: jest.fn(),
  },
}));

const SAMPLE_HIG_DOCUMENT = {
  metadata: {
    title: 'Layout',
    role: 'article',
    abstract: [
      {
        type: 'text',
        text: 'Place content in ways that help people understand your interface.',
      },
    ],
    customMetadata: {
      'supported-platforms': [
        'iOS',
        'iPadOS',
        'macOS',
      ],
      'alert-text': 'Use layout guidance with platform conventions.',
      'alert-date': '2026-06-09',
    },
  },
  abstract: [
    {
      type: 'text',
      text: 'Arrange views so people can understand and interact with them.',
    },
  ],
  references: {
    'doc://image/layout-hero': {
      type: 'image',
      alt: 'A layout example',
      variants: [
        {
          url: '/assets/elements/icons/layout-hero.png',
        },
      ],
    },
    'doc://topic/color': {
      title: 'Color',
      url: '/design/human-interface-guidelines/color',
      abstract: [
        {
          type: 'text',
          text: 'Use color consistently.',
        },
      ],
    },
  },
  primaryContentSections: [
    {
      kind: 'content',
      content: [
        {
          type: 'heading',
          text: 'Best practices',
          level: 2,
        },
        {
          type: 'paragraph',
          inlineContent: [
            {
              type: 'text',
              text: 'Use a ',
            },
            {
              type: 'strong',
              inlineContent: [
                {
                  type: 'text',
                  text: 'consistent',
                },
              ],
            },
            {
              type: 'text',
              text: ' grid.',
            },
          ],
        },
        {
          type: 'image',
          identifier: 'doc://image/layout-hero',
        },
        {
          type: 'unorderedList',
          items: [
            {
              content: [
                {
                  type: 'paragraph',
                  inlineContent: [
                    {
                      type: 'text',
                      text: 'Align related controls.',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'table',
          header: [
            {
              inlineContent: [
                {
                  type: 'text',
                  text: 'Platform',
                },
              ],
            },
            {
              inlineContent: [
                {
                  type: 'text',
                  text: 'Spacing',
                },
              ],
            },
          ],
          rows: [
            {
              cells: [
                {
                  inlineContent: [
                    {
                      type: 'text',
                      text: 'iOS',
                    },
                  ],
                },
                {
                  inlineContent: [
                    {
                      type: 'text',
                      text: '8 pt',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  topicSections: [
    {
      title: 'Foundations',
      identifiers: [
        'doc://topic/color',
      ],
    },
  ],
  sections: [
    {
      title: 'Change log',
      kind: 'changes',
      items: [
        {
          date: '2026-06-09',
          content: [
            {
              type: 'paragraph',
              inlineContent: [
                {
                  type: 'text',
                  text: 'Updated platform guidance.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SAMPLE_RESOURCES_HTML = `
  <main>
    <section class="section-download">
      <h2>Design templates</h2>
      <h4>iOS 18 and iPadOS 18</h4>
      <div class="grid-item">
        <img class="download-image" src="/assets/elements/icons/ios-template.png" alt="iOS template">
        <h5>iOS 18 and iPadOS 18</h5>
        <a class="download-text-link" href="https://www.figma.com/community/file/123">Figma</a>
        <a class="download-text-link" href="sketch://add-library?url=https://example.com/library.sketch">Sketch Library</a>
        <a class="download-text-link" href="/design/downloads/iOS-18.dmg">Download</a>
        <p class="download-text-description">Requires macOS Sonoma or later.</p>
        <p class="download-text-description"><a href="/design/human-interface-guidelines/layout">Layout</a></p>
      </div>
    </section>
    <section class="section-download">
      <h2>Fonts</h2>
      <h4>System fonts</h4>
      <div class="grid-item">
        <img class="download-image" src="https://docs-assets.developer.apple.com/fonts.png" alt="">
        <h5>SF Pro</h5>
        <a class="download-text-link" href="https://developer.apple.com/fonts/SF-Pro.zip">Download</a>
      </div>
    </section>
  </main>
`;

let temporaryCacheDirectory: string | undefined;

function createResponse(
  data: Buffer,
  contentType: string | undefined,
  contentLength?: number,
): Response {
  const headers = new Headers();
  if (contentType) {
    headers.set('content-type', contentType);
  }
  if (contentLength !== undefined) {
    headers.set('content-length', String(contentLength));
  } else {
    headers.set('content-length', String(data.length));
  }

  return new Response(data, {
    status: 200,
    headers,
  });
}

function createJsonResponse(data: unknown): Response {
  return createResponse(Buffer.from(JSON.stringify(data)), 'application/json');
}

function createShortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function createResponseWithUrl(
  data: Buffer,
  contentType: string | undefined,
  url: string,
): Response {
  const response = createResponse(data, contentType);
  Object.defineProperty(response, 'url', {
    value: url,
  });
  return response;
}

function createRedirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location,
    },
  });
}

function createCancelableRedirectResponse(location: string, cancel: () => Promise<void>): Response {
  return {
    status: 302,
    headers: new Headers({
      location,
    }),
    body: {
      cancel,
    },
  } as unknown as Response;
}

beforeEach(async () => {
  temporaryCacheDirectory = await mkdtemp(path.join(tmpdir(), 'apple-design-test-'));
  process.env.APPLE_DOCS_MCP_CACHE_DIR = temporaryCacheDirectory;
  clearDesignResourceCacheForTesting();
  jest.clearAllMocks();
});

afterEach(async () => {
  clearDesignResourceCacheForTesting();
  delete process.env.APPLE_DOCS_MCP_CACHE_DIR;
  delete process.env.APPLE_DOCS_MCP_CACHE_MAX_BYTES;

  if (temporaryCacheDirectory) {
    await rm(temporaryCacheDirectory, {
      force: true,
      recursive: true,
    });
  }
});

describe('Apple Design document formatting', () => {
  it('should reject non-Apple Design content URLs before fetching', async () => {
    await expect(handleGetAppleDesignContent({
      url: 'https://example.com/design/',
    })).rejects.toThrow('Apple Design content URLs');

    expect(httpClient.getText).not.toHaveBeenCalled();
    expect(httpClient.getJson).not.toHaveBeenCalled();
  });

  it('should follow allowed Apple Design content redirects manually', async () => {
    const html = `
      <main>
        <h1>Design Resources</h1>
        <p>Download templates.</p>
      </main>
    `;
    const cancelBody = jest.fn(async () => undefined);
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createCancelableRedirectResponse(
        'https://developer.apple.com/design/resources/',
        cancelBody,
      ))
      .mockResolvedValueOnce(createResponse(Buffer.from(html), 'text/html'));

    const result = await handleGetAppleDesignContent({
      url: 'https://developer.apple.com/design/',
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('# Design Resources'),
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(
      1,
      'https://developer.apple.com/design/',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
    expect(httpClient.get).toHaveBeenNthCalledWith(
      2,
      'https://developer.apple.com/design/resources/',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
    expect(cancelBody).toHaveBeenCalledTimes(1);
  });

  it('should reject Apple Design content redirects outside the content allowlist', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue(
      createRedirectResponse('https://example.com/design/'),
    );

    await expect(handleGetAppleDesignContent({
      url: 'https://developer.apple.com/design/',
    })).rejects.toThrow('outside the Apple Design content allowlist');
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('should reject oversized Apple Design HTML before reading the body', async () => {
    const arrayBuffer = jest.fn();
    const cancelBody = jest.fn(async () => undefined);
    const oversizedResponse = {
      headers: new Headers({
        'content-length': String((20 * 1024 * 1024) + 1),
        'content-type': 'text/html',
      }),
      status: 200,
      body: {
        cancel: cancelBody,
      },
      arrayBuffer,
    } as unknown as Response;
    (httpClient.get as jest.Mock).mockResolvedValue(oversizedResponse);

    await expect(handleGetAppleDesignContent({
      url: 'https://developer.apple.com/design/',
    })).rejects.toThrow('Apple Design content page exceeds');
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(cancelBody).toHaveBeenCalledTimes(1);
  });

  it('should clamp invalid HIG heading levels', () => {
    const document = {
      metadata: {
        title: 'Heading levels',
      },
      primaryContentSections: [
        {
          kind: 'content',
          content: [
            {
              type: 'heading',
              text: 'Negative heading',
              level: -1,
            },
            {
              type: 'heading',
              text: 'Large heading',
              level: 20,
            },
          ],
        },
      ],
    };

    const result = formatAppleDesignDocument(
      document,
      'https://developer.apple.com/design/human-interface-guidelines/layout',
    );

    expect(result).toContain('# Negative heading');
    expect(result).toContain('###### Large heading');
  });

  it('should reject oversized Apple Design JSON before reading the body', async () => {
    const arrayBuffer = jest.fn();
    const oversizedResponse = {
      headers: new Headers({
        'content-length': String((20 * 1024 * 1024) + 1),
        'content-type': 'application/json',
      }),
      status: 200,
      body: null,
      arrayBuffer,
    } as unknown as Response;
    (httpClient.get as jest.Mock).mockResolvedValue(oversizedResponse);

    await expect(handleGetAppleDesignContent({
      url: 'https://developer.apple.com/design/human-interface-guidelines/layout',
    })).rejects.toThrow('Apple Design JSON exceeds');
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('should format HIG JSON content with images, tables, links, platforms, and change logs', () => {
    const result = formatAppleDesignDocument(
      SAMPLE_HIG_DOCUMENT,
      'https://developer.apple.com/design/human-interface-guidelines/layout',
    );

    expect(result).toContain('# Layout');
    expect(result).toContain('Arrange views so people can understand and interact with them.');
    expect(result).toContain('## Supported Platforms');
    expect(result).toContain('iOS');
    expect(result).toContain('## Alert');
    expect(result).toContain('Use layout guidance with platform conventions.');
    expect(result).toContain('**consistent** grid.');
    expect(result).toContain('![A layout example](https://developer.apple.com/assets/elements/icons/layout-hero.png)');
    expect(result).toContain('| Platform | Spacing |');
    expect(result).toContain('- [Color](https://developer.apple.com/design/human-interface-guidelines/color)');
    expect(result).toContain('## Change Log');
    expect(result).toContain('2026-06-09');
  });

  it('should parse Apple Design HTML cards when JSON is not available', () => {
    const html = `
      <main>
        <h1>Apple Design</h1>
        <p>Design great apps and games.</p>
        <a class="tile" href="/design/resources/">
          <h3>Design resources</h3>
          <p>Download templates, components, and tools.</p>
        </a>
      </main>
    `;

    const result = parseAppleDesignHtmlPage(html, 'https://developer.apple.com/design/');

    expect(result).toContain('# Apple Design');
    expect(result).toContain('Design great apps and games.');
    expect(result).toContain('[Design resources](https://developer.apple.com/design/resources/)');
  });
});

describe('Apple Design search', () => {
  it('should apply platform filters to HIG search results', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue(createJsonResponse(SAMPLE_HIG_DOCUMENT));

    const result = await handleSearchAppleDesignDocs({
      query: 'Layout',
      contentType: 'hig',
      platform: 'watchOS',
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('No Apple Design results found.'),
    });
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://developer.apple.com/tutorials/data/design/human-interface-guidelines.json',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
  });
});

describe('Apple Design Resources parser', () => {
  it('should extract templates, fonts, notes, previews, formats, and related HIG links', () => {
    const resources = parseDesignResourcesHtml(
      SAMPLE_RESOURCES_HTML,
      'https://developer.apple.com/design/resources/',
    );

    expect(resources).toHaveLength(4);
    expect(resources[0]).toMatchObject({
      resourceId: `design-resource:design-templates:ios-18-and-ipados-18:ios-18-and-ipados-18:figma:${createShortHash('https://www.figma.com/community/file/123')}`,
      category: 'Design templates',
      platform: 'iOS 18 and iPadOS 18',
      title: 'iOS 18 and iPadOS 18',
      format: 'figma',
      downloadLabel: 'Figma',
      downloadUrl: 'https://www.figma.com/community/file/123',
      note: 'Requires macOS Sonoma or later. Layout',
      previewImageUrl: 'https://developer.apple.com/assets/elements/icons/ios-template.png',
    });
    expect(resources[0].relatedGuidelineLinks).toEqual([
      'https://developer.apple.com/design/human-interface-guidelines/layout',
    ]);
    expect(resources[1]).toMatchObject({
      format: 'sketch',
      downloadUrl: 'sketch://add-library?url=https://example.com/library.sketch',
    });
    expect(resources[2]).toMatchObject({
      format: 'dmg',
      downloadUrl: 'https://developer.apple.com/design/downloads/iOS-18.dmg',
    });
    expect(resources[3]).toMatchObject({
      category: 'Fonts',
      format: 'zip',
      title: 'SF Pro',
    });
  });

  it('should keep resource IDs stable when same-label resources reorder', () => {
    const firstHtml = `
      <main>
        <section class="section-download">
          <h2>Design templates</h2>
          <h4>iOS</h4>
          <div class="grid-item">
            <h5>Alpha template</h5>
            <a class="download-text-link" href="/design/downloads/alpha.zip">Download</a>
          </div>
          <div class="grid-item">
            <h5>Beta template</h5>
            <a class="download-text-link" href="/design/downloads/beta.zip">Download</a>
          </div>
        </section>
      </main>
    `;
    const secondHtml = `
      <main>
        <section class="section-download">
          <h2>Design templates</h2>
          <h4>iOS</h4>
          <div class="grid-item">
            <h5>Beta template</h5>
            <a class="download-text-link" href="/design/downloads/beta.zip">Download</a>
          </div>
          <div class="grid-item">
            <h5>Alpha template</h5>
            <a class="download-text-link" href="/design/downloads/alpha.zip">Download</a>
          </div>
        </section>
      </main>
    `;

    const firstResources = parseDesignResourcesHtml(
      firstHtml,
      'https://developer.apple.com/design/resources/',
    );
    const secondResources = parseDesignResourcesHtml(
      secondHtml,
      'https://developer.apple.com/design/resources/',
    );
    const firstAlpha = firstResources.find(resource => resource.downloadUrl.endsWith('/alpha.zip'));
    const secondAlpha = secondResources.find(resource => resource.downloadUrl.endsWith('/alpha.zip'));
    const firstBeta = firstResources.find(resource => resource.downloadUrl.endsWith('/beta.zip'));
    const secondBeta = secondResources.find(resource => resource.downloadUrl.endsWith('/beta.zip'));

    expect(firstAlpha?.resourceId).toBe(secondAlpha?.resourceId);
    expect(firstBeta?.resourceId).toBe(secondBeta?.resourceId);
    expect(firstAlpha?.resourceId).not.toBe(firstBeta?.resourceId);
    expect(firstAlpha?.resourceId).toContain(createShortHash('https://developer.apple.com/design/downloads/alpha.zip'));
  });

  it('should suffix resource IDs for exact duplicate resource entries', () => {
    const html = `
      <main>
        <section class="section-download">
          <h2>Design templates</h2>
          <h4>iOS</h4>
          <div class="grid-item">
            <h5>Duplicate template</h5>
            <a class="download-text-link" href="/design/downloads/duplicate.zip">Download</a>
          </div>
          <div class="grid-item">
            <h5>Duplicate template</h5>
            <a class="download-text-link" href="/design/downloads/duplicate.zip">Download</a>
          </div>
        </section>
      </main>
    `;

    const resources = parseDesignResourcesHtml(
      html,
      'https://developer.apple.com/design/resources/',
    );
    const baseResourceId = `design-resource:design-templates:ios:duplicate-template:download:${
      createShortHash('https://developer.apple.com/design/downloads/duplicate.zip')
    }`;

    expect(resources.map(resource => resource.resourceId)).toEqual([
      baseResourceId,
      `${baseResourceId}:2`,
    ]);
  });
});

describe('Apple Design downloads and resources', () => {
  it('should download direct images, return image content, and expose BlobResourceContents', async () => {
    const imageBytes = Buffer.from('image-bytes');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(imageBytes, 'image/png'),
    );

    const result = await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/images/example.png',
    });

    const imageContent = result.content.find(content => content.type === 'image');
    const resourceLink = result.content.find(content => content.type === 'resource_link');

    expect(imageContent).toMatchObject({
      type: 'image',
      data: imageBytes.toString('base64'),
      mimeType: 'image/png',
    });
    expect(resourceLink).toMatchObject({
      type: 'resource_link',
      mimeType: 'image/png',
      name: 'example.png',
    });
    const imageHash = createHash('sha256').update(imageBytes).digest('hex');
    expect(resourceLink?.uri).toContain(`apple-design://cache/${imageHash}/${imageHash}-`);
    expect(resourceLink?.uri).not.toBe(`apple-design://cache/${imageHash}/example.png`);

    const resources = await listCachedDesignResources();
    expect(resources.resources).toHaveLength(1);

    const resource = await readCachedDesignResource(resourceLink?.uri ?? '');
    expect(resource.contents[0]).toMatchObject({
      uri: resourceLink?.uri,
      mimeType: 'image/png',
      blob: imageBytes.toString('base64'),
    });
  });

  it('should read persisted resource URIs after process-local cache state is cleared', async () => {
    const imageBytes = Buffer.from('persisted-image-bytes');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(imageBytes, 'image/png'),
    );

    const result = await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/images/persisted.png',
    });
    const resourceLink = result.content.find(content => content.type === 'resource_link');
    const uri = resourceLink?.uri ?? '';

    clearDesignResourceCacheForTesting();

    const resource = await readCachedDesignResource(uri);
    expect(resource.contents[0]).toMatchObject({
      uri,
      mimeType: 'image/png',
      blob: imageBytes.toString('base64'),
    });

    const resources = await listCachedDesignResources();
    expect(resources.resources).toEqual([
      expect.objectContaining({
        uri,
        mimeType: 'image/png',
        name: 'persisted.png',
      }),
    ]);
  });

  it('should avoid inlining large downloaded images', async () => {
    const imageBytes = Buffer.alloc((10 * 1024 * 1024) + 1, 1);
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(imageBytes, 'image/png'),
    );

    const result = await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/images/large-preview.png',
      maxBytes: imageBytes.length,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Downloaded Apple Design resource'),
      }),
      expect.objectContaining({
        type: 'resource_link',
        mimeType: 'image/png',
        name: 'large-preview.png',
      }),
    ]);
    expect(result.content.some(content => content.type === 'image')).toBe(false);
  });

  it('should return resource links for non-image downloads with MIME fallback', async () => {
    const archiveBytes = Buffer.from('zip-bytes');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(archiveBytes, undefined),
    );

    const result = await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Downloaded Apple Design resource'),
      }),
      expect.objectContaining({
        type: 'resource_link',
        mimeType: 'application/zip',
        name: 'templates.zip',
      }),
    ]);
  });

  it('should reject blocked download domains', async () => {
    await expect(handleDownloadAppleDesignResource({
      url: 'https://example.com/design-kit.zip',
    })).rejects.toThrow('not allowed');
  });

  it('should follow allowed Apple download redirects manually', async () => {
    const archiveBytes = Buffer.from('zip-bytes');
    const cancelBody = jest.fn(async () => undefined);
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createCancelableRedirectResponse(
        'https://devimages-cdn.apple.com/design/templates.zip',
        cancelBody,
      ))
      .mockResolvedValueOnce(createResponse(archiveBytes, 'application/zip'));

    const result = await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Downloaded Apple Design resource'),
      }),
      expect.objectContaining({
        type: 'resource_link',
        mimeType: 'application/zip',
        name: 'templates.zip',
      }),
    ]);
    expect(httpClient.get).toHaveBeenNthCalledWith(
      1,
      'https://developer.apple.com/design/downloads/templates.zip',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
    expect(httpClient.get).toHaveBeenNthCalledWith(
      2,
      'https://devimages-cdn.apple.com/design/templates.zip',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
    expect(cancelBody).toHaveBeenCalledTimes(1);
  });

  it('should reject download redirects outside the Apple allowlist before fetching them', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue(
      createRedirectResponse('https://example.com/templates.zip'),
    );

    await expect(handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    })).rejects.toThrow('outside the Apple Design allowlist');
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('should reject download responses whose final URL is outside the Apple allowlist', async () => {
    const archiveBytes = Buffer.from('zip-bytes');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponseWithUrl(archiveBytes, 'application/zip', 'https://example.com/templates.zip'),
    );

    await expect(handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    })).rejects.toThrow('outside the Apple Design allowlist');
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://developer.apple.com/design/downloads/templates.zip',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
  });

  it('should reject oversized downloads before reading the body', async () => {
    const archiveBytes = Buffer.from('zip-bytes');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(archiveBytes, 'application/zip', 11),
    );

    await expect(handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
      maxBytes: 10,
    })).rejects.toThrow('exceeds');
  });

  it('should reuse duplicate cache hits for the same URL', async () => {
    const archiveBytes = Buffer.from('zip-bytes');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(archiveBytes, 'application/zip'),
    );

    const firstResult = await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    });
    const secondResult = await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    });

    const firstLink = firstResult.content.find(content => content.type === 'resource_link');
    const secondLink = secondResult.content.find(content => content.type === 'resource_link');

    expect(httpClient.get).toHaveBeenCalledTimes(1);
    expect(firstLink?.uri).toBe(secondLink?.uri);
  });

  it('should reuse in-flight duplicate downloads for the same URL', async () => {
    const archiveBytes = Buffer.from('zip-bytes');
    let resolveResponse: (response: Response) => void = () => undefined;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    (httpClient.get as jest.Mock).mockReturnValue(responsePromise);

    const firstPromise = handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    });
    const secondPromise = handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    });

    resolveResponse(createResponse(archiveBytes, 'application/zip'));
    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
    const firstLink = firstResult.content.find(content => content.type === 'resource_link');
    const secondLink = secondResult.content.find(content => content.type === 'resource_link');

    expect(httpClient.get).toHaveBeenCalledTimes(1);
    expect(firstLink?.uri).toBe(secondLink?.uri);
  });

  it('should enforce smaller maxBytes limits on duplicate cache hits', async () => {
    const archiveBytes = Buffer.from('zip-bytes');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(archiveBytes, 'application/zip'),
    );

    await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
    });

    await expect(handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/templates.zip',
      maxBytes: 4,
    })).rejects.toThrow('exceeds');
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('should reject downloads that exceed the aggregate cache limit', async () => {
    process.env.APPLE_DOCS_MCP_CACHE_MAX_BYTES = '10';
    const firstArchiveBytes = Buffer.from('123456');
    const secondArchiveBytes = Buffer.from('abcdef');
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createResponse(firstArchiveBytes, 'application/zip'))
      .mockResolvedValueOnce(createResponse(secondArchiveBytes, 'application/zip'));

    await handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/one.zip',
    });

    await expect(handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/two.zip',
    })).rejects.toThrow('cache limit');
  });

  it('should count existing cache-directory files toward the aggregate cache limit', async () => {
    process.env.APPLE_DOCS_MCP_CACHE_MAX_BYTES = '10';
    await writeFile(path.join(temporaryCacheDirectory ?? '', 'old-download.zip'), '12345678');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(Buffer.from('abc'), 'application/zip'),
    );

    await expect(handleDownloadAppleDesignResource({
      url: 'https://developer.apple.com/design/downloads/new.zip',
    })).rejects.toThrow('cache limit');
  });

  it('should enforce the aggregate cache limit across concurrent downloads', async () => {
    process.env.APPLE_DOCS_MCP_CACHE_MAX_BYTES = '10';
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createResponse(Buffer.from('123456'), 'application/zip'))
      .mockResolvedValueOnce(createResponse(Buffer.from('abcdef'), 'application/zip'));

    const results = await Promise.allSettled([
      handleDownloadAppleDesignResource({
        url: 'https://developer.apple.com/design/downloads/concurrent-one.zip',
      }),
      handleDownloadAppleDesignResource({
        url: 'https://developer.apple.com/design/downloads/concurrent-two.zip',
      }),
    ]);

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  });
});

describe('Apple Design examples', () => {
  it('should reject non-Apple example page URLs before fetching', async () => {
    await expect(handleGetAppleDesignExamples({
      url: 'https://example.com/design/example-page',
    })).rejects.toThrow('Apple Design content URLs');

    expect(httpClient.getText).not.toHaveBeenCalled();
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it('should reject direct image URLs from non-Apple hosts before fetching', async () => {
    await expect(handleGetAppleDesignExamples({
      url: 'https://example.com/design/example.png',
    })).rejects.toThrow('allowed Apple host');

    expect(httpClient.getText).not.toHaveBeenCalled();
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it('should reject unknown resource IDs for examples', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(Buffer.from('<html><body></body></html>'), 'text/html'),
    );

    await expect(handleGetAppleDesignExamples({
      resourceId: 'missing-resource-id',
    })).rejects.toThrow('Unknown Apple Design resourceId');

    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('should return HIG image references as MCP image content blocks', async () => {
    const imageBytes = Buffer.from('hig-image');
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createJsonResponse(SAMPLE_HIG_DOCUMENT))
      .mockResolvedValueOnce(createResponse(imageBytes, 'image/png'));

    const result = await handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/human-interface-guidelines/layout',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Apple Design Examples'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
  });

  it('should return direct Apple CDN images without path extensions', async () => {
    const imageBytes = Buffer.from('cdn-preview-image');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(imageBytes, 'image/png'),
    );

    const result = await handleGetAppleDesignExamples({
      url: 'https://docs-assets.developer.apple.com/design/preview',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Apple Design Examples'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
  });

  it('should reject Apple Design example page redirects outside the content allowlist', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue(
      createRedirectResponse('https://example.com/design/example-page'),
    );

    await expect(handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/get-started/',
    })).rejects.toThrow('outside the Apple Design content allowlist');
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('should keep trying example candidates until limit fetchable images are found', async () => {
    const html = `
      <main>
        <img src="https://docs-assets.developer.apple.com/design/not-an-image">
        <img src="https://docs-assets.developer.apple.com/design/valid-preview.png">
      </main>
    `;
    const imageBytes = Buffer.from('valid-preview');
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createResponse(Buffer.from(html), 'text/html'))
      .mockResolvedValueOnce(createResponse(Buffer.from('not-image'), 'text/plain'))
      .mockResolvedValueOnce(createResponse(imageBytes, 'image/png'));

    const result = await handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/get-started/',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Found 1 image example.'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
    expect(httpClient.get).toHaveBeenCalledTimes(3);
  });

  it('should cap query-derived preview fetches by the requested limit', async () => {
    const html = `
      <main>
        <section class="section-download">
          <h2>Design templates</h2>
          <h4>iOS</h4>
          <div class="grid-item">
            <img class="download-image" src="/assets/elements/icons/template-one.png">
            <h5>Template one</h5>
            <a class="download-text-link" href="/design/downloads/template-one.zip">Download</a>
          </div>
          <div class="grid-item">
            <img class="download-image" src="/assets/elements/icons/template-two.png">
            <h5>Template two</h5>
            <a class="download-text-link" href="/design/downloads/template-two.zip">Download</a>
          </div>
        </section>
      </main>
    `;
    const imageBytes = Buffer.from('template-one');
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createResponse(Buffer.from(html), 'text/html'))
      .mockResolvedValueOnce(createResponse(imageBytes, 'image/png'));

    const result = await handleGetAppleDesignExamples({
      query: 'template',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Found 1 image example.'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it('should skip failed discovered image candidates and keep trying later candidates', async () => {
    const html = `
      <main>
        <img src="https://docs-assets.developer.apple.com/design/stale-preview.png">
        <img src="https://docs-assets.developer.apple.com/design/fresh-preview.png">
      </main>
    `;
    const imageBytes = Buffer.from('fresh-preview');
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createResponse(Buffer.from(html), 'text/html'))
      .mockRejectedValueOnce(new Error('HTTP 404: Not Found'))
      .mockResolvedValueOnce(createResponse(imageBytes, 'image/png'));

    const result = await handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/get-started/',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Found 1 image example.'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
    expect(httpClient.get).toHaveBeenCalledTimes(3);
  });

  it('should extract HIG image examples from tabs', async () => {
    const imageBytes = Buffer.from('tab-image');
    const documentWithTabs = {
      ...SAMPLE_HIG_DOCUMENT,
      references: {},
      primaryContentSections: [
        {
          kind: 'content',
          content: [
            {
              type: 'tabNavigator',
              tabs: [
                {
                  title: 'iOS',
                  content: [
                    {
                      type: 'image',
                      url: '/assets/elements/icons/tab-example.png',
                      alt: 'A tabbed image',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createJsonResponse(documentWithTabs))
      .mockResolvedValueOnce(createResponse(imageBytes, 'image/png'));

    const result = await handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/human-interface-guidelines/layout',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Apple Design Examples'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
  });

  it('should return direct Apple image URLs as MCP image content blocks', async () => {
    const imageBytes = Buffer.from('preview-image');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponse(imageBytes, 'image/png'),
    );

    const result = await handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/images/example.png',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Apple Design Examples'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://developer.apple.com/design/images/example.png',
      expect.any(Object),
    );
  });

  it('should follow allowed Apple image redirects manually', async () => {
    const imageBytes = Buffer.from('preview-image');
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce(createRedirectResponse('https://docs-assets.developer.apple.com/design/example.png'))
      .mockResolvedValueOnce(createResponse(imageBytes, 'image/png'));

    const result = await handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/images/example.png',
      limit: 1,
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Apple Design Examples'),
      }),
      expect.objectContaining({
        type: 'image',
        data: imageBytes.toString('base64'),
        mimeType: 'image/png',
      }),
    ]);
    expect(httpClient.get).toHaveBeenNthCalledWith(
      1,
      'https://developer.apple.com/design/images/example.png',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
    expect(httpClient.get).toHaveBeenNthCalledWith(
      2,
      'https://docs-assets.developer.apple.com/design/example.png',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
  });

  it('should reject direct image examples redirected outside the Apple allowlist before fetching them', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue(
      createRedirectResponse('https://example.com/example.png'),
    );

    await expect(handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/images/example.png',
      limit: 1,
    })).rejects.toThrow('outside the Apple Design allowlist');
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('should reject direct image example responses whose final URL is outside the Apple allowlist', async () => {
    const imageBytes = Buffer.from('preview-image');
    (httpClient.get as jest.Mock).mockResolvedValue(
      createResponseWithUrl(imageBytes, 'image/png', 'https://example.com/example.png'),
    );

    await expect(handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/images/example.png',
      limit: 1,
    })).rejects.toThrow('outside the Apple Design allowlist');
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://developer.apple.com/design/images/example.png',
      expect.objectContaining({
        allowManualRedirect: true,
        redirect: 'manual',
      }),
    );
  });

  it('should reject oversized direct image examples before reading the body', async () => {
    const arrayBuffer = jest.fn();
    const oversizedResponse = {
      headers: new Headers({
        'content-length': String(11 * 1024 * 1024),
        'content-type': 'image/png',
      }),
      body: null,
      arrayBuffer,
    } as unknown as Response;
    (httpClient.get as jest.Mock).mockResolvedValue(oversizedResponse);

    await expect(handleGetAppleDesignExamples({
      url: 'https://developer.apple.com/design/images/huge.png',
      limit: 1,
    })).rejects.toThrow('Apple Design image preview exceeds');

    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});
