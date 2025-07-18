/**
 * WWDC视频数据类型定义
 */

/**
 * Transcript段落
 */
export interface TranscriptSegment {
  timestamp: string;  // "00:00" 格式
  text: string;
}

/**
 * Transcript数据
 */
export interface TranscriptData {
  fullText: string;
  segments: TranscriptSegment[];
}

/**
 * 代码示例
 */
export interface CodeExample {
  timestamp?: string;  // "05:30" 格式，可能没有
  title?: string;      // 代码标题或描述
  language: string;    // "swift", "objc", "javascript" 等
  code: string;        // 代码内容
  context?: string;    // 代码上下文说明
}

/**
 * 资源链接
 */
export interface ResourceLink {
  title: string;
  url: string;
}

/**
 * 视频资源
 */
export interface VideoResources {
  hdVideo?: string;        // HD视频下载链接
  sdVideo?: string;        // SD视频下载链接
  sampleProject?: string;  // 示例项目下载链接
  slides?: string;         // 演示文稿下载链接
  resourceLinks?: ResourceLink[];  // 资源链接
}

/**
 * 相关视频
 */
export interface RelatedVideo {
  id: string;
  year: string;
  title: string;
  url: string;
}

/**
 * WWDC视频数据
 */
export interface WWDCVideo {
  id: string;              // 视频ID，如 "238"
  year: string;            // 年份，如 "2025"
  url: string;             // 完整URL
  title: string;           // 视频标题
  speakers?: string[];     // 演讲者列表
  duration: string;        // 时长，如 "15:30"
  topics: string[];        // 主题标签（标准分类）
  hasTranscript: boolean;  // 是否有transcript
  hasCode: boolean;        // 是否有代码示例
  transcript?: TranscriptData;
  codeExamples?: CodeExample[];
  chapters?: Chapter[];    // 章节信息
  resources: VideoResources;
  relatedVideos?: RelatedVideo[];  // 相关视频
  extractedAt?: string;    // 提取时间 ISO 8601
}

/**
 * 视频章节
 */
export interface Chapter {
  title: string;
  timestamp: string;
  duration?: string;
}

/**
 * 年份元数据
 */
export interface YearMetadata {
  year: string;
  totalVideos: number;
  hasCodeTab: boolean;     // 该年份是否有独立的Code标签页
  extractedAt: string;
  lastUpdated?: string;
}

/**
 * WWDC年份数据
 */
export interface WWDCYearData {
  metadata: YearMetadata;
  videos: WWDCVideo[];
}

/**
 * 全局元数据
 */
export interface GlobalMetadata {
  version: string;
  lastUpdated: string;
  totalVideos: number;
  topics: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  years: string[];
  statistics: {
    byTopic: Record<string, number>;
    byYear: Record<string, number>;
    videosWithCode: number;
    videosWithTranscript: number;
    videosWithResources: number;
  };
}

/**
 * 主题索引
 */
export interface TopicIndex {
  id: string;
  name: string;
  videoCount: number;
  years: string[];
  videos: Array<{
    id: string;
    year: string;
    title: string;
    topics: string[];
    duration: string;
    hasCode: boolean;
    hasTranscript: boolean;
    url: string;
    dataFile: string;
  }>;
}

/**
 * 年份索引
 */
export interface YearIndex {
  year: string;
  videoCount: number;
  topics: string[];
  videos: Array<{
    id: string;
    year: string;
    title: string;
    topics: string[];
    duration: string;
    hasCode: boolean;
    hasTranscript: boolean;
    url: string;
    dataFile: string;
  }>;
}

/**
 * 完整的WWDC数据集
 */
export interface WWDCDataset {
  wwdc: Record<string, WWDCYearData>;
  globalMetadata: GlobalMetadata;
}

/**
 * 视频列表项（用于列表页提取）
 */
export interface VideoListItem {
  id: string;
  url: string;
  title: string;
  duration?: string;
  thumbnail?: string;
}

/**
 * 提取配置
 */
export interface ExtractorConfig {
  year: string;
  concurrency?: number;    // 并发数，默认5
  retryAttempts?: number;  // 重试次数，默认3
  timeout?: number;        // 超时时间（毫秒）
  skipExisting?: boolean;  // 跳过已存在的视频
}

/**
 * 提取进度
 */
export interface ExtractProgress {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  currentVideo?: string;
  errors: Array<{
    videoId: string;
    error: string;
  }>;
}