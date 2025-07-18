import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleGetRelatedApis } from '../../src/tools/get-related-apis.js';
import { httpClient } from '../../src/utils/http-client.js';
import { convertToJsonApiUrl } from '../../src/utils/url-converter.js';

jest.mock('../../src/utils/http-client.js');
jest.mock('../../src/utils/url-converter.js', () => ({
  convertToJsonApiUrl: jest.fn(),
  isValidAppleDeveloperUrl: jest.fn().mockReturnValue(true),
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;
const mockConvertToJsonApiUrl = convertToJsonApiUrl as jest.MockedFunction<typeof convertToJsonApiUrl>;

describe('get-related-apis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConvertToJsonApiUrl.mockReturnValue('https://developer.apple.com/documentation/swiftui/view.json');
  });

  describe('handleGetRelatedApis', () => {
    const mockApiUrl = 'https://developer.apple.com/documentation/swiftui/view';
    const mockJsonResponse = {
      identifier: 'swiftui/view',
      title: 'View',
      abstract: [{ type: 'text', text: 'A type that represents a SwiftUI view.' }],
      metadata: {
        roleHeading: 'Protocol',
        platforms: [{ name: 'iOS', introducedAt: '13.0' }],
      },
      relationshipsSections: [
        {
          type: 'inheritsFrom',
          title: 'Inherits From',
          identifiers: ['swiftui/protocol1'],
        },
        {
          type: 'conformsTo',
          title: 'Conforms To',
          identifiers: ['swiftui/protocol2', 'swiftui/protocol3'],
        },
      ],
      seeAlsoSections: [
        {
          title: 'Related Views',
          identifiers: ['swiftui/text', 'swiftui/image'],
        },
      ],
      references: {
        'swiftui/protocol1': {
          title: 'Protocol1',
          url: '/documentation/swiftui/protocol1',
          kind: 'symbol',
        },
        'swiftui/protocol2': {
          title: 'Protocol2',
          url: '/documentation/swiftui/protocol2',
          kind: 'symbol',
        },
        'swiftui/protocol3': {
          title: 'Protocol3',
          url: '/documentation/swiftui/protocol3',
          kind: 'symbol',
        },
        'swiftui/text': {
          title: 'Text',
          url: '/documentation/swiftui/text',
          abstract: [{ type: 'text', text: 'A view that displays text.' }],
          kind: 'symbol',
        },
        'swiftui/image': {
          title: 'Image',
          url: '/documentation/swiftui/image',
          abstract: [{ type: 'text', text: 'A view that displays an image.' }],
          kind: 'symbol',
        },
      },
    };

    it('should get all related APIs by default', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockJsonResponse);

      const result = await handleGetRelatedApis(mockApiUrl);

      expect(mockConvertToJsonApiUrl).toHaveBeenCalledWith(mockApiUrl);
      expect(mockHttpClient.getJson).toHaveBeenCalledWith(
        'https://developer.apple.com/documentation/swiftui/view.json'
      );
      
      expect(result).toContain('# Related APIs for view');
      expect(result).toContain('**Found 5 related APIs:**');
      expect(result).toContain('## Inherits From');
      expect(result).toContain('[Protocol1]');
      expect(result).toContain('## Conforms To');
      expect(result).toContain('[Protocol2]');
      expect(result).toContain('[Protocol3]');
      expect(result).toContain('## See Also: Related Views');
      expect(result).toContain('[Text]');
      expect(result).toContain('A view that displays text.');
    });

    it('should exclude inherited APIs when includeInherited is false', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockJsonResponse);

      const result = await handleGetRelatedApis(mockApiUrl, false, true, true);

      expect(result).not.toContain('## Inherits From');
      expect(result).not.toContain('Protocol1');
      expect(result).toContain('## Conforms To');
      expect(result).toContain('## See Also');
    });

    it('should exclude conformance when includeConformance is false', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockJsonResponse);

      const result = await handleGetRelatedApis(mockApiUrl, true, false, true);

      expect(result).toContain('## Inherits From');
      expect(result).not.toContain('## Conforms To');
      expect(result).not.toContain('Protocol2');
      expect(result).toContain('## See Also');
    });

    it('should exclude see also when includeSeeAlso is false', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockJsonResponse);

      const result = await handleGetRelatedApis(mockApiUrl, true, true, false);

      expect(result).toContain('## Inherits From');
      expect(result).toContain('## Conforms To');
      expect(result).not.toContain('## See Also');
      expect(result).not.toContain('Text');
    });

    it('should handle APIs with no relationships', async () => {
      const noRelationshipsResponse = {
        identifier: 'swiftui/view',
        title: 'View',
        metadata: { roleHeading: 'Protocol' },
        references: {},
      };

      mockHttpClient.getJson.mockResolvedValue(noRelationshipsResponse);

      const result = await handleGetRelatedApis(mockApiUrl);

      expect(result).toContain('No related APIs found for:');
      expect(result).toContain(mockApiUrl);
    });

    it('should handle invalid URL', async () => {
      mockConvertToJsonApiUrl.mockReturnValue(null);

      const result = await handleGetRelatedApis('invalid-url');
      
      expect(result).toContain('Error: Failed to get related APIs:');
      expect(result).toContain('Invalid Apple Developer Documentation URL');
    });

    it('should handle fetch errors', async () => {
      mockHttpClient.getJson.mockRejectedValue(new Error('Network error'));

      const result = await handleGetRelatedApis(mockApiUrl);
      
      expect(result).toContain('Error: Failed to get related APIs:');
      expect(result).toContain('Network error');
    });

    it('should handle malformed JSON response', async () => {
      mockHttpClient.getJson.mockResolvedValue({ invalid: 'response' });

      const result = await handleGetRelatedApis(mockApiUrl);

      expect(result).toContain('No related APIs found for:');
    });

    it('should format complex relationships correctly', async () => {
      const complexResponse = {
        identifier: 'swiftui/view',
        title: 'View',
        metadata: { 
          roleHeading: 'Protocol',
          platforms: [
            { name: 'iOS', introducedAt: '13.0' },
            { name: 'macOS', introducedAt: '10.15' },
          ],
        },
        relationshipsSections: [
          {
            type: 'conformingTypes',
            title: 'Conforming Types',
            identifiers: ['swiftui/anyview', 'swiftui/emptyview'],
          },
        ],
        references: {
          'swiftui/anyview': {
            title: 'AnyView',
            url: '/documentation/swiftui/anyview',
            abstract: [{ type: 'text', text: 'A type-erased view.' }],
            kind: 'symbol',
          },
          'swiftui/emptyview': {
            title: 'EmptyView',
            url: '/documentation/swiftui/emptyview',
            abstract: [{ type: 'text', text: 'A view that doesn\'t display anything.' }],
            kind: 'symbol',
          },
        },
      };

      mockHttpClient.getJson.mockResolvedValue(complexResponse);

      const result = await handleGetRelatedApis(mockApiUrl);

      expect(result).toContain('# Related APIs for view');
      expect(result).toContain('**Found 2 related APIs:**');
      expect(result).toContain('## Conforming Types');
      expect(result).toContain('[AnyView]');
      expect(result).toContain('A type-erased view.');
      expect(result).toContain('[EmptyView]');
      expect(result).toContain('A view that doesn\'t display anything.');
    });
  });
});