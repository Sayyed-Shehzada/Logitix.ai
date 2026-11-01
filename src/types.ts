export type ActiveView =
  | 'chat-studio'
  | 'google-slides'
  | 'manus-agent'
  | 'research-search'
  | 'notes-artifacts'
  | 'outbox-dashboard'
  | 'memory-context'
  | 'voicespark'
  | 'settings-security'
  | 'design-system';

export type SlideLayoutType =
  | 'TITLE'
  | 'TITLE_AND_BODY'
  | 'TWO_COLUMNS'
  | 'METRIC_HIGHLIGHT'
  | 'COMPARISON'
  | 'TIMELINE'
  | 'CONCLUSION';

export interface SlideItem {
  id: string;
  slideNumber: number;
  title: string;
  subtitle?: string;
  bullets?: string[];
  leftColumn?: string[];
  rightColumn?: string[];
  metric?: { value: string; label: string; trend?: string };
  callout?: string;
  notes?: string;
  layout: SlideLayoutType;
  imageUrl?: string;
  imagePrompt?: string;
  imageCaption?: string;
}

export type TemplateCategoryType = 'Executive' | 'Technical' | 'Creative';

export interface SlideTemplateDefinition {
  id: TemplateCategoryType;
  title: string;
  tagline: string;
  badge: string;
  description: string;
  recommendedTheme: 'Modern Indigo' | 'Executive Obsidian' | 'Emerald Growth' | 'Cobalt Enterprise' | 'Minimalist Coral';
  recommendedTone: 'Strategic & Authoritative' | 'Persuasive Pitch' | 'Technical & Rigorous' | 'Inspiring & Visionary';
  recommendedAudience: 'Executive / Board' | 'Technical Engineering' | 'Investors & VC' | 'Customers & Sales' | 'Internal Team';
  accentColor: string;
  bgGradient: string;
  layoutSequence: Array<{
    slideNumber: number;
    title: string;
    layout: SlideLayoutType;
    purpose: string;
  }>;
  suggestedPrompts: string[];
}

export interface ColorPaletteSuggestion {
  id: string;
  name: string;
  category: string;
  reason: string;
  primaryAccent: string;
  secondaryAccent: string;
  surfaceBg: string;
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  bodyColor: string;
  tagBg: string;
  tagText: string;
  gradient: string;
  isDark: boolean;
}

export interface TypographyStyleSuggestion {
  id: string;
  name: string;
  headlineFont: string;
  bodyFont: string;
  codeFont?: string;
  headlineWeight: string;
  letterSpacing: string;
  characterMood: string;
  description: string;
}

export interface TopicStyleSuggestion {
  topicKey: string;
  confidence: number;
  detectedCategory: string;
  summaryExplanation: string;
  palette: ColorPaletteSuggestion;
  alternativePalettes: ColorPaletteSuggestion[];
  typography: TypographyStyleSuggestion;
  alternativeTypography: TypographyStyleSuggestion[];
}

export interface PresentationConditions {
  slideCount: number;
  templateCategory?: TemplateCategoryType;
  audience: 'Executive / Board' | 'Technical Engineering' | 'Investors & VC' | 'Customers & Sales' | 'Internal Team';
  tone: 'Strategic & Authoritative' | 'Persuasive Pitch' | 'Technical & Rigorous' | 'Inspiring & Visionary';
  theme: 'Modern Indigo' | 'Executive Obsidian' | 'Emerald Growth' | 'Cobalt Enterprise' | 'Minimalist Coral';
  customPalette?: ColorPaletteSuggestion;
  customTypography?: TypographyStyleSuggestion;
  includeMetrics: boolean;
  includeArchitecture: boolean;
  includeTakeaways: boolean;
  customConstraints?: string;
}

export interface PresentationDeckPlan {
  id: string;
  title: string;
  subtitle?: string;
  prompt: string;
  conditions: PresentationConditions;
  slides: SlideItem[];
  palette?: ColorPaletteSuggestion;
  typography?: TypographyStyleSuggestion;
  googlePresentationId?: string;
  googlePresentationUrl?: string;
  embedUrl?: string;
  createdAt: string;
}

export type LayoutOptimizationActionType =
  | 'CONVERT_TWO_COLUMNS'
  | 'SPLIT_INTO_TWO_SLIDES'
  | 'CONDENSE_TO_SPEAKER_NOTES'
  | 'CONVERT_TIMELINE'
  | 'CONVERT_METRIC_HIGHLIGHT';

export interface LayoutOptimizationSuggestion {
  id: string;
  type: LayoutOptimizationActionType;
  title: string;
  description: string;
  badge: string;
  tagline: string;
  templateBenefit: string;
  recommended: boolean;
}

export interface SlideDensityAnalysis {
  slideId: string;
  slideNumber: number;
  slideTitle: string;
  layout: SlideLayoutType;
  bulletCount: number;
  totalChars: number;
  hasImage: boolean;
  hasMetric: boolean;
  hasCallout: boolean;
  capacityScore: number; // 0-100% normal, >100% overflow
  status: 'OPTIMAL' | 'MODERATE_OVERFLOW' | 'CRITICAL_OVERFLOW';
  reason: string;
  metricDetails?: {
    estimatedLineCount: number;
    maxRecommendedLines: number;
  };
  suggestions: LayoutOptimizationSuggestion[];
}

export interface DeckOptimizationReport {
  totalSlides: number;
  optimizedSlidesCount: number;
  overflowSlidesCount: number;
  criticalCount: number;
  templateCategory: TemplateCategoryType;
  slideAnalyses: SlideDensityAnalysis[];
}

export interface MemoryItem {
  id: string;
  title: string;
  detail: string;
  color?: 'primary' | 'secondary' | 'tertiary';
  category?: string;
  content?: string;
  tags?: string[];
  timestamp?: string;
}

export interface CitationItem {
  domain: string;
  score: string;
  title: string;
  description: string;
  ref: string;
  type: string;
}

export interface FailureModeItem {
  vector: string;
  icon: string;
  localSqlite: string;
  remoteDrive: string;
  mitigation: string;
}

export interface OutboxTransaction {
  id: string;
  operation: string;
  retryStack: string;
  targetCluster: string;
  status: 'COMMITTED' | 'PENDING' | 'RETRYING';
}

export interface ShardMetric {
  id: number;
  name: string;
  cluster: string;
  host: string;
  throughputReqs: number;
  writesSec: number;
  cpuPercent: number;
  walRateMbSec: number;
  connPoolActive: number;
  connPoolMax: number;
  iops: number;
  deadTuplesPct: number;
  lsnDeltaBytes: number;
  cdcLagMs: number;
  status: 'OPTIMAL' | 'REBALANCING' | 'FAILOVER' | 'DEGRADED';
  activePartition: string;
}

export interface KafkaPartitionMetric {
  partitionId: number;
  leaderBroker: string;
  logEndOffset: number;
  consumerOffset: number;
  lag: number;
  ingressMsgSec: number;
  delayMs: number;
  consumerGroup?: string;
  assignedConsumer?: string;
  exceedsThreshold?: boolean;
  status: 'healthy' | 'elevated' | 'critical';
}

export interface ConsumerGroupMetric {
  groupId: string;
  consumerCount: number;
  totalLag: number;
  topic: string;
  assignedPartitions: number;
  status: 'STABLE' | 'REBALANCING' | 'CATCHING_UP';
}

export interface RedisClusterNode {
  nodeId: string;
  role: 'master' | 'replica';
  host: string;
  hitRate: number;
  opsSec: number;
  memoryUsedMb: number;
  memoryMaxMb: number;
  fragmentationRatio: number;
  latencyP99Ms: number;
}

export interface OutboxArchitectureHealth {
  timestamp: string;
  totalIngressReqs: number;
  targetIngressReqs: number;
  totalStorageWritesSec: number;
  ingressLatencyP99Ms: number;
  publishLatencyP99Ms: number;
  redisLatencyP99Ms: number;
  redisHitRatePct: number;
  redisChecksSec: number;
  redisDedupInterceptsSec: number;
  redisNewLeasesSec: number;
  redisConflictRatePct: number;
  kafkaTotalLag: number;
  kafkaMaxLag: number;
  kafkaMaxLagPartition: number;
  kafkaPublishRateSec: number;
  cdcWorkersActive: number;
  cdcLagAvgMs: number;
  systemStatus: 'OPTIMAL' | 'SURGE_BUFFERING' | 'FAILOVER_ACTIVE' | 'INVESTIGATING';
  shards: ShardMetric[];
  kafkaPartitions: KafkaPartitionMetric[];
  consumerGroups: ConsumerGroupMetric[];
  redisNodes: RedisClusterNode[];
}

export interface ModelEngine {
  id: string;
  name: string;
  badge: string;
  role: string;
  status: 'ONLINE' | 'STANDBY';
  color: string;
}

/* =========================================================
   Compatibility & Extended System Types
   ========================================================= */

export type ViewMode =
  | 'chat'
  | 'manus_ai'
  | 'hardware_twin'
  | 'branching_workspace'
  | 'consensus_matrix'
  | 'neural_graph'
  | 'notepad'
  | 'school_companion'
  | 'browser'
  | 'google_search'
  | 'google_chat'
  | 'email'
  | 'settings'
  | 'cyber_canvas'
  | 'welcome'
  | 'google_ai_studio'
  | (string & {});

export interface UserProfile {
  name: string;
  email?: string;
  avatar?: string;
  picture?: string;
  role?: string;
  dob?: string;
  phone?: string;
  [key: string]: any;
}

export interface UserSecurity {
  email: string;
  passwordHash?: string;
  hasPassword?: boolean;
  createdAt?: number;
  lastLoginAt?: number;
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: any;
  attachments?: any[];
  [key: string]: any;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelsConsensus?: string[];
  codeSnippet?: string;
  showFailureModes?: boolean;
  showOutbox?: boolean;
  latency?: number; // Response time in ms
}

export interface Conversation {
  id: string;
  title: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  messages?: ChatMessage[];
  tags?: string[];
  [key: string]: any;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  tags?: string[];
  [key: string]: any;
}

export interface EmailMessage {
  id: string;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  timestamp?: number | string;
  [key: string]: any;
}

export interface ChatAttachment {
  id?: string;
  name?: string;
  type?: string;
  url?: string;
  data?: any;
  [key: string]: any;
}

export interface SchoolAttendanceRecord {
  id: string;
  date: string;
  status: string;
  [key: string]: any;
}

export interface SchoolHomeworkItem {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  completed?: boolean;
  [key: string]: any;
}

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'manus' | string;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: any;
  [key: string]: any;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'directory';
  children?: FileNode[];
  [key: string]: any;
}

export interface ExecutionReceipt {
  id?: string;
  receiptId?: string;
  timestamp?: number | string;
  status?: string;
  [key: string]: any;
}

export interface RecentActivityOperation {
  id: string;
  type: 'presentation' | 'memory' | 'pdf' | 'chat' | 'manus' | 'research' | 'voice' | 'settings';
  title: string;
  description: string;
  timestamp: string;
  createdAt: number;
  view: ActiveView;
  payload?: {
    prompt?: string;
    conditions?: any;
    query?: string;
    memoryId?: string;
    artifactId?: string;
    category?: string;
    [key: string]: any;
  };
  icon: string;
  badge: string;
  badgeColor?: string;
}
