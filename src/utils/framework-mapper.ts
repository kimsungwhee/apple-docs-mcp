/**
 * Unified framework name mapping system for Apple Docs MCP
 *
 * This module provides consistent framework name normalization across all tools.
 * It handles common variations, typos, and alternative names for Apple frameworks.
 */

/**
 * Comprehensive framework name mappings
 * Maps lowercase/alternative names to canonical Apple framework names
 */
export const FRAMEWORK_MAPPINGS: Record<string, string> = {
  // UI Frameworks
  'swiftui': 'SwiftUI',
  'swift-ui': 'SwiftUI',
  'swift_ui': 'SwiftUI',
  'uikit': 'UIKit',
  'ui-kit': 'UIKit',
  'ui_kit': 'UIKit',
  'appkit': 'AppKit',
  'app-kit': 'AppKit',
  'app_kit': 'AppKit',
  'widgetkit': 'WidgetKit',
  'widget-kit': 'WidgetKit',
  'widget_kit': 'WidgetKit',
  'watchkit': 'WatchKit',
  'watch-kit': 'WatchKit',
  'watch_kit': 'WatchKit',
  'tvuikit': 'TVUIKit',
  'tv-ui-kit': 'TVUIKit',
  'tv_ui_kit': 'TVUIKit',

  // Foundation & Core
  'foundation': 'Foundation',
  'combine': 'Combine',
  'swift': 'Swift',
  'swiftlang': 'Swift',
  'objective-c': 'Objective-C',
  'objc': 'Objective-C',
  'objectivec': 'Objective-C',
  'cocoa': 'Cocoa',
  'cocoatouch': 'Cocoa Touch',
  'cocoa-touch': 'Cocoa Touch',
  'cocoa_touch': 'Cocoa Touch',

  // Data & Storage
  'coredata': 'Core Data',
  'core-data': 'Core Data',
  'core_data': 'Core Data',
  'cloudkit': 'CloudKit',
  'cloud-kit': 'CloudKit',
  'cloud_kit': 'CloudKit',
  'userdefaults': 'UserDefaults',
  'user-defaults': 'UserDefaults',
  'user_defaults': 'UserDefaults',
  'keychain': 'Keychain Services',
  'keychainservices': 'Keychain Services',
  'keychain-services': 'Keychain Services',
  'keychain_services': 'Keychain Services',
  'sqlite': 'SQLite',
  'fmdb': 'SQLite',

  // Graphics & Games
  'arkit': 'ARKit',
  'ar-kit': 'ARKit',
  'ar_kit': 'ARKit',
  'realitykit': 'RealityKit',
  'reality-kit': 'RealityKit',
  'reality_kit': 'RealityKit',
  'scenekit': 'SceneKit',
  'scene-kit': 'SceneKit',
  'scene_kit': 'SceneKit',
  'spritekit': 'SpriteKit',
  'sprite-kit': 'SpriteKit',
  'sprite_kit': 'SpriteKit',
  'gamekit': 'GameKit',
  'game-kit': 'GameKit',
  'game_kit': 'GameKit',
  'gameplaykit': 'GameplayKit',
  'gameplay-kit': 'GameplayKit',
  'gameplay_kit': 'GameplayKit',
  'gamecenter': 'Game Center',
  'game-center': 'Game Center',
  'game_center': 'Game Center',
  'metal': 'Metal',
  'metalkit': 'MetalKit',
  'metal-kit': 'MetalKit',
  'metal_kit': 'MetalKit',
  'metalperformanceshaders': 'Metal Performance Shaders',
  'metal-performance-shaders': 'Metal Performance Shaders',
  'metal_performance_shaders': 'Metal Performance Shaders',
  'mps': 'Metal Performance Shaders',
  'coregraphics': 'Core Graphics',
  'core-graphics': 'Core Graphics',
  'core_graphics': 'Core Graphics',
  'cg': 'Core Graphics',
  'coreimage': 'Core Image',
  'core-image': 'Core Image',
  'core_image': 'Core Image',
  'ci': 'Core Image',
  'coreanimation': 'Core Animation',
  'core-animation': 'Core Animation',
  'core_animation': 'Core Animation',
  'quartzcore': 'Core Animation',
  'quartz-core': 'Core Animation',
  'quartz_core': 'Core Animation',
  'vision': 'Vision',
  'visionkit': 'VisionKit',
  'vision-kit': 'VisionKit',
  'vision_kit': 'VisionKit',
  'imageio': 'Image I/O',
  'image-io': 'Image I/O',
  'image_io': 'Image I/O',

  // Media & Audio
  'avfoundation': 'AVFoundation',
  'av-foundation': 'AVFoundation',
  'av_foundation': 'AVFoundation',
  'avkit': 'AVKit',
  'av-kit': 'AVKit',
  'av_kit': 'AVKit',
  'coreaudio': 'Core Audio',
  'core-audio': 'Core Audio',
  'core_audio': 'Core Audio',
  'coremidi': 'Core MIDI',
  'core-midi': 'Core MIDI',
  'core_midi': 'Core MIDI',
  'audiotoolbox': 'Audio Toolbox',
  'audio-toolbox': 'Audio Toolbox',
  'audio_toolbox': 'Audio Toolbox',
  'audiounit': 'AudioUnit',
  'audio-unit': 'AudioUnit',
  'audio_unit': 'AudioUnit',
  'musickit': 'MusicKit',
  'music-kit': 'MusicKit',
  'music_kit': 'MusicKit',
  'mediaplayer': 'Media Player',
  'media-player': 'Media Player',
  'media_player': 'Media Player',
  'photokit': 'PhotoKit',
  'photo-kit': 'PhotoKit',
  'photo_kit': 'PhotoKit',
  'photos': 'PhotoKit',
  'photosui': 'PhotosUI',
  'photos-ui': 'PhotosUI',
  'photos_ui': 'PhotosUI',

  // Services & APIs
  'storekit': 'StoreKit',
  'store-kit': 'StoreKit',
  'store_kit': 'StoreKit',
  'storekit2': 'StoreKit',
  'store-kit-2': 'StoreKit',
  'store_kit_2': 'StoreKit',
  'healthkit': 'HealthKit',
  'health-kit': 'HealthKit',
  'health_kit': 'HealthKit',
  'homekit': 'HomeKit',
  'home-kit': 'HomeKit',
  'home_kit': 'HomeKit',
  'mapkit': 'MapKit',
  'map-kit': 'MapKit',
  'map_kit': 'MapKit',
  'corelocation': 'Core Location',
  'core-location': 'Core Location',
  'core_location': 'Core Location',
  'pushkit': 'PushKit',
  'push-kit': 'PushKit',
  'push_kit': 'PushKit',
  'usernotifications': 'User Notifications',
  'user-notifications': 'User Notifications',
  'user_notifications': 'User Notifications',
  'notificationcenter': 'Notification Center',
  'notification-center': 'Notification Center',
  'notification_center': 'Notification Center',
  'eventkit': 'EventKit',
  'event-kit': 'EventKit',
  'event_kit': 'EventKit',
  'eventkitui': 'EventKitUI',
  'event-kit-ui': 'EventKitUI',
  'event_kit_ui': 'EventKitUI',
  'contacts': 'Contacts',
  'contactsui': 'ContactsUI',
  'contacts-ui': 'ContactsUI',
  'contacts_ui': 'ContactsUI',
  'messageui': 'MessageUI',
  'message-ui': 'MessageUI',
  'message_ui': 'MessageUI',
  'messages': 'Messages',
  'callkit': 'CallKit',
  'call-kit': 'CallKit',
  'call_kit': 'CallKit',

  // Machine Learning & AI
  'coreml': 'Core ML',
  'core-ml': 'Core ML',
  'core_ml': 'Core ML',
  'createml': 'Create ML',
  'create-ml': 'Create ML',
  'create_ml': 'Create ML',
  'naturallanguage': 'Natural Language',
  'natural-language': 'Natural Language',
  'natural_language': 'Natural Language',
  'nlp': 'Natural Language',
  'speech': 'Speech',
  'speechframework': 'Speech',
  'speech-framework': 'Speech',
  'speech_framework': 'Speech',
  'soundanalysis': 'Sound Analysis',
  'sound-analysis': 'Sound Analysis',
  'sound_analysis': 'Sound Analysis',

  // Networking
  'network': 'Network',
  'networkextension': 'Network Extension',
  'network-extension': 'Network Extension',
  'network_extension': 'Network Extension',
  'nsurlsession': 'URLSession',
  'urlsession': 'URLSession',
  'url-session': 'URLSession',
  'url_session': 'URLSession',
  'cfnetwork': 'CFNetwork',
  'cf-network': 'CFNetwork',
  'cf_network': 'CFNetwork',
  'bonjour': 'Bonjour',
  'netservice': 'Bonjour',
  'net-service': 'Bonjour',
  'net_service': 'Bonjour',

  // Security & Privacy
  'security': 'Security',
  'localauthentication': 'Local Authentication',
  'local-authentication': 'Local Authentication',
  'local_authentication': 'Local Authentication',
  'biometrics': 'Local Authentication',
  'touchid': 'Local Authentication',
  'touch-id': 'Local Authentication',
  'touch_id': 'Local Authentication',
  'faceid': 'Local Authentication',
  'face-id': 'Local Authentication',
  'face_id': 'Local Authentication',
  'cryptokit': 'CryptoKit',
  'crypto-kit': 'CryptoKit',
  'crypto_kit': 'CryptoKit',
  'apptrackingtransparency': 'App Tracking Transparency',
  'app-tracking-transparency': 'App Tracking Transparency',
  'app_tracking_transparency': 'App Tracking Transparency',
  'att': 'App Tracking Transparency',

  // System & Hardware
  'corebluetooth': 'Core Bluetooth',
  'core-bluetooth': 'Core Bluetooth',
  'core_bluetooth': 'Core Bluetooth',
  'bluetooth': 'Core Bluetooth',
  'ble': 'Core Bluetooth',
  'coremotion': 'Core Motion',
  'core-motion': 'Core Motion',
  'core_motion': 'Core Motion',
  'motion': 'Core Motion',
  'accelerometer': 'Core Motion',
  'gyroscope': 'Core Motion',
  'magnetometer': 'Core Motion',
  'devicemotion': 'Core Motion',
  'device-motion': 'Core Motion',
  'device_motion': 'Core Motion',
  'corenfc': 'Core NFC',
  'core-nfc': 'Core NFC',
  'core_nfc': 'Core NFC',
  'nfc': 'Core NFC',
  'corewlan': 'Core WLAN',
  'core-wlan': 'Core WLAN',
  'core_wlan': 'Core WLAN',
  'wifi': 'Core WLAN',
  'wlan': 'Core WLAN',

  // Development Tools
  'xctest': 'XCTest',
  'xc-test': 'XCTest',
  'xc_test': 'XCTest',
  'testing': 'XCTest',
  'unittest': 'XCTest',
  'unit-test': 'XCTest',
  'unit_test': 'XCTest',
  'xcode': 'Xcode',
  'instruments': 'Instruments',
  'simulator': 'Simulator',
  'playgrounds': 'Swift Playgrounds',
  'swift-playgrounds': 'Swift Playgrounds',
  'swift_playgrounds': 'Swift Playgrounds',
  'swift playgrounds': 'Swift Playgrounds',

  // watchOS Specific
  'watchconnectivity': 'Watch Connectivity',
  'watch-connectivity': 'Watch Connectivity',
  'watch_connectivity': 'Watch Connectivity',
  'clockkit': 'ClockKit',
  'clock-kit': 'ClockKit',
  'clock_kit': 'ClockKit',
  'complications': 'ClockKit',

  // tvOS Specific
  'tvservices': 'TVServices',
  'tv-services': 'TVServices',
  'tv_services': 'TVServices',
  'tvmlkit': 'TVMLKit',
  'tvml-kit': 'TVMLKit',
  'tvml_kit': 'TVMLKit',
  'tvml': 'TVMLKit',

  // macOS Specific
  'appstoreconnectapi': 'App Store Connect API',
  'app-store-connect-api': 'App Store Connect API',
  'app_store_connect_api': 'App Store Connect API',
  'automator': 'Automator',
  'applescript': 'AppleScript',
  'apple-script': 'AppleScript',
  'apple_script': 'AppleScript',
  'scriptingbridge': 'Scripting Bridge',
  'scripting-bridge': 'Scripting Bridge',
  'scripting_bridge': 'Scripting Bridge',
  'osascript': 'AppleScript',
  'collaboration': 'Collaboration',
  'discrecording': 'Disc Recording',
  'disc-recording': 'Disc Recording',
  'disc_recording': 'Disc Recording',
  'dvdplayback': 'DVD Playback',
  'dvd-playback': 'DVD Playback',
  'dvd_playback': 'DVD Playback',
  'findersync': 'FinderSync',
  'finder-sync': 'FinderSync',
  'finder_sync': 'FinderSync',
  'imagekit': 'ImageKit',
  'image-kit': 'ImageKit',
  'image_kit': 'ImageKit',
  'inputmethodkit': 'Input Method Kit',
  'input-method-kit': 'Input Method Kit',
  'input_method_kit': 'Input Method Kit',
  'instantmessage': 'Instant Message',
  'instant-message': 'Instant Message',
  'instant_message': 'Instant Message',
  'latentsemanticmapping': 'Latent Semantic Mapping',
  'latent-semantic-mapping': 'Latent Semantic Mapping',
  'latent_semantic_mapping': 'Latent Semantic Mapping',
  'lsm': 'Latent Semantic Mapping',
  'pubsub': 'PubSub',
  'pub-sub': 'PubSub',
  'pub_sub': 'PubSub',
  'quartz': 'Quartz',
  'quartzfilters': 'Quartz Filters',
  'quartz-filters': 'Quartz Filters',
  'quartz_filters': 'Quartz Filters',
  'quartzcomposer': 'Quartz Composer',
  'quartz-composer': 'Quartz Composer',
  'quartz_composer': 'Quartz Composer',
  'quicklook': 'Quick Look',
  'quick-look': 'Quick Look',
  'quick_look': 'Quick Look',
  'ql': 'Quick Look',
  'screensaver': 'Screen Saver',
  'screen-saver': 'Screen Saver',
  'screen_saver': 'Screen Saver',
  'searchkit': 'SearchKit',
  'search-kit': 'SearchKit',
  'search_kit': 'SearchKit',
  'servicemanagemnt': 'Service Management',
  'service-management': 'Service Management',
  'service_management': 'Service Management',
  'syncservices': 'Sync Services',
  'sync-services': 'Sync Services',
  'sync_services': 'Sync Services',
  'systemconfiguration': 'System Configuration',
  'system-configuration': 'System Configuration',
  'system_configuration': 'System Configuration',
  'systemextensions': 'System Extensions',
  'system-extensions': 'System Extensions',
  'system_extensions': 'System Extensions',
  'webkit': 'WebKit',
  'web-kit': 'WebKit',
  'web_kit': 'WebKit',
  'webkit2': 'WebKit',
  'web-kit-2': 'WebKit',
  'web_kit_2': 'WebKit',
} as const;

/**
 * Alternative framework names and common aliases
 */
export const FRAMEWORK_ALIASES: Record<string, string[]> = {
  'SwiftUI': ['swiftui', 'swift-ui', 'swift_ui'],
  'UIKit': ['uikit', 'ui-kit', 'ui_kit'],
  'AppKit': ['appkit', 'app-kit', 'app_kit'],
  'Core Data': ['coredata', 'core-data', 'core_data'],
  'CloudKit': ['cloudkit', 'cloud-kit', 'cloud_kit'],
  'Core Graphics': ['coregraphics', 'core-graphics', 'core_graphics', 'cg'],
  'Core Image': ['coreimage', 'core-image', 'core_image', 'ci'],
  'Core Animation': ['coreanimation', 'core-animation', 'core_animation', 'quartzcore'],
  'AVFoundation': ['avfoundation', 'av-foundation', 'av_foundation'],
  'Metal': ['metal'],
  'Vision': ['vision'],
  'Core ML': ['coreml', 'core-ml', 'core_ml'],
  'ARKit': ['arkit', 'ar-kit', 'ar_kit'],
  'RealityKit': ['realitykit', 'reality-kit', 'reality_kit'],
  'SceneKit': ['scenekit', 'scene-kit', 'scene_kit'],
  'SpriteKit': ['spritekit', 'sprite-kit', 'sprite_kit'],
  'GameKit': ['gamekit', 'game-kit', 'game_kit'],
  'HealthKit': ['healthkit', 'health-kit', 'health_kit'],
  'HomeKit': ['homekit', 'home-kit', 'home_kit'],
  'MapKit': ['mapkit', 'map-kit', 'map_kit'],
  'StoreKit': ['storekit', 'store-kit', 'store_kit'],
  'WebKit': ['webkit', 'web-kit', 'web_kit'],
} as const;

/**
 * Framework categories for organization
 */
export const FRAMEWORK_CATEGORIES = {
  'UI': ['SwiftUI', 'UIKit', 'AppKit', 'WidgetKit', 'WatchKit'],
  'Graphics': ['Core Graphics', 'Core Image', 'Core Animation', 'Metal'],
  'Games': ['ARKit', 'RealityKit', 'SceneKit', 'SpriteKit', 'GameKit'],
  'Media': ['AVFoundation', 'Core Audio', 'PhotoKit', 'MusicKit'],
  'Data': ['Core Data', 'CloudKit', 'UserDefaults', 'Keychain Services'],
  'ML': ['Core ML', 'Create ML', 'Natural Language', 'Vision', 'Speech'],
  'Services': ['HealthKit', 'HomeKit', 'MapKit', 'StoreKit'],
  'System': ['Core Bluetooth', 'Core Motion', 'Core Location'],
  'Foundation': ['Foundation', 'Combine', 'Swift'],
} as const;

/**
 * Normalize a framework name to its canonical Apple form
 *
 * @param framework - The framework name to normalize (case-insensitive)
 * @returns The canonical framework name, or the original if no mapping exists
 */
export function normalizeFrameworkName(framework: string): string {
  if (!framework || typeof framework !== 'string') {
    return '';
  }

  const trimmed = framework.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.toLowerCase();

  // Direct lookup in mappings
  if (FRAMEWORK_MAPPINGS[normalized]) {
    return FRAMEWORK_MAPPINGS[normalized];
  }

  // Try exact case match (for already canonical names)
  const exactMatch = Object.values(FRAMEWORK_MAPPINGS).find(
    canonical => canonical.toLowerCase() === normalized,
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Return original with proper casing (first letter capitalized)
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Get all possible aliases for a framework
 *
 * @param framework - The canonical framework name
 * @returns Array of all known aliases for the framework
 */
export function getFrameworkAliases(framework: string): string[] {
  const canonical = normalizeFrameworkName(framework);
  return FRAMEWORK_ALIASES[canonical] || [];
}

/**
 * Check if a framework name is valid (has a known mapping)
 *
 * @param framework - The framework name to check
 * @returns True if the framework is recognized
 */
export function isValidFramework(framework: string): boolean {
  if (!framework || typeof framework !== 'string') {
    return false;
  }

  const normalized = framework.trim().toLowerCase();
  return !!FRAMEWORK_MAPPINGS[normalized] ||
         Object.values(FRAMEWORK_MAPPINGS).some(
           canonical => canonical.toLowerCase() === normalized,
         );
}

/**
 * Get frameworks by category
 *
 * @param category - The category name
 * @returns Array of framework names in the category
 */
export function getFrameworksByCategory(category: keyof typeof FRAMEWORK_CATEGORIES): string[] {
  return [...(FRAMEWORK_CATEGORIES[category] || [])];
}

/**
 * Find the category of a framework
 *
 * @param framework - The framework name
 * @returns The category name or null if not found
 */
export function getFrameworkCategory(framework: string): keyof typeof FRAMEWORK_CATEGORIES | null {
  const canonical = normalizeFrameworkName(framework);

  for (const [category, frameworks] of Object.entries(FRAMEWORK_CATEGORIES)) {
    if ((frameworks as readonly string[]).includes(canonical)) {
      return category as keyof typeof FRAMEWORK_CATEGORIES;
    }
  }

  return null;
}

/**
 * Search for frameworks by partial name or description
 *
 * @param query - The search query
 * @returns Array of matching framework names
 */
export function searchFrameworks(query: string): string[] {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const searchTerm = query.trim().toLowerCase();
  const matches = new Set<string>();

  // Search in canonical names
  Object.values(FRAMEWORK_MAPPINGS).forEach(canonical => {
    if (canonical.toLowerCase().includes(searchTerm)) {
      matches.add(canonical);
    }
  });

  // Search in aliases
  Object.entries(FRAMEWORK_MAPPINGS).forEach(([alias, canonical]) => {
    if (alias.includes(searchTerm)) {
      matches.add(canonical);
    }
  });

  return Array.from(matches).sort();
}

/**
 * Get comprehensive framework information
 *
 * @param framework - The framework name
 * @returns Object with framework details
 */
export function getFrameworkInfo(framework: string): {
  canonical: string;
  aliases: string[];
  category: string | null;
  isValid: boolean;
} {
  const canonical = normalizeFrameworkName(framework);
  const aliases = getFrameworkAliases(canonical);
  const category = getFrameworkCategory(canonical);
  const isValid = isValidFramework(framework);

  return {
    canonical,
    aliases,
    category,
    isValid,
  };
}