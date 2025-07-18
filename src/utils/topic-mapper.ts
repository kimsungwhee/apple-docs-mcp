/**
 * WWDC video topic classification mapping
 */

// Standard topic categories (based on Apple's official categories)
export const STANDARD_TOPICS = [
  'Accessibility & Inclusion',
  'App Services',
  'App Store, Distribution & Marketing',
  'Audio & Video',
  'Business & Education',
  'Design',
  'Developer Tools',
  'Essentials',
  'Graphics & Games',
  'Health & Fitness',
  'Maps & Location',
  'Machine Learning & AI',
  'Photos & Camera',
  'Privacy & Security',
  'Safari & Web',
  'Spatial Computing',
  'Swift',
  'SwiftUI & UI Frameworks',
  'System Services',
] as const;

export type StandardTopic = typeof STANDARD_TOPICS[number];

// Keywords to topic mapping
const TOPIC_KEYWORDS: Record<string, StandardTopic[]> = {
  // Accessibility & Inclusion
  'accessibility': ['Accessibility & Inclusion'],
  'voiceover': ['Accessibility & Inclusion'],
  'inclusion': ['Accessibility & Inclusion'],
  'assistive': ['Accessibility & Inclusion'],

  // App Services
  'cloudkit': ['App Services'],
  'push notification': ['App Services'],
  'app intents': ['App Services'],
  'siri': ['App Services'],
  'widgets': ['App Services'],
  'app shortcuts': ['App Services'],

  // App Store, Distribution & Marketing
  'app store': ['App Store, Distribution & Marketing'],
  'testflight': ['App Store, Distribution & Marketing'],
  'app review': ['App Store, Distribution & Marketing'],
  'marketing': ['App Store, Distribution & Marketing'],
  'app analytics': ['App Store, Distribution & Marketing'],

  // Audio & Video
  'avfoundation': ['Audio & Video'],
  'audio': ['Audio & Video'],
  'video': ['Audio & Video'],
  'media': ['Audio & Video'],
  'streaming': ['Audio & Video'],
  'hls': ['Audio & Video'],

  // Business & Education
  'business': ['Business & Education'],
  'education': ['Business & Education'],
  'classroom': ['Business & Education'],
  'enterprise': ['Business & Education'],

  // Design
  'design': ['Design'],
  'ui': ['Design', 'SwiftUI & UI Frameworks'],
  'ux': ['Design'],
  'human interface': ['Design'],
  'sf symbols': ['Design'],

  // Developer Tools
  'xcode': ['Developer Tools'],
  'swift package': ['Developer Tools'],
  'instruments': ['Developer Tools'],
  'debugging': ['Developer Tools'],
  'testing': ['Developer Tools'],
  'swift testing': ['Developer Tools', 'Swift'],

  // Graphics & Games
  'metal': ['Graphics & Games'],
  'game': ['Graphics & Games'],
  'graphics': ['Graphics & Games'],
  'realitykit': ['Graphics & Games', 'Spatial Computing'],
  'scenekit': ['Graphics & Games'],

  // Health & Fitness
  'healthkit': ['Health & Fitness'],
  'workout': ['Health & Fitness'],
  'carekit': ['Health & Fitness'],
  'researchkit': ['Health & Fitness'],

  // Machine Learning & AI
  'machine learning': ['Machine Learning & AI'],
  'ml': ['Machine Learning & AI'],
  'core ml': ['Machine Learning & AI'],
  'create ml': ['Machine Learning & AI'],
  'ai': ['Machine Learning & AI'],
  'intelligence': ['Machine Learning & AI'],

  // Maps & Location
  'mapkit': ['Maps & Location'],
  'location': ['Maps & Location'],
  'maps': ['Maps & Location'],
  'core location': ['Maps & Location'],

  // Photos & Camera
  'photos': ['Photos & Camera'],
  'camera': ['Photos & Camera'],
  'image': ['Photos & Camera'],
  'photokit': ['Photos & Camera'],

  // Privacy & Security
  'privacy': ['Privacy & Security'],
  'security': ['Privacy & Security'],
  'keychain': ['Privacy & Security'],
  'encryption': ['Privacy & Security'],

  // Safari & Web
  'safari': ['Safari & Web'],
  'webkit': ['Safari & Web'],
  'web': ['Safari & Web'],
  'javascript': ['Safari & Web'],
  'wkwebview': ['Safari & Web'],

  // Spatial Computing
  'visionos': ['Spatial Computing'],
  'spatial': ['Spatial Computing'],
  'ar': ['Spatial Computing'],
  'arkit': ['Spatial Computing'],
  'reality': ['Spatial Computing'],

  // Swift
  'swift': ['Swift'],
  'swiftdata': ['Swift'],
  'concurrency': ['Swift'],
  'async': ['Swift'],
  'actor': ['Swift'],

  // SwiftUI & UI Frameworks
  'swiftui': ['SwiftUI & UI Frameworks'],
  'uikit': ['SwiftUI & UI Frameworks'],
  'appkit': ['SwiftUI & UI Frameworks'],
  'catalyst': ['SwiftUI & UI Frameworks'],

  // System Services
  'foundation': ['System Services'],
  'core data': ['System Services'],
  'file system': ['System Services'],
  'networking': ['System Services'],
  'background': ['System Services'],
};

/**
 * Infer topic categories based on video title and content
 */
export function inferTopics(title: string, description?: string): StandardTopic[] {
  const topics = new Set<StandardTopic>();
  const searchText = `${title} ${description || ''}`.toLowerCase();

  // Iterate through all keywords
  for (const [keyword, mappedTopics] of Object.entries(TOPIC_KEYWORDS)) {
    if (searchText.includes(keyword.toLowerCase())) {
      mappedTopics.forEach(topic => topics.add(topic));
    }
  }

  // If no topics found, return Essentials as default
  if (topics.size === 0) {
    topics.add('Essentials');
  }

  return Array.from(topics);
}

/**
 * Validate if a topic is a standard topic
 */
export function isStandardTopic(topic: string): topic is StandardTopic {
  return STANDARD_TOPICS.includes(topic as StandardTopic);
}

/**
 * Normalize topic name to standard format
 */
export function normalizeTopicName(topic: string): StandardTopic | null {
  // First check if it's already a standard topic
  if (isStandardTopic(topic)) {
    return topic;
  }

  // Try exact match (case-insensitive)
  const lowerTopic = topic.toLowerCase();
  for (const standardTopic of STANDARD_TOPICS) {
    if (standardTopic.toLowerCase() === lowerTopic) {
      return standardTopic;
    }
  }

  // Try partial match
  for (const standardTopic of STANDARD_TOPICS) {
    if (standardTopic.toLowerCase().includes(lowerTopic) ||
        lowerTopic.includes(standardTopic.toLowerCase())) {
      return standardTopic;
    }
  }

  return null;
}