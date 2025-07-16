import { jest } from '@jest/globals';

/**
 * Mock data for tests
 */
export const mockData = {
  // Framework index data
  frameworkIndex: {
    interfaceLanguages: {
      swift: [
        {
          path: '/documentation/uikit/uiview',
          title: 'UIView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/uiviewcontroller',
          title: 'UIViewController',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/uitableview',
          title: 'UITableView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/uistackview',
          title: 'UIStackView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/list',
          title: 'List',
          type: 'struct',
          beta: false,
          deprecated: false,
          children: [],
        },
      ],
      occ: [
        {
          path: '/documentation/uikit/uiview',
          title: 'UIView',
          type: 'class',
          beta: false,
          deprecated: false,
          children: [],
        },
      ],
    },
  },

  // Search results HTML
  searchResultsHtml: `
    <html>
      <body>
        <script>
          window.searchData = {
            results: [
              {
                title: "UIView",
                url: "https://developer.apple.com/documentation/uikit/uiview",
                description: "An object that manages the content for a rectangular area on the screen.",
                type: "Documentation"
              },
              {
                title: "UIViewController",
                url: "https://developer.apple.com/documentation/uikit/uiviewcontroller",
                description: "An object that manages a view hierarchy for your UIKit app.",
                type: "Documentation"
              }
            ]
          };
        </script>
      </body>
    </html>
  `,

  // Doc JSON data
  docJsonData: {
    primaryContentSections: [
      {
        kind: 'declarations',
        declarations: [
          {
            tokens: [
              { text: 'class', kind: 'keyword' },
              { text: ' ' },
              { text: 'UIView', kind: 'typeIdentifier' },
            ],
          },
        ],
      },
    ],
    metadata: {
      roleHeading: 'Class',
      title: 'UIView',
      modules: [{ name: 'UIKit' }],
    },
  },

  // Technologies data
  technologiesData: {
    technologies: [
      {
        name: 'UIKit',
        path: '/documentation/uikit',
        beta: false,
        deprecated: false,
        languages: ['swift', 'occ'],
      },
      {
        name: 'SwiftUI',
        path: '/documentation/swiftui',
        beta: false,
        deprecated: false,
        languages: ['swift'],
      },
    ],
  },
};

/**
 * Create a mock HTTP client
 */
export const createMockHttpClient = () => ({
  getJson: jest.fn(),
  getText: jest.fn(),
  get: jest.fn(),
});

/**
 * Create a mock cache
 */
export const createMockCache = () => ({
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  size: jest.fn(() => 0),
  getStats: jest.fn(() => ({ hits: 0, misses: 0, sets: 0, deletes: 0 })),
});

/**
 * Wait for all promises to resolve
 */
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

/**
 * Mock MCP server response
 */
export const createMockMCPResponse = (content: string, isError = false) => ({
  content: [
    {
      type: 'text' as const,
      text: content,
    },
  ],
  isError,
});

/**
 * Create a test framework index with specific items
 */
export const createTestFrameworkIndex = (items: any[]) => ({
  interfaceLanguages: {
    swift: items,
  },
});

/**
 * Create a test search result
 */
export const createTestSearchResult = (title: string, url: string, description: string) => ({
  title,
  url,
  description,
  type: 'Documentation',
});