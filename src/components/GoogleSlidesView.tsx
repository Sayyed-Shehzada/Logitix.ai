import React, { useState, useEffect, useMemo } from 'react';
import {
  PresentationDeckPlan,
  PresentationConditions,
  SlideItem,
  SlideLayoutType,
  UserProfile,
  TemplateCategoryType,
  SlideTemplateDefinition,
  LayoutOptimizationActionType,
  LayoutOptimizationSuggestion,
  SlideDensityAnalysis,
  DeckOptimizationReport,
  ColorPaletteSuggestion,
  TypographyStyleSuggestion,
  TopicStyleSuggestion,
} from '../types';
import {
  suggestStylesForTopic,
  CURATED_PALETTES,
  CURATED_TYPOGRAPHY,
} from '../lib/topicStyleService';
import {
  buildPresentationInGoogleSlides,
  generateSlideDeckOutline,
  listUserGoogleSlides,
  deletePresentationFromDrive,
  SLIDE_TEMPLATES,
  generateSlideVisual,
} from '../lib/googleSlidesService';
import { SLIDE_VISUAL_PRESETS, SlideVisualPreset } from '../lib/slideVisualPresets';
import {
  signInForGoogleSlides,
  getCachedAccessToken,
  googleSignOut,
  auth,
} from '../lib/googleAuth';
import {
  exportDeckToPDF,
  exportDeckToPPTX,
  getGoogleSlidesExportUrl,
} from '../lib/slideExportService';
import {
  analyzeSlideDensity,
  analyzeDeckDensity,
  applyOptimization,
  batchOptimizeDeck,
} from '../lib/slideLayoutOptimizer';
import {
  CollaboratorUser,
  SlideCommentThread,
  CommentCategory,
} from '../types/collaborator';
import {
  INITIAL_COLLABORATORS,
  CURRENT_USER,
  getDeckComments,
  saveDeckComments,
  createSimulatedComment,
} from '../lib/collaboratorService';
import { CollaboratorDeckView } from './collaborator/CollaboratorDeckView';
import { CollaboratorDiscussionPanel } from './collaborator/CollaboratorDiscussionPanel';
import { SlideCommentPinOverlay } from './collaborator/SlideCommentPinOverlay';
import { CollaboratorPresenceBar } from './collaborator/CollaboratorPresenceBar';
import {
  Sparkles,
  ExternalLink,
  Layers,
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Share2,
  MessageSquare,
  Copy,
  Check,
  Zap,
  ArrowRight,
  BarChart,
  Target,
  Users,
  Palette,
  Clock,
  Shield,
  HelpCircle,
  Edit3,
  ChevronUp,
  ChevronDown,
  Download,
  BookOpen,
  Briefcase,
  Cpu,
  LayoutTemplate,
  X,
  Info,
  Image as ImageIcon,
  BarChart2,
  PieChart,
  Wand2,
  Maximize2,
  Gauge,
  AlertTriangle,
  Type,
} from 'lucide-react';

interface GoogleSlidesViewProps {
  currentUser?: UserProfile | null;
  onShowToast?: (message: string) => void;
  onNavigateToOutbox?: () => void;
  initialPrompt?: string;
  initialConditions?: Partial<PresentationConditions>;
  onRecordActivity?: (operation: any) => void;
}

export const GoogleSlidesView: React.FC<GoogleSlidesViewProps> = ({
  currentUser,
  onShowToast,
  onNavigateToOutbox,
  initialPrompt,
  initialConditions,
  onRecordActivity,
}) => {
  // Google Auth & Access Token State
  const [accessToken, setAccessToken] = useState<string | null>(() => getCachedAccessToken());
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'creator' | 'collaborator' | 'library'>('creator');

  // Presentation Prompt & Conditions
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCategoryType>(
    (initialConditions?.templateCategory as TemplateCategoryType) || 'Executive'
  );
  const [previewingTemplateBlueprint, setPreviewingTemplateBlueprint] = useState<TemplateCategoryType | null>(null);

  const [prompt, setPrompt] = useState(
    'High-Throughput Idempotent Distributed Outbox Architecture (50k req/s) with 16 PostgreSQL Shards, Tier-1 Redis Deduplication, and 256 Kafka Partitions'
  );
  const [conditions, setConditions] = useState<PresentationConditions>({
    slideCount: 5,
    templateCategory: (initialConditions?.templateCategory as TemplateCategoryType) || 'Executive',
    audience: 'Executive / Board',
    tone: 'Strategic & Authoritative',
    theme: 'Modern Indigo',
    includeMetrics: true,
    includeArchitecture: true,
    includeTakeaways: true,
    customConstraints: 'Highlight zero-data-loss guarantees, P99 < 35ms latency SLAs, and automated failure recovery.',
  });

  const handleSelectTemplate = (category: TemplateCategoryType) => {
    const tpl = SLIDE_TEMPLATES[category];
    setSelectedTemplate(category);
    setConditions((prev) => ({
      ...prev,
      templateCategory: category,
      audience: tpl.recommendedAudience,
      tone: tpl.recommendedTone,
      theme: tpl.recommendedTheme,
      includeMetrics: true,
      includeArchitecture: true,
      includeTakeaways: true,
      customConstraints:
        category === 'Technical'
          ? 'Deep distributed systems grounding, P99 < 35ms latency SLAs, zero-data-loss failover boundaries, and throughput benchmarks.'
          : category === 'Creative'
          ? 'Inspiring narrative progression, bold problem-solution contrast, market traction momentum, and visionary call-to-action.'
          : 'High-level strategic alignment, ROI capital efficiency, key KPI benchmarks, and board-level decision governance.',
    }));
    onShowToast?.(`Selected "${tpl.title}" (${category} Layout Framework)`);
  };

  // Current Generated Deck Plan
  const [deckPlan, setDeckPlan] = useState<PresentationDeckPlan | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isBuildingGoogleSlides, setIsBuildingGoogleSlides] = useState(false);

  // Created Google Presentation Result
  const [createdPresentation, setCreatedPresentation] = useState<{
    id: string;
    url: string;
    embedUrl: string;
    title: string;
    slideCount: number;
  } | null>(null);

  // User's Drive Presentations
  const [drivePresentations, setDrivePresentations] = useState<
    Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>
  >([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Confirmation Modal State (Mandatory for Workspace APIs)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDestructive: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  // Export to PDF / PPTX state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'pptx'>('pdf');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPPTX, setIsExportingPPTX] = useState(false);
  const [exportSourcePreference, setExportSourcePreference] = useState<'native' | 'google'>('native');
  const [exportIncludeNotes, setExportIncludeNotes] = useState(true);
  const [exportIncludeFooter, setExportIncludeFooter] = useState(true);

  // AI Slide Image & Business Chart Generator State
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);
  const [visualTargetSlideId, setVisualTargetSlideId] = useState<string | null>(null);
  const [visualType, setVisualType] = useState<'chart' | 'illustration' | 'diagram'>('chart');
  const [visualPrompt, setVisualPrompt] = useState(
    'Dual-axis corporate performance chart: 50,000 req/s ingress throughput bars with P99 latency line staying strictly under 35ms, clean modern corporate dashboard styling'
  );
  const [visualStyle, setVisualStyle] = useState('data-chart');
  const [visualAspectRatio, setVisualAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [generatedVisualResult, setGeneratedVisualResult] = useState<{
    imageUrl: string;
    model: string;
    prompt: string;
  } | null>(null);
  const [previewZoomImageUrl, setPreviewZoomImageUrl] = useState<string | null>(null);

  // Auto-Layout Optimizer State
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [selectedOptimizerSlideId, setSelectedOptimizerSlideId] = useState<string | null>(null);

  // Topic-Aware Style & Dynamic Preview State
  const initialTopicStyle = useMemo(() => {
    return suggestStylesForTopic(prompt, selectedTemplate);
  }, []);

  const [topicStyle, setTopicStyle] = useState<TopicStyleSuggestion>(initialTopicStyle);
  const [activePalette, setActivePalette] = useState<ColorPaletteSuggestion>(initialTopicStyle.palette);
  const [activeTypography, setActiveTypography] = useState<TypographyStyleSuggestion>(initialTopicStyle.typography);
  const [isSuggestingStyle, setIsSuggestingStyle] = useState(false);
  const [showStyleInspector, setShowStyleInspector] = useState(true);
  const [previewSlideLayout, setPreviewSlideLayout] = useState<SlideLayoutType>('TITLE');
  const [showAllPalettesModal, setShowAllPalettesModal] = useState(false);

  // Real-time Collaborator View & Presence State
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>(INITIAL_COLLABORATORS);
  const [threads, setThreads] = useState<SlideCommentThread[]>([]);
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(true);
  const [isCollaboratorDrawerOpen, setIsCollaboratorDrawerOpen] = useState<boolean>(false);
  const [selectedCommentThreadId, setSelectedCommentThreadId] = useState<string | null>(null);
  const [isPinningMode, setIsPinningMode] = useState<boolean>(false);

  // Synchronize comment threads whenever a deckPlan is loaded or created
  useEffect(() => {
    if (deckPlan) {
      const loaded = getDeckComments(deckPlan);
      setThreads(loaded);
    }
  }, [deckPlan?.id]);

  // Real-time Collaborator Presence Simulation Loop
  useEffect(() => {
    if (!isSimulationActive || !deckPlan || deckPlan.slides.length === 0) return;

    const interval = setInterval(() => {
      setCollaborators((prev) => {
        const updated = [...prev];
        const randomIdx = Math.floor(Math.random() * updated.length);
        const collab = updated[randomIdx];

        const actions = [
          'Reviewing architecture throughput pillars',
          'Validating latency SLA metric cards',
          'Inspecting typographic contrast & visual density',
          'Auditing enterprise compliance statements',
          'Drafting feedback notes on key takeaways',
          'Checking alignment with Q4 board roadmap',
          'Viewing executive summary & cover slide',
        ];

        const randomSlide = deckPlan.slides[Math.floor(Math.random() * deckPlan.slides.length)];
        const newX = 15 + Math.floor(Math.random() * 70);
        const newY = 20 + Math.floor(Math.random() * 60);

        updated[randomIdx] = {
          ...collab,
          activeSlideId: randomSlide.id,
          activeSlideNumber: randomSlide.slideNumber,
          currentAction: actions[Math.floor(Math.random() * actions.length)],
          cursor: { xPercent: newX, yPercent: newY },
          lastActive: 'Just now',
        };

        return updated;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [isSimulationActive, deckPlan]);

  const handleAddComment = (
    slideId: string,
    content: string,
    category: CommentCategory,
    pinPosition?: { xPercent: number; yPercent: number }
  ) => {
    if (!deckPlan) return;
    const targetSlide = deckPlan.slides.find((s) => s.id === slideId) || deckPlan.slides[0];
    const newThread: SlideCommentThread = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      deckId: deckPlan.id,
      slideId: targetSlide.id,
      slideNumber: targetSlide.slideNumber,
      slideTitle: targetSlide.title,
      author: CURRENT_USER,
      content,
      createdAt: 'Just now',
      category,
      pinPosition: pinPosition
        ? { ...pinPosition, targetElement: 'general' }
        : { xPercent: 50, yPercent: 40, targetElement: 'general' },
      status: 'open',
      replies: [],
      reactions: [],
    };

    const nextThreads = [newThread, ...threads];
    setThreads(nextThreads);
    saveDeckComments(deckPlan.id, nextThreads);
    onShowToast?.(`Posted comment on Slide ${targetSlide.slideNumber}!`);
  };

  const handleAddReply = (threadId: string, content: string) => {
    if (!deckPlan) return;
    const nextThreads = threads.map((t) => {
      if (t.id !== threadId) return t;
      const newReply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        author: CURRENT_USER,
        content,
        createdAt: 'Just now',
        reactions: [],
      };
      return {
        ...t,
        replies: [...t.replies, newReply],
      };
    });
    setThreads(nextThreads);
    saveDeckComments(deckPlan.id, nextThreads);
    onShowToast?.('Reply posted.');
  };

  const handleResolveThread = (threadId: string) => {
    if (!deckPlan) return;
    const nextThreads = threads.map((t) => {
      if (t.id !== threadId) return t;
      return {
        ...t,
        status: 'resolved' as const,
        resolvedBy: CURRENT_USER,
        resolvedAt: 'Just now',
      };
    });
    setThreads(nextThreads);
    saveDeckComments(deckPlan.id, nextThreads);
    onShowToast?.('Thread marked as resolved.');
  };

  const handleReopenThread = (threadId: string) => {
    if (!deckPlan) return;
    const nextThreads = threads.map((t) => {
      if (t.id !== threadId) return t;
      return {
        ...t,
        status: 'open' as const,
        resolvedBy: undefined,
        resolvedAt: undefined,
      };
    });
    setThreads(nextThreads);
    saveDeckComments(deckPlan.id, nextThreads);
    onShowToast?.('Thread re-opened.');
  };

  const handleDeleteThread = (threadId: string) => {
    if (!deckPlan) return;
    const nextThreads = threads.filter((t) => t.id !== threadId);
    setThreads(nextThreads);
    saveDeckComments(deckPlan.id, nextThreads);
    onShowToast?.('Comment thread deleted.');
  };

  const handleToggleReaction = (threadId: string, emoji: string) => {
    if (!deckPlan) return;
    const nextThreads = threads.map((t) => {
      if (t.id !== threadId) return t;
      const existingReaction = t.reactions.find((r) => r.emoji === emoji);
      let updatedReactions = [...t.reactions];

      if (existingReaction) {
        if (existingReaction.users.includes(CURRENT_USER.name)) {
          const filteredUsers = existingReaction.users.filter((u) => u !== CURRENT_USER.name);
          if (filteredUsers.length === 0) {
            updatedReactions = updatedReactions.filter((r) => r.emoji !== emoji);
          } else {
            updatedReactions = updatedReactions.map((r) =>
              r.emoji === emoji ? { ...r, count: filteredUsers.length, users: filteredUsers } : r
            );
          }
        } else {
          updatedReactions = updatedReactions.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, users: [...r.users, CURRENT_USER.name] }
              : r
          );
        }
      } else {
        updatedReactions.push({
          emoji,
          count: 1,
          users: [CURRENT_USER.name],
        });
      }

      return {
        ...t,
        reactions: updatedReactions,
      };
    });

    setThreads(nextThreads);
    saveDeckComments(deckPlan.id, nextThreads);
  };

  const handleSimulateTeammateComment = () => {
    if (!deckPlan || deckPlan.slides.length === 0) {
      onShowToast?.('Please generate a deck outline first to simulate team comments.');
      return;
    }

    const simComment = createSimulatedComment(deckPlan);
    if (!simComment) return;

    const nextThreads = [simComment, ...threads];
    setThreads(nextThreads);
    saveDeckComments(deckPlan.id, nextThreads);
    onShowToast?.(
      `💬 ${simComment.author.name} (${simComment.author.role}) added a review comment on Slide ${simComment.slideNumber}!`
    );
  };

  // Real-time deck density and container overflow analysis
  const deckOptimizationReport = useMemo(() => {
    if (!deckPlan || deckPlan.slides.length === 0) return null;
    return analyzeDeckDensity(deckPlan);
  }, [deckPlan]);

  // Synchronize initial prompt and conditions if provided from external navigation
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (initialConditions) {
      setConditions((prev) => ({ ...prev, ...initialConditions }));
      if (initialConditions.templateCategory) {
        setSelectedTemplate(initialConditions.templateCategory);
      }
    }
  }, [initialConditions]);

  // Debounced auto-suggestion when topic prompt or template changes
  useEffect(() => {
    if (!prompt || prompt.trim().length < 6) return;
    const timer = setTimeout(() => {
      const suggestion = suggestStylesForTopic(prompt, selectedTemplate);
      setTopicStyle(suggestion);
      setActivePalette(suggestion.palette);
      setActiveTypography(suggestion.typography);
      setConditions((prev) => ({
        ...prev,
        customPalette: suggestion.palette,
        customTypography: suggestion.typography,
      }));
    }, 450);
    return () => clearTimeout(timer);
  }, [prompt, selectedTemplate]);

  // Handle manual or AI-powered topic style suggestions
  const handleSuggestStyles = async (targetPrompt?: string, category?: TemplateCategoryType) => {
    const currentTopic = (targetPrompt ?? prompt).trim();
    const currentCat = category ?? selectedTemplate;
    if (!currentTopic) return;

    // Instant heuristic classification first
    const immediate = suggestStylesForTopic(currentTopic, currentCat);
    setTopicStyle(immediate);
    setActivePalette(immediate.palette);
    setActiveTypography(immediate.typography);
    setConditions((prev) => ({
      ...prev,
      customPalette: immediate.palette,
      customTypography: immediate.typography,
    }));

    if (deckPlan) {
      setDeckPlan((prev) =>
        prev
          ? {
              ...prev,
              palette: immediate.palette,
              typography: immediate.typography,
              conditions: {
                ...prev.conditions,
                customPalette: immediate.palette,
                customTypography: immediate.typography,
              },
            }
          : null
      );
    }
    onShowToast?.(`Applied ${immediate.palette.name} & ${immediate.typography.name} for topic.`);

    // Optional Gemini enrichment
    try {
      setIsSuggestingStyle(true);
      const res = await fetch('/api/slides/suggest-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: currentTopic, templateCategory: currentCat }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.palette && data.typography) {
          setTopicStyle((prev) => ({
            ...prev,
            detectedCategory: data.detectedCategory || prev.detectedCategory,
            summaryExplanation: data.summaryExplanation || prev.summaryExplanation,
            palette: { ...prev.palette, ...data.palette },
            typography: { ...prev.typography, ...data.typography },
          }));
          setActivePalette((prev) => ({ ...prev, ...data.palette }));
          setActiveTypography((prev) => ({ ...prev, ...data.typography }));
          setConditions((prev) => ({
            ...prev,
            customPalette: data.palette,
            customTypography: data.typography,
          }));
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsSuggestingStyle(false);
    }
  };

  const handleSelectPalette = (palette: ColorPaletteSuggestion) => {
    setActivePalette(palette);
    setConditions((prev) => ({ ...prev, customPalette: palette }));
    if (deckPlan) {
      setDeckPlan((prev) =>
        prev
          ? {
              ...prev,
              palette,
              conditions: { ...prev.conditions, customPalette: palette },
            }
          : null
      );
    }
    onShowToast?.(`Palette: ${palette.name} applied.`);
  };

  const handleSelectTypography = (typography: TypographyStyleSuggestion) => {
    setActiveTypography(typography);
    setConditions((prev) => ({ ...prev, customTypography: typography }));
    if (deckPlan) {
      setDeckPlan((prev) =>
        prev
          ? {
              ...prev,
              typography,
              conditions: { ...prev.conditions, customTypography: typography },
            }
          : null
      );
    }
    onShowToast?.(`Typography: ${typography.headlineFont} + ${typography.bodyFont} applied.`);
  };

  const handleUpdateSlide = (slideId: string, updates: Partial<SlideItem>) => {
    if (!deckPlan) return;
    setDeckPlan({
      ...deckPlan,
      slides: deckPlan.slides.map((s) => (s.id === slideId ? { ...s, ...updates } : s)),
    });
  };

  const handleAddSlide = () => {
    if (!deckPlan) return;
    const nextNum = deckPlan.slides.length + 1;
    const newSlide: SlideItem = {
      id: `slide-custom-${Date.now()}`,
      slideNumber: nextNum,
      title: 'Strategic Architecture & Execution Milestone',
      subtitle: 'Quantifiable SLAs & Continuous Resiliency Envelopes',
      layout: 'TITLE_AND_BODY',
      bullets: [
        'Rigorous automated validation against strict latency and throughput SLAs.',
        'High-concurrency data durability verified across all failure boundaries.',
        'Cross-functional operational transparency and continuous observability.',
      ],
      callout: 'Accelerates roadmap delivery with zero regressions.',
      notes: 'Highlight operational robustness and measurable business ROI.',
    };
    setDeckPlan({
      ...deckPlan,
      slides: [...deckPlan.slides, newSlide],
    });
    setEditingSlideId(newSlide.id);
    onShowToast?.(`Added slide ${nextNum} to presentation outline.`);
  };

  const handleDeleteSlide = (slideId: string) => {
    if (!deckPlan || deckPlan.slides.length <= 1) {
      onShowToast?.('A presentation requires at least 1 slide.');
      return;
    }
    const filtered = deckPlan.slides
      .filter((s) => s.id !== slideId)
      .map((s, idx) => ({ ...s, slideNumber: idx + 1 }));
    setDeckPlan({
      ...deckPlan,
      slides: filtered,
    });
    if (editingSlideId === slideId) {
      setEditingSlideId(null);
    }
    onShowToast?.('Slide removed from outline.');
  };

  const handleMoveSlide = (slideId: string, direction: 'up' | 'down') => {
    if (!deckPlan) return;
    const idx = deckPlan.slides.findIndex((s) => s.id === slideId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === deckPlan.slides.length - 1) return;

    const newSlides = [...deckPlan.slides];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = newSlides[idx];
    newSlides[idx] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;

    const renumbered = newSlides.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setDeckPlan({
      ...deckPlan,
      slides: renumbered,
    });
  };

  const handleExportDeckJson = () => {
    if (!deckPlan) return;
    navigator.clipboard.writeText(JSON.stringify(deckPlan, null, 2));
    onShowToast?.('Presentation deck outline copied to clipboard as JSON.');
  };

  // Check auth state on load
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setGoogleUser(user);
        const cached = getCachedAccessToken();
        if (cached) setAccessToken(cached);
      } else {
        setGoogleUser(null);
        setAccessToken(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch Drive presentations if token available
  useEffect(() => {
    if (accessToken && activeTab === 'library') {
      fetchLibraryPresentations();
    }
  }, [accessToken, activeTab]);

  const fetchLibraryPresentations = async () => {
    if (!accessToken) return;
    setIsLoadingLibrary(true);
    try {
      const files = await listUserGoogleSlides(accessToken);
      setDrivePresentations(files);
    } catch (err) {
      console.warn('Failed to fetch presentations library:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await signInForGoogleSlides();
      if (res.accessToken) {
        setAccessToken(res.accessToken);
        setGoogleUser(res.user);
        onShowToast?.('Connected to Google Workspace with Google Slides permissions.');
      } else if (res.userFriendlyMessage) {
        onShowToast?.(res.userFriendlyMessage);
      }
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      onShowToast?.('Google sign-in was not completed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSignOut();
    setAccessToken(null);
    setGoogleUser(null);
    onShowToast?.('Disconnected from Google Workspace.');
  };

  // Generate Deck Plan Outline with AI
  const handleGenerateOutline = async () => {
    if (!prompt.trim()) {
      onShowToast?.('Please enter a presentation topic or prompt.');
      return;
    }
    setIsGeneratingOutline(true);
    try {
      const plan = await generateSlideDeckOutline(prompt, {
        ...conditions,
        templateCategory: selectedTemplate,
        customPalette: activePalette,
        customTypography: activeTypography,
      });
      plan.palette = activePalette;
      plan.typography = activeTypography;
      setDeckPlan(plan);
      setCreatedPresentation(null);
      onShowToast?.(`Generated ${plan.slides.length}-slide ${selectedTemplate} presentation outline.`);
      if (onRecordActivity) {
        onRecordActivity({
          type: 'presentation',
          title: 'Generated Presentation',
          description: `${plan.title} (${plan.slides.length} slides · ${selectedTemplate})`,
          view: 'google-slides',
          payload: {
            prompt,
            conditions: {
              ...conditions,
              templateCategory: selectedTemplate,
            },
          },
          icon: 'slideshow',
          badge: 'Google Slides',
          badgeColor: '#f59e0b',
        });
      }
    } catch (err: any) {
      console.error('Outline generation error:', err);
      onShowToast?.('Failed to generate outline.');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // Trigger Google Slides Creation with Mandatory User Confirmation
  const promptCreateInGoogleSlides = () => {
    if (!deckPlan || deckPlan.slides.length === 0) {
      onShowToast?.('Please generate a presentation outline first.');
      return;
    }

    if (!accessToken) {
      // Prompt user to connect Google account first
      setConfirmModal({
        isOpen: true,
        title: 'Google Workspace Account Required',
        description:
          'To create this presentation in Google Slides, please sign in with your Google account. This allows LOGITIX to create the presentation file directly in your Google Drive with your permission.',
        actionLabel: 'Sign in with Google',
        isDestructive: false,
        onConfirm: () => {
          setConfirmModal(null);
          handleGoogleSignIn();
        },
      });
      return;
    }

    // Mandatory user confirmation dialog before creating file in Google Drive
    setConfirmModal({
      isOpen: true,
      title: `Create Google Slides Presentation?`,
      description: `This will create a new presentation titled "${deckPlan.title}" with ${deckPlan.slides.length} slides directly in your Google Drive account (${googleUser?.email || 'Google Account'}).`,
      actionLabel: 'Create in Google Slides',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal(null);
        await executeBuildGoogleSlides();
      },
    });
  };

  const executeBuildGoogleSlides = async () => {
    if (!accessToken || !deckPlan) return;
    setIsBuildingGoogleSlides(true);
    try {
      const result = await buildPresentationInGoogleSlides(accessToken, deckPlan);
      setCreatedPresentation({
        id: result.presentationId,
        url: result.presentationUrl,
        embedUrl: result.embedUrl,
        title: result.title,
        slideCount: result.slideCount,
      });
      onShowToast?.(`Presentation "${result.title}" created successfully in Google Slides!`);
      // Refresh library list
      fetchLibraryPresentations();
    } catch (err: any) {
      console.error('Failed to create in Google Slides:', err);
      onShowToast?.(`Google Slides creation error: ${err.message || 'Please check your permissions.'}`);
    } finally {
      setIsBuildingGoogleSlides(false);
    }
  };

  // Prompt delete presentation with confirmation dialog
  const promptDeletePresentation = (file: { id: string; name: string }) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Presentation from Google Drive?`,
      description: `Are you sure you want to delete "${file.name}" from your Google Drive? This action cannot be undone.`,
      actionLabel: 'Delete File',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(null);
        if (!accessToken) return;
        try {
          const ok = await deletePresentationFromDrive(accessToken, file.id);
          if (ok) {
            setDrivePresentations((prev) => prev.filter((p) => p.id !== file.id));
            if (createdPresentation?.id === file.id) {
              setCreatedPresentation(null);
            }
            onShowToast?.(`Deleted "${file.name}" from Google Drive.`);
          } else {
            onShowToast?.('Failed to delete presentation from Drive.');
          }
        } catch (err) {
          onShowToast?.('Error deleting presentation.');
        }
      },
    });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    onShowToast?.('Presentation link copied to clipboard.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Export handlers for PDF and PPTX
  const handleExportPDF = async (sourceOverride?: 'native' | 'google') => {
    if (!deckPlan || deckPlan.slides.length === 0) {
      onShowToast?.('Please generate a presentation deck before exporting.');
      return;
    }
    setIsExportingPDF(true);
    try {
      const useGoogle =
        sourceOverride === 'google' ||
        (exportSourcePreference === 'google' && Boolean(createdPresentation?.id));
      if (useGoogle && createdPresentation?.id) {
        const url = getGoogleSlidesExportUrl(createdPresentation.id, 'pdf');
        window.open(url, '_blank');
        onShowToast?.('Opening official PDF download from Google Slides...');
      } else {
        await exportDeckToPDF(deckPlan, {
          includeNotes: exportIncludeNotes,
          includeFooter: exportIncludeFooter,
        });
        onShowToast?.('Presentation exported as PDF (16:9 widescreen layout)!');
        if (onRecordActivity) {
          onRecordActivity({
            type: 'pdf',
            title: 'Exported PDF',
            description: `Presentation: ${deckPlan.title} (${deckPlan.slides.length} slides)`,
            view: 'google-slides',
            payload: {
              prompt,
            },
            icon: 'picture_as_pdf',
            badge: 'Slides PDF',
            badgeColor: '#ef4444',
          });
        }
      }
    } catch (err: any) {
      console.error('PDF export failed:', err);
      onShowToast?.(`PDF export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExportingPDF(false);
      setIsExportModalOpen(false);
    }
  };

  const handleExportPPTX = async (sourceOverride?: 'native' | 'google') => {
    if (!deckPlan || deckPlan.slides.length === 0) {
      onShowToast?.('Please generate a presentation deck before exporting.');
      return;
    }
    setIsExportingPPTX(true);
    try {
      const useGoogle =
        sourceOverride === 'google' ||
        (exportSourcePreference === 'google' && Boolean(createdPresentation?.id));
      if (useGoogle && createdPresentation?.id) {
        const url = getGoogleSlidesExportUrl(createdPresentation.id, 'pptx');
        window.open(url, '_blank');
        onShowToast?.('Opening official PowerPoint (.pptx) download from Google Slides...');
      } else {
        await exportDeckToPPTX(deckPlan, {
          includeNotes: exportIncludeNotes,
          includeFooter: exportIncludeFooter,
        });
        onShowToast?.('PowerPoint presentation (.pptx) downloaded with speaker notes!');
      }
    } catch (err: any) {
      console.error('PPTX export failed:', err);
      onShowToast?.(`PPTX export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExportingPPTX(false);
      setIsExportModalOpen(false);
    }
  };

  const handleExportDriveFile = (fileId: string, fileName: string, format: 'pdf' | 'pptx') => {
    const url = getGoogleSlidesExportUrl(fileId, format);
    window.open(url, '_blank');
    onShowToast?.(`Downloading "${fileName}" as ${format.toUpperCase()}...`);
  };

  // AI Visual Studio Handlers
  const handleOpenVisualStudio = (slideId?: string) => {
    if (slideId && deckPlan) {
      setVisualTargetSlideId(slideId);
      const targetSlide = deckPlan.slides.find((s) => s.id === slideId);
      if (targetSlide) {
        // Pre-fill smart prompt based on slide context
        if (targetSlide.layout === 'METRIC_HIGHLIGHT' || targetSlide.metric) {
          setVisualType('chart');
          setVisualStyle('data-chart');
          setVisualPrompt(
            `Executive data chart for "${targetSlide.title}": ${targetSlide.metric?.value || '50,000 /s'} ${targetSlide.metric?.label || 'Throughput'}, ${targetSlide.metric?.trend || '99.4% SLA adherence'}, clean presentation visual`
          );
        } else if (targetSlide.layout === 'TWO_COLUMNS' || targetSlide.layout === 'TIMELINE') {
          setVisualType('diagram');
          setVisualStyle('corporate-isometric');
          setVisualPrompt(
            `Technical architecture diagram and process stream for "${targetSlide.title}": ${targetSlide.bullets?.[0] || targetSlide.subtitle || 'System pipeline flow'}, modern clean corporate styling`
          );
        } else {
          setVisualType('illustration');
          setVisualStyle('business-vector');
          setVisualPrompt(
            `High-quality corporate presentation illustration for "${targetSlide.title}": ${targetSlide.subtitle || targetSlide.bullets?.[0] || 'Strategic business vision'}, modern executive aesthetic matching ${conditions.theme}`
          );
        }
      }
    } else if (deckPlan && deckPlan.slides.length > 0) {
      setVisualTargetSlideId(deckPlan.slides[0].id);
    }
    setGeneratedVisualResult(null);
    setIsVisualModalOpen(true);
  };

  const handleSelectPreset = (preset: SlideVisualPreset) => {
    setVisualType(preset.type);
    setVisualPrompt(preset.prompt);
    setVisualStyle(preset.recommendedStyle);
    setVisualAspectRatio(preset.recommendedAspectRatio);
    onShowToast?.(`Selected "${preset.title}" preset`);
  };

  const handleGenerateSlideVisual = async () => {
    if (!visualPrompt.trim()) {
      onShowToast?.('Please enter a description for your slide visual.');
      return;
    }

    setIsGeneratingVisual(true);
    try {
      const targetSlide = deckPlan?.slides.find((s) => s.id === visualTargetSlideId);
      const res = await generateSlideVisual({
        prompt: visualPrompt,
        type: visualType,
        style: visualStyle,
        aspectRatio: visualAspectRatio,
        theme: conditions.theme,
        slideContext: targetSlide
          ? {
              title: targetSlide.title,
              subtitle: targetSlide.subtitle,
              layout: targetSlide.layout,
            }
          : undefined,
      });

      setGeneratedVisualResult(res);
      onShowToast?.(`AI visual created successfully!`);
    } catch (err: any) {
      console.error('Failed to generate visual:', err);
      onShowToast?.(`Visual generation notice: ${err?.message || 'Using high-fidelity graphic generator'}`);
    } finally {
      setIsGeneratingVisual(false);
    }
  };

  const handleApplyVisualToSlide = () => {
    if (!generatedVisualResult || !visualTargetSlideId || !deckPlan) return;

    setDeckPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === visualTargetSlideId
            ? {
                ...s,
                imageUrl: generatedVisualResult.imageUrl,
                imagePrompt: generatedVisualResult.prompt,
                imageCaption: visualPrompt.slice(0, 60),
              }
            : s
        ),
      };
    });

    const targetSlide = deckPlan.slides.find((s) => s.id === visualTargetSlideId);
    onShowToast?.(`Attached AI visual to Slide ${targetSlide?.slideNumber || ''}!`);
    setIsVisualModalOpen(false);
  };

  const handleRemoveVisualFromSlide = (slideId: string) => {
    if (!deckPlan) return;
    setDeckPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === slideId
            ? { ...s, imageUrl: undefined, imagePrompt: undefined, imageCaption: undefined }
            : s
        ),
      };
    });
    onShowToast?.('Visual removed from slide.');
  };

  // Auto-Layout Optimizer Handlers
  const handleApplyOptimization = (
    slideId: string,
    actionType: LayoutOptimizationActionType,
    actionTitle?: string
  ) => {
    if (!deckPlan) return;
    const updated = applyOptimization(deckPlan, slideId, actionType);
    setDeckPlan(updated);
    onShowToast?.(
      actionTitle
        ? `Applied "${actionTitle}"!`
        : 'Slide layout reorganized for optimal container capacity!'
    );
  };

  const handleBatchOptimize = () => {
    if (!deckPlan) return;
    const { updatedDeck, optimizedCount } = batchOptimizeDeck(deckPlan);
    setDeckPlan(updatedDeck);
    if (optimizedCount > 0) {
      onShowToast?.(
        `Auto-optimized ${optimizedCount} slide containers for ${deckPlan.conditions.templateCategory || 'Executive'} template!`
      );
    } else {
      onShowToast?.('All slide containers already conform to optimal density bounds!');
    }
  };

  return (
    <div className="w-full min-h-full bg-[#f8f9fa] text-[#1a1c1c] pb-24 font-body">
      {/* Top Banner & Control Station */}
      <div className="border-b border-[#e2e2e2] bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-code text-[11px] font-semibold text-[#1a146b] bg-[#e2dfff] px-2.5 py-0.5 rounded tracking-wide">
                  GOOGLE WORKSPACE INTEGRATION
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-code font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  GOOGLE SLIDES API
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-headline font-bold text-[#1a146b] tracking-tight flex items-center gap-2">
                Google Slides Presentation Studio
              </h1>
              <p className="text-xs text-[#52525e] mt-0.5">
                Generate executive-ready presentations from prompts & conditions, customize slide layouts, and build directly into Google Slides.
              </p>
            </div>

            {/* Google Authentication Control */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              {accessToken ? (
                <div className="flex items-center gap-2 bg-[#f3f4f3] p-1.5 rounded-2xl border border-[#e2e2e2]">
                  <div className="w-7 h-7 rounded-full bg-[#1a146b] text-white flex items-center justify-center text-xs font-bold font-headline overflow-hidden">
                    {googleUser?.photoURL ? (
                      <img src={googleUser.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      'G'
                    )}
                  </div>
                  <div className="text-[11px] pr-2">
                    <div className="font-semibold text-[#1a1c1c] truncate max-w-32">
                      {googleUser?.displayName || googleUser?.email || 'Connected'}
                    </div>
                    <div className="text-[9px] text-emerald-700 font-code font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Google Workspace Active
                    </div>
                  </div>
                  <button
                    onClick={handleGoogleSignOut}
                    className="p-1 rounded-lg text-[#777682] hover:text-[#ba1a1a] hover:bg-white text-xs transition-colors"
                    title="Disconnect Google Workspace"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                /* Official Google Sign-in Styled Button */
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-zinc-50 border border-[#e2e2e2] text-xs font-semibold text-[#1a1c1c] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="border-b border-[#e2e2e2] flex items-center gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('creator')}
            className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'creator'
                ? 'border-[#1a146b] text-[#1a146b]'
                : 'border-transparent text-[#777682] hover:text-[#1a1c1c]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Presentation Creator</span>
          </button>

          <button
            onClick={() => {
              if (!deckPlan) {
                handleGenerateOutline();
              }
              setActiveTab('collaborator');
            }}
            className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'collaborator'
                ? 'border-[#1a146b] text-[#1a146b]'
                : 'border-transparent text-[#777682] hover:text-[#1a1c1c]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Users className="w-3.5 h-3.5" />
              <span>Collaborator View</span>
            </div>
            {threads.filter((t) => t.status === 'open').length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-[#1a146b] font-code font-bold">
                {threads.filter((t) => t.status === 'open').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'library'
                ? 'border-[#1a146b] text-[#1a146b]'
                : 'border-transparent text-[#777682] hover:text-[#1a1c1c]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Google Drive Presentations</span>
            {drivePresentations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-[#1a146b] font-code">
                {drivePresentations.length}
              </span>
            )}
          </button>
        </div>

        {/* =========================================================================
            TAB 1: PRESENTATION CREATOR & OUTLINE BUILDER
           ========================================================================= */}
        {activeTab === 'creator' && (
          <div className="space-y-6">
            {/* =========================================================================
                STEP 1: PRE-DEFINED PROFESSIONAL SLIDE LAYOUT TEMPLATE PICKER
               ========================================================================= */}
            <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-[#1a146b] flex items-center justify-center">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline font-bold text-sm text-[#1a1c1c]">
                        Slide Layout Template Picker
                      </h3>
                      <span className="text-[10px] font-code bg-indigo-50 text-[#1a146b] font-bold px-2 py-0.5 rounded border border-indigo-100">
                        Step 1
                      </span>
                    </div>
                    <p className="text-xs text-[#52525e]">
                      Select from pre-defined professional slide layouts (Executive, Technical, Creative) to structure your deck before generating content.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs text-[#777682]">
                    Selected: <strong className="text-[#1a146b]">{SLIDE_TEMPLATES[selectedTemplate].title}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewingTemplateBlueprint(selectedTemplate)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[#1a1c1c] text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    title="View detailed slide-by-slide layout blueprint"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#1a146b]" />
                    <span>View Blueprint</span>
                  </button>
                </div>
              </div>

              {/* =========================================================================
                  AI TOPIC STYLE & TYPOGRAPHY INTELLIGENCE WITH DYNAMIC PREVIEW
                 ========================================================================= */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-sky-50/30 p-4 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-6 h-6 rounded-lg bg-[#1a146b] text-white flex items-center justify-center shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-headline font-bold text-xs text-[#1a1c1c] flex items-center gap-1.5 flex-wrap">
                        <span>Topic Style AI Match:</span>
                        <span className="text-[#1a146b] font-code bg-indigo-100/70 px-2 py-0.5 rounded font-bold">
                          {topicStyle.detectedCategory}
                        </span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded font-code font-bold">
                          {topicStyle.confidence}% Match
                        </span>
                      </h4>
                    </div>
                    <p className="text-[11px] text-[#52525e] leading-snug max-w-2xl">
                      {topicStyle.summaryExplanation}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSuggestStyles(prompt, selectedTemplate)}
                      disabled={isSuggestingStyle}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-[#1a146b] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Re-analyze topic and suggest optimal color palette and typography"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${isSuggestingStyle ? 'animate-spin text-purple-600' : 'text-[#1a146b]'}`} />
                      <span>{isSuggestingStyle ? 'Analyzing Topic...' : 'Re-Suggest Style'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowStyleInspector(!showStyleInspector)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        showStyleInspector
                          ? 'bg-[#1a146b] text-white border-[#1a146b] shadow-2xs'
                          : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>{showStyleInspector ? 'Hide Style Studio' : 'Live Style Studio'}</span>
                    </button>
                  </div>
                </div>

                {/* Active Style Strip */}
                <div className="pt-2.5 border-t border-indigo-100/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Active Palette Preview Pill */}
                    <div className="flex items-center gap-2 p-1 px-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                      <span className="text-[10px] text-zinc-500 font-semibold">Active Palette:</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: activePalette.primaryAccent }}
                          title={`Primary: ${activePalette.primaryAccent}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: activePalette.secondaryAccent }}
                          title={`Secondary: ${activePalette.secondaryAccent}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: activePalette.surfaceBg }}
                          title={`Surface: ${activePalette.surfaceBg}`}
                        />
                      </div>
                      <span className="font-semibold text-xs text-[#1a1c1c]">{activePalette.name}</span>
                    </div>

                    {/* Active Typography Preview Pill */}
                    <div className="flex items-center gap-2 p-1 px-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                      <Type className="w-3.5 h-3.5 text-[#1a146b]" />
                      <span className="text-[10px] text-zinc-500 font-semibold">Typography Pairing:</span>
                      <span className="font-bold text-xs text-[#1a1c1c]" style={{ fontFamily: activeTypography.headlineFont }}>
                        {activeTypography.headlineFont}
                      </span>
                      <span className="text-zinc-300">/</span>
                      <span className="text-xs text-zinc-600 font-medium" style={{ fontFamily: activeTypography.bodyFont }}>
                        {activeTypography.bodyFont}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Dynamic Live Preview Linked Below</span>
                  </div>
                </div>

                {/* Expandable Style Inspector & Live Mockup Studio */}
                {showStyleInspector && (
                  <div className="space-y-4 pt-3 border-t border-indigo-100">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left: Suggested Palettes & Typography (6 cols) */}
                      <div className="lg:col-span-6 space-y-3.5">
                        {/* Section 1: Suggested Color Palettes */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a1c1c]">
                              <Palette className="w-3.5 h-3.5 text-[#1a146b]" />
                              <span>Topic-Suggested Color Palettes</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAllPalettesModal(true)}
                              className="text-[11px] text-[#1a146b] hover:underline font-semibold cursor-pointer"
                            >
                              Browse All 8 Palettes →
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[topicStyle.palette, ...topicStyle.alternativePalettes].slice(0, 4).map((palette, pIdx) => {
                              const isSelected = activePalette.id === palette.id;
                              const isPrimary = pIdx === 0;

                              return (
                                <div
                                  key={palette.id}
                                  onClick={() => handleSelectPalette(palette)}
                                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-[#1a146b] bg-indigo-50/50 ring-2 ring-[#1a146b]/20 shadow-xs'
                                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center -space-x-1">
                                          <span
                                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                                            style={{ backgroundColor: palette.primaryAccent }}
                                          />
                                          <span
                                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                                            style={{ backgroundColor: palette.secondaryAccent }}
                                          />
                                          <span
                                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                                            style={{ backgroundColor: palette.surfaceBg }}
                                          />
                                        </div>
                                        <span className="font-semibold text-xs text-[#1a1c1c] truncate max-w-[130px]">
                                          {palette.name}
                                        </span>
                                      </div>

                                      {isSelected ? (
                                        <span className="w-4 h-4 rounded-full bg-[#1a146b] text-white flex items-center justify-center text-[10px]">
                                          ✓
                                        </span>
                                      ) : isPrimary ? (
                                        <span className="text-[9px] font-code bg-indigo-100 text-[#1a146b] font-bold px-1 rounded">
                                          TOP
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2">
                                      {palette.reason}
                                    </p>
                                  </div>

                                  <div className="pt-1.5 mt-1 border-t border-zinc-100 flex items-center justify-between text-[9px] font-code text-zinc-400">
                                    <span>{palette.category}</span>
                                    <span>{palette.isDark ? 'Dark Theme' : 'Light Theme'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section 2: Suggested Typography Styles */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a1c1c]">
                              <Type className="w-3.5 h-3.5 text-[#1a146b]" />
                              <span>Topic-Suggested Typography Pairings</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[topicStyle.typography, ...topicStyle.alternativeTypography].slice(0, 4).map((typo, tIdx) => {
                              const isSelected = activeTypography.id === typo.id;
                              const isPrimary = tIdx === 0;

                              return (
                                <div
                                  key={typo.id}
                                  onClick={() => handleSelectTypography(typo)}
                                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-[#1a146b] bg-indigo-50/50 ring-2 ring-[#1a146b]/20 shadow-xs'
                                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-semibold text-zinc-500 uppercase font-code">
                                        {typo.name}
                                      </span>
                                      {isSelected ? (
                                        <span className="w-4 h-4 rounded-full bg-[#1a146b] text-white flex items-center justify-center text-[10px]">
                                          ✓
                                        </span>
                                      ) : isPrimary ? (
                                        <span className="text-[9px] font-code bg-indigo-100 text-[#1a146b] font-bold px-1 rounded">
                                          TOP
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="py-1">
                                      <div
                                        className="text-sm font-bold text-[#1a1c1c] leading-tight"
                                        style={{ fontFamily: typo.headlineFont }}
                                      >
                                        {typo.headlineFont}
                                      </div>
                                      <div
                                        className="text-xs text-zinc-600 leading-snug"
                                        style={{ fontFamily: typo.bodyFont }}
                                      >
                                        Body: {typo.bodyFont}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-1.5 mt-1 border-t border-zinc-100 text-[10px] text-zinc-500 leading-snug truncate">
                                    {typo.characterMood}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Interactive Live 16:9 Slide Preview Mockup (6 cols) */}
                      <div className="lg:col-span-6 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a1c1c]">
                            <Eye className="w-3.5 h-3.5 text-[#1a146b]" />
                            <span>Live Dynamic Slide Preview ({SLIDE_TEMPLATES[selectedTemplate].title})</span>
                          </div>
                          <span className="text-[10px] font-code text-zinc-400">16:9 Widescreen Mockup</span>
                        </div>

                        {/* Live Rendered Slide Frame */}
                        <div
                          className="relative rounded-2xl border overflow-hidden shadow-sm transition-all flex flex-col justify-between aspect-video p-5 sm:p-6"
                          style={{
                            backgroundColor: activePalette.surfaceBg,
                            borderColor: activePalette.cardBorder,
                            color: activePalette.bodyColor,
                          }}
                        >
                          {/* Top Accent Stripe */}
                          <div
                            className="absolute top-0 left-0 right-0 h-1.5"
                            style={{ backgroundColor: activePalette.primaryAccent }}
                          />

                          {/* Slide Top Category Header */}
                          <div className="flex items-center justify-between text-[10px] font-code opacity-75">
                            <span
                              className="font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: activePalette.tagBg,
                                color: activePalette.tagText,
                              }}
                            >
                              {previewSlideLayout.replace(/_/g, ' ')}
                            </span>
                            <span style={{ color: activePalette.bodyColor }}>
                              {selectedTemplate} Architecture
                            </span>
                          </div>

                          {/* Slide Body Content dynamically rendered according to previewSlideLayout */}
                          {previewSlideLayout === 'TITLE' && (
                            <div className="my-auto space-y-2">
                              <h2
                                className="text-lg sm:text-xl font-bold leading-tight"
                                style={{
                                  fontFamily: activeTypography.headlineFont,
                                  color: activePalette.titleColor,
                                }}
                              >
                                {prompt.length > 70 ? `${prompt.slice(0, 70)}...` : prompt}
                              </h2>
                              <p
                                className="text-xs sm:text-sm leading-relaxed opacity-90"
                                style={{
                                  fontFamily: activeTypography.bodyFont,
                                  color: activePalette.bodyColor,
                                }}
                              >
                                Comprehensive strategic architecture specification, quantifiable benchmarks, and operational resiliency envelopes.
                              </p>
                              <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] italic border font-medium mt-1"
                                style={{
                                  backgroundColor: activePalette.tagBg,
                                  color: activePalette.tagText,
                                  borderColor: activePalette.cardBorder,
                                  fontFamily: activeTypography.bodyFont,
                                }}
                              >
                                <span>✦ Executive Strategic Briefing • LOGITIX Enterprise Engine</span>
                              </div>
                            </div>
                          )}

                          {previewSlideLayout === 'TWO_COLUMNS' && (
                            <div className="my-auto space-y-2">
                              <h3
                                className="text-sm font-bold truncate"
                                style={{
                                  fontFamily: activeTypography.headlineFont,
                                  color: activePalette.titleColor,
                                }}
                              >
                                Distributed Topology & Dual-Engine Pillars
                              </h3>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div
                                  className="p-2.5 rounded-xl border space-y-1"
                                  style={{
                                    backgroundColor: activePalette.cardBg,
                                    borderColor: activePalette.cardBorder,
                                  }}
                                >
                                  <div
                                    className="font-bold uppercase text-[9px] font-code"
                                    style={{ color: activePalette.primaryAccent }}
                                  >
                                    Architecture Pillars
                                  </div>
                                  <ul className="space-y-0.5 opacity-90" style={{ fontFamily: activeTypography.bodyFont }}>
                                    <li>• 16 PostgreSQL Outbox Shards</li>
                                    <li>• Tier-1 Redis Deduplication Cache</li>
                                    <li>• Zero-Data-Loss Failover Boundaries</li>
                                  </ul>
                                </div>
                                <div
                                  className="p-2.5 rounded-xl border space-y-1"
                                  style={{
                                    backgroundColor: activePalette.cardBg,
                                    borderColor: activePalette.cardBorder,
                                  }}
                                >
                                  <div
                                    className="font-bold uppercase text-[9px] font-code"
                                    style={{ color: activePalette.secondaryAccent }}
                                  >
                                    Execution & SLAs
                                  </div>
                                  <ul className="space-y-0.5 opacity-90" style={{ fontFamily: activeTypography.bodyFont }}>
                                    <li>• 256 Kafka Consumer Partitions</li>
                                    <li>• P99 Latency &lt; 35ms Under Surge</li>
                                    <li>• Sub-millisecond WAL Tailing</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {previewSlideLayout === 'METRIC_HIGHLIGHT' && (
                            <div className="my-auto space-y-2">
                              <h3
                                className="text-sm font-bold truncate"
                                style={{
                                  fontFamily: activeTypography.headlineFont,
                                  color: activePalette.titleColor,
                                }}
                              >
                                Performance & Throughput Telemetry Benchmarks
                              </h3>
                              <div className="grid grid-cols-3 gap-2">
                                <div
                                  className="p-3 rounded-xl border text-center flex flex-col justify-center"
                                  style={{
                                    backgroundColor: activePalette.cardBg,
                                    borderColor: activePalette.cardBorder,
                                  }}
                                >
                                  <span
                                    className="text-base sm:text-lg font-extrabold leading-none"
                                    style={{
                                      color: activePalette.primaryAccent,
                                      fontFamily: activeTypography.headlineFont,
                                    }}
                                  >
                                    50,000
                                  </span>
                                  <span className="text-[9px] font-medium opacity-80 mt-1">Ingress req/s</span>
                                  <span className="text-[8px] font-code font-bold text-emerald-600 mt-0.5">+99.4% SLA</span>
                                </div>
                                <div
                                  className="p-3 rounded-xl border text-center flex flex-col justify-center"
                                  style={{
                                    backgroundColor: activePalette.cardBg,
                                    borderColor: activePalette.cardBorder,
                                  }}
                                >
                                  <span
                                    className="text-base sm:text-lg font-extrabold leading-none"
                                    style={{
                                      color: activePalette.secondaryAccent,
                                      fontFamily: activeTypography.headlineFont,
                                    }}
                                  >
                                    &lt; 35ms
                                  </span>
                                  <span className="text-[9px] font-medium opacity-80 mt-1">P99 Latency</span>
                                  <span className="text-[8px] font-code font-bold text-emerald-600 mt-0.5">Strict SLA</span>
                                </div>
                                <div
                                  className="p-3 rounded-xl border text-center flex flex-col justify-center"
                                  style={{
                                    backgroundColor: activePalette.cardBg,
                                    borderColor: activePalette.cardBorder,
                                  }}
                                >
                                  <span
                                    className="text-base sm:text-lg font-extrabold leading-none"
                                    style={{
                                      color: activePalette.primaryAccent,
                                      fontFamily: activeTypography.headlineFont,
                                    }}
                                  >
                                    0.00%
                                  </span>
                                  <span className="text-[9px] font-medium opacity-80 mt-1">Data Regression</span>
                                  <span className="text-[8px] font-code font-bold text-emerald-600 mt-0.5">Verified</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {previewSlideLayout === 'TIMELINE' && (
                            <div className="my-auto space-y-2">
                              <h3
                                className="text-sm font-bold truncate"
                                style={{
                                  fontFamily: activeTypography.headlineFont,
                                  color: activePalette.titleColor,
                                }}
                              >
                                Execution Milestones & Phased Horizon Delivery
                              </h3>
                              <div className="grid grid-cols-3 gap-2 text-[10px]">
                                {[
                                  { phase: 'Phase 1', title: 'Outbox Partitioning', date: 'Weeks 1-3' },
                                  { phase: 'Phase 2', title: 'CDC WAL Stream', date: 'Weeks 4-6' },
                                  { phase: 'Phase 3', title: 'Global Failover', date: 'Weeks 7-9' },
                                ].map((step, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 rounded-xl border relative"
                                    style={{
                                      backgroundColor: activePalette.cardBg,
                                      borderColor: activePalette.cardBorder,
                                    }}
                                  >
                                    <div
                                      className="text-[9px] font-code font-bold"
                                      style={{ color: activePalette.primaryAccent }}
                                    >
                                      {step.phase} • {step.date}
                                    </div>
                                    <div
                                      className="font-bold text-xs mt-0.5"
                                      style={{
                                        fontFamily: activeTypography.headlineFont,
                                        color: activePalette.titleColor,
                                      }}
                                    >
                                      {step.title}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {previewSlideLayout === 'CONCLUSION' && (
                            <div className="my-auto space-y-2">
                              <h3
                                className="text-sm font-bold truncate"
                                style={{
                                  fontFamily: activeTypography.headlineFont,
                                  color: activePalette.titleColor,
                                }}
                              >
                                Executive Recommendation & Actionable Takeaways
                              </h3>
                              <div
                                className="p-3 rounded-xl border space-y-1.5"
                                style={{
                                  backgroundColor: activePalette.tagBg,
                                  borderColor: activePalette.cardBorder,
                                }}
                              >
                                <div
                                  className="font-bold text-xs flex items-center gap-1.5"
                                  style={{ color: activePalette.tagText }}
                                >
                                  <span>💡 Strategic Takeaway:</span>
                                  <span style={{ fontFamily: activeTypography.headlineFont }}>
                                    High-velocity roadmap delivery with zero data loss.
                                  </span>
                                </div>
                                <p
                                  className="text-[10px] leading-relaxed opacity-90"
                                  style={{
                                    fontFamily: activeTypography.bodyFont,
                                    color: activePalette.bodyColor,
                                  }}
                                >
                                  Fully automated idempotent outbox replication guarantees sub-35ms P99 SLAs, insulating enterprise operations from downstream broker outages.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Bottom Slide Mockup Footer */}
                          <div
                            className="pt-2 border-t flex items-center justify-between text-[9px] opacity-70"
                            style={{ borderColor: activePalette.cardBorder }}
                          >
                            <span>LOGITIX AI Studio • {activePalette.name}</span>
                            <span style={{ fontFamily: activeTypography.headlineFont }}>
                              {activeTypography.headlineFont} + {activeTypography.bodyFont}
                            </span>
                          </div>
                        </div>

                        {/* Slide Layout Switcher Tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-medium">
                          <span className="text-zinc-400 font-semibold text-[9px] mr-1">Preview Layout:</span>
                          {(['TITLE', 'TWO_COLUMNS', 'METRIC_HIGHLIGHT', 'TIMELINE', 'CONCLUSION'] as SlideLayoutType[]).map((layoutKey) => (
                            <button
                              key={layoutKey}
                              type="button"
                              onClick={() => setPreviewSlideLayout(layoutKey)}
                              className={`px-2 py-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                previewSlideLayout === layoutKey
                                  ? 'bg-[#1a146b] text-white border-[#1a146b] shadow-2xs font-semibold'
                                  : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
                              }`}
                            >
                              {layoutKey === 'TITLE'
                                ? '1. Cover'
                                : layoutKey === 'TWO_COLUMNS'
                                ? '2. Two Columns'
                                : layoutKey === 'METRIC_HIGHLIGHT'
                                ? '3. Metric'
                                : layoutKey === 'TIMELINE'
                                ? '4. Timeline'
                                : '5. Conclusion'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3 Template Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['Executive', 'Technical', 'Creative'] as TemplateCategoryType[]).map((category) => {
                  const tpl = SLIDE_TEMPLATES[category];
                  const isSelected = selectedTemplate === category;

                  return (
                    <div
                      key={category}
                      onClick={() => handleSelectTemplate(category)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left group ${
                        isSelected
                          ? 'shadow-xs ring-2'
                          : 'border-[#e2e2e2] bg-[#fcfcfc] hover:border-zinc-400 hover:bg-white'
                      }`}
                      style={{
                        borderColor: isSelected ? activePalette.primaryAccent : undefined,
                        boxShadow: isSelected ? `0 0 0 2px ${activePalette.primaryAccent}20` : undefined,
                        backgroundColor: isSelected ? `${activePalette.primaryAccent}08` : undefined,
                      }}
                    >
                      <div>
                        {/* Top Header: Icon, Badge & Radio Check */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                category === 'Executive'
                                  ? 'bg-indigo-100 text-[#1a146b]'
                                  : category === 'Technical'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {category === 'Executive' && <Briefcase className="w-4 h-4" />}
                              {category === 'Technical' && <Cpu className="w-4 h-4" />}
                              {category === 'Creative' && <Sparkles className="w-4 h-4" />}
                            </div>
                            <span
                              className={`text-[10px] font-code font-bold px-2 py-0.5 rounded ${
                                category === 'Executive'
                                  ? 'bg-indigo-100/70 text-[#1a146b]'
                                  : category === 'Technical'
                                  ? 'bg-sky-100/70 text-sky-800'
                                  : 'bg-emerald-100/70 text-emerald-800'
                              }`}
                            >
                              {tpl.badge}
                            </span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'text-white shadow-2xs'
                                : 'border-zinc-300 bg-white group-hover:border-zinc-400'
                            }`}
                            style={{
                              backgroundColor: isSelected ? activePalette.primaryAccent : undefined,
                              borderColor: isSelected ? activePalette.primaryAccent : undefined,
                            }}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>

                        {/* Title & Tagline with dynamic active typography */}
                        <h4
                          className="font-bold text-sm text-[#1a1c1c] transition-colors"
                          style={{ fontFamily: activeTypography.headlineFont }}
                        >
                          {tpl.title}
                        </h4>
                        <div
                          className="text-[11px] font-medium text-[#777682] mb-1.5"
                          style={{ fontFamily: activeTypography.bodyFont }}
                        >
                          {tpl.tagline}
                        </div>
                        <p
                          className="text-xs text-[#52525e] leading-relaxed line-clamp-3 mb-3"
                          style={{ fontFamily: activeTypography.bodyFont }}
                        >
                          {tpl.description}
                        </p>

                        {/* Pre-defined Slide Layout Sequence (Mini Visual Representation) */}
                        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 mb-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-[#777682]">
                            <span>Pre-defined Layout Structure:</span>
                            <span className="font-code text-zinc-500">5 Slides</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1 text-[9px] font-code">
                            {tpl.layoutSequence.map((item) => (
                              <div
                                key={item.slideNumber}
                                className={`p-1 rounded-lg text-center border flex flex-col items-center justify-center min-h-[46px] transition-all ${
                                  isSelected
                                    ? 'font-bold shadow-2xs'
                                    : 'border-zinc-200 bg-white text-zinc-600'
                                }`}
                                style={{
                                  backgroundColor: activePalette.cardBg,
                                  borderColor: isSelected ? activePalette.primaryAccent : activePalette.cardBorder,
                                  color: isSelected ? activePalette.titleColor : undefined,
                                }}
                                title={`Slide ${item.slideNumber}: ${item.title} (${item.layout})`}
                              >
                                <span
                                  className="text-[8px] opacity-70"
                                  style={{ color: isSelected ? activePalette.secondaryAccent : undefined }}
                                >
                                  #{item.slideNumber}
                                </span>
                                <span
                                  className="text-[9px] font-bold truncate max-w-full"
                                  style={{ fontFamily: activeTypography.headlineFont }}
                                >
                                  {item.layout === 'TITLE'
                                    ? 'Cover'
                                    : item.layout === 'TWO_COLUMNS'
                                    ? '2-Col'
                                    : item.layout === 'METRIC_HIGHLIGHT'
                                    ? 'Metric'
                                    : item.layout === 'TIMELINE'
                                    ? 'Roadmap'
                                    : 'Close'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Recommendations & Blueprint trigger */}
                      <div className="pt-2.5 border-t border-zinc-200/60 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium">{tpl.recommendedTheme}</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium">{tpl.recommendedAudience.split(' ')[0]}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewingTemplateBlueprint(category);
                          }}
                          className="text-[#1a146b] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Blueprint</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2-Column Grid: Left Column = Topic Prompt & Controls; Right Column = Outline & Slides Creator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Prompt & Conditions Form (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline font-bold text-sm text-[#1a1c1c] flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#1a146b]" />
                      <span>Step 2: Topic & Generation Conditions</span>
                    </h3>
                    <span className="text-[10px] font-code bg-indigo-50 text-[#1a146b] font-bold px-2 py-0.5 rounded">
                      {selectedTemplate}
                    </span>
                  </div>

                  {/* Prompt Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#1a1c1c]">
                        Presentation Topic / Core Message
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSuggestStyles(prompt, selectedTemplate)}
                        className="text-[11px] text-[#1a146b] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        title="Auto-suggest optimal color palette and typography styles for this topic"
                      >
                        <Sparkles className="w-3 h-3 text-[#1a146b]" />
                        <span>Auto-Suggest Style</span>
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe your presentation topic, key message, and objective..."
                      className="w-full text-xs p-3 rounded-xl border border-[#e2e2e2] bg-[#f9f9f8] focus:bg-white focus:border-[#1a146b] outline-none transition-all leading-relaxed text-[#1a1c1c]"
                    />
                  </div>

                  {/* Quick Inspiration Templates Tailored to Selected Layout */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[11px] font-semibold text-[#777682] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#1a146b]" />
                        <span>Recommended Topics for {SLIDE_TEMPLATES[selectedTemplate].title}:</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {SLIDE_TEMPLATES[selectedTemplate].suggestedPrompts.map((sPrompt, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            setPrompt(sPrompt);
                            handleSuggestStyles(sPrompt, selectedTemplate);
                          }}
                          className="text-[11px] p-2 rounded-xl bg-zinc-50 hover:bg-indigo-50/60 border border-zinc-200/70 hover:border-indigo-200 text-[#1a1c1c] transition-all text-left flex items-start gap-2 group cursor-pointer"
                        >
                          <span className="text-[#1a146b] font-code text-xs mt-0.5">⚡</span>
                          <span className="line-clamp-2 leading-relaxed flex-1 group-hover:text-[#1a146b]">{sPrompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                {/* Condition Controls Grid */}
                <div className="pt-3 border-t border-[#f0f0f0] space-y-3 text-xs">
                  {/* Slide Count & Audience */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-[#474651] mb-1">Slide Count</label>
                      <select
                        value={conditions.slideCount}
                        onChange={(e) =>
                          setConditions({ ...conditions, slideCount: parseInt(e.target.value, 10) })
                        }
                        className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                      >
                        <option value={3}>3 Slides (Executive Summary)</option>
                        <option value={5}>5 Slides (Standard Pitch)</option>
                        <option value={8}>8 Slides (Deep Dive)</option>
                        <option value={10}>10 Slides (Comprehensive)</option>
                        <option value={12}>12 Slides (Full Blueprint)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#474651] mb-1">Target Audience</label>
                      <select
                        value={conditions.audience}
                        onChange={(e) => setConditions({ ...conditions, audience: e.target.value as any })}
                        className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                      >
                        <option value="Executive / Board">Executive / Board</option>
                        <option value="Technical Engineering">Technical Engineering</option>
                        <option value="Investors & VC">Investors & VC</option>
                        <option value="Customers & Sales">Customers & Sales</option>
                        <option value="Internal Team">Internal Team</option>
                      </select>
                    </div>
                  </div>

                  {/* Tone & Theme */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-[#474651] mb-1">Tone & Voice</label>
                      <select
                        value={conditions.tone}
                        onChange={(e) => setConditions({ ...conditions, tone: e.target.value as any })}
                        className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                      >
                        <option value="Strategic & Authoritative">Strategic & Authoritative</option>
                        <option value="Persuasive Pitch">Persuasive Pitch</option>
                        <option value="Technical & Rigorous">Technical & Rigorous</option>
                        <option value="Inspiring & Visionary">Inspiring & Visionary</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#474651] mb-1">Design Theme</label>
                      <select
                        value={conditions.theme}
                        onChange={(e) => setConditions({ ...conditions, theme: e.target.value as any })}
                        className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                      >
                        <option value="Modern Indigo">Modern Indigo</option>
                        <option value="Executive Obsidian">Executive Obsidian (Dark)</option>
                        <option value="Emerald Growth">Emerald Growth</option>
                        <option value="Cobalt Enterprise">Cobalt Enterprise</option>
                        <option value="Minimalist Coral">Minimalist Coral</option>
                      </select>
                    </div>
                  </div>

                  {/* Feature Checkboxes */}
                  <div className="space-y-1.5 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#474651]">
                      <input
                        type="checkbox"
                        checked={conditions.includeMetrics}
                        onChange={(e) => setConditions({ ...conditions, includeMetrics: e.target.checked })}
                        className="rounded accent-[#1a146b]"
                      />
                      <span>Include Quantitative KPI / Benchmark Metric Cards</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#474651]">
                      <input
                        type="checkbox"
                        checked={conditions.includeArchitecture}
                        onChange={(e) => setConditions({ ...conditions, includeArchitecture: e.target.checked })}
                        className="rounded accent-[#1a146b]"
                      />
                      <span>Include Architecture Pillars & Execution Columns</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#474651]">
                      <input
                        type="checkbox"
                        checked={conditions.includeTakeaways}
                        onChange={(e) => setConditions({ ...conditions, includeTakeaways: e.target.checked })}
                        className="rounded accent-[#1a146b]"
                      />
                      <span>Include Key Strategic Takeaway Callout Banners</span>
                    </label>
                  </div>

                  {/* Custom Conditions Input */}
                  <div>
                    <label className="block text-[11px] font-medium text-[#474651] mb-1">
                      Custom Conditions / Specific Constraints
                    </label>
                    <input
                      type="text"
                      value={conditions.customConstraints || ''}
                      onChange={(e) => setConditions({ ...conditions, customConstraints: e.target.value })}
                      placeholder="e.g. Must include latency benchmarks and failover steps..."
                      className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-[#f9f9f8] outline-none"
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleGenerateOutline}
                    disabled={isGeneratingOutline}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1a146b] hover:bg-[#312e81] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingOutline ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingOutline ? 'Synthesizing Deck Outline...' : 'Generate Slide Deck Outline (AI)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Slide Outline Preview & Google Slides Push (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {deckPlan ? (
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="font-code text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-[#1a146b] border border-indigo-200">
                          Template: {deckPlan.conditions.templateCategory || selectedTemplate}
                        </span>
                        <span className="text-[10px] font-code text-zinc-500">
                          {deckPlan.slides.length} Slides
                        </span>
                      </div>
                      <h2 className="font-headline font-bold text-base text-[#1a1c1c]">{deckPlan.title}</h2>
                      <p className="text-xs text-[#52525e]">
                        {deckPlan.subtitle || `${deckPlan.conditions.audience} • Theme: ${deckPlan.conditions.theme}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleAddSlide}
                        className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-[#1a1c1c] text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Add a new custom slide to this presentation outline"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#1a146b]" />
                        <span>Add Slide</span>
                      </button>

                      {/* Collaborator View Quick Switch Button */}
                      <button
                        onClick={() => setActiveTab('collaborator')}
                        className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#1a146b] border border-indigo-200 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Switch to Collaborator View with real-time presence indicators and pins"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <Users className="w-3.5 h-3.5 text-[#1a146b]" />
                        <span>Collaborator View</span>
                      </button>

                      {/* Comment Discussion Drawer Toggle */}
                      <button
                        onClick={() => setIsCollaboratorDrawerOpen(!isCollaboratorDrawerOpen)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                          isCollaboratorDrawerOpen
                            ? 'bg-[#1a146b] text-white shadow-2xs'
                            : 'bg-white border border-[#e2e2e2] hover:bg-indigo-50/60 text-zinc-700'
                        }`}
                        title="Open collaborator comment threads sidebar"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Comments</span>
                        <span
                          className={`text-[10px] font-code px-1.5 py-0.2 rounded font-bold ${
                            isCollaboratorDrawerOpen
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-100 text-[#1a146b]'
                          }`}
                        >
                          {threads.filter((t) => t.status === 'open').length}
                        </span>
                      </button>

                      {/* AI Visual / Chart Generator Studio Button */}
                      <button
                        onClick={() => handleOpenVisualStudio()}
                        className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Generate high-quality placeholder illustrations or business charts with AI"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Visual / Chart Studio</span>
                      </button>

                      {/* Auto-Layout Optimizer Button */}
                      <button
                        onClick={() => {
                          setSelectedOptimizerSlideId(null);
                          setIsOptimizerModalOpen(true);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                          deckOptimizationReport && deckOptimizationReport.overflowSlidesCount > 0
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300'
                        }`}
                        title="Inspect content density and optimize container layouts based on template rules"
                      >
                        <Gauge
                          className={`w-3.5 h-3.5 ${
                            deckOptimizationReport && deckOptimizationReport.overflowSlidesCount > 0
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        />
                        <span>
                          {deckOptimizationReport && deckOptimizationReport.overflowSlidesCount > 0
                            ? `Layout Optimizer (${deckOptimizationReport.overflowSlidesCount})`
                            : 'Layouts Optimal'}
                        </span>
                      </button>

                      {/* 1-Click Auto-Fix All Overflows Button */}
                      {deckOptimizationReport && deckOptimizationReport.overflowSlidesCount > 0 && (
                        <button
                          onClick={handleBatchOptimize}
                          className="px-2.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer animate-pulse"
                          title="Automatically reorganize all overlong slides into optimal template layouts"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-200" />
                          <span>Auto-Fix All</span>
                        </button>
                      )}

                      {/* Export PDF Button */}
                      <button
                        onClick={() => handleExportPDF()}
                        disabled={isExportingPDF}
                        className="px-3 py-2 rounded-xl bg-white border border-[#e2e2e2] hover:bg-rose-50/70 hover:border-rose-300 text-rose-800 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Export directly to high-fidelity 16:9 widescreen PDF"
                      >
                        <Download className={`w-3.5 h-3.5 text-rose-600 ${isExportingPDF ? 'animate-bounce' : ''}`} />
                        <span>{isExportingPDF ? 'Exporting PDF...' : 'Export PDF'}</span>
                      </button>

                      {/* Export PPTX Button */}
                      <button
                        onClick={() => handleExportPPTX()}
                        disabled={isExportingPPTX}
                        className="px-3 py-2 rounded-xl bg-white border border-[#e2e2e2] hover:bg-amber-50/70 hover:border-amber-300 text-amber-900 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Export directly to Microsoft PowerPoint (.pptx) with speaker notes"
                      >
                        <Download className={`w-3.5 h-3.5 text-amber-600 ${isExportingPPTX ? 'animate-bounce' : ''}`} />
                        <span>{isExportingPPTX ? 'Exporting PPTX...' : 'Export PPTX'}</span>
                      </button>

                      {/* Export Options Modal Button */}
                      <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Configure export format, theme, notes, and source"
                      >
                        <Sliders className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="hidden sm:inline">Export Options</span>
                      </button>

                      <button
                        onClick={handleExportDeckJson}
                        className="px-3 py-2 rounded-xl bg-white border border-[#e2e2e2] hover:bg-zinc-50 text-[#474651] text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Copy outline schema as JSON"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#777682]" />
                        <span>JSON</span>
                      </button>

                      <button
                        onClick={promptCreateInGoogleSlides}
                        disabled={isBuildingGoogleSlides}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isBuildingGoogleSlides ? 'animate-bounce' : ''}`} />
                        <span>
                          {isBuildingGoogleSlides ? 'Creating in Google Slides...' : 'Create in Google Slides'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Created Presentation Success Banner */}
                  {createdPresentation && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="font-headline font-bold text-sm">
                            Presentation Live in Google Slides!
                          </span>
                        </div>
                        <span className="text-[10px] font-code px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          ID: {createdPresentation.id.slice(0, 12)}...
                        </span>
                      </div>

                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Created "{createdPresentation.title}" with {createdPresentation.slideCount} slides in your Google
                        Drive. You can open and edit it directly in Google Slides, download as PDF/PPTX, or view the live interactive presentation below.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={createdPresentation.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <span>Open in Google Slides</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleCopyLink(createdPresentation.url)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-medium hover:bg-emerald-50 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                        </button>

                        <button
                          onClick={() => handleExportPDF('google')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-800 text-xs font-semibold hover:bg-rose-50 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Download official PDF from Google Slides"
                        >
                          <Download className="w-3.5 h-3.5 text-rose-600" />
                          <span>Download PDF</span>
                        </button>

                        <button
                          onClick={() => handleExportPPTX('google')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-900 text-xs font-semibold hover:bg-amber-50 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Download official PowerPoint (.pptx) from Google Slides"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-600" />
                          <span>Download PPTX</span>
                        </button>
                      </div>

                      {/* Embedded Live Google Slides Iframe */}
                      <div className="mt-3 rounded-xl overflow-hidden border border-emerald-200 bg-white aspect-video relative">
                        <iframe
                          src={createdPresentation.embedUrl}
                          title="Google Slides Presentation Live Preview"
                          className="w-full h-full border-0"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  {/* Slide Cards Preview List with Interactive Inline Editing */}
                  <div className="space-y-3">
                    {deckPlan.slides.map((slide, idx) => {
                      const isEditing = editingSlideId === slide.id;
                      const slideAnalysis = deckOptimizationReport?.slideAnalyses.find(
                        (a) => a.slideId === slide.id
                      );
                      const hasOverflow = slideAnalysis && slideAnalysis.status !== 'OPTIMAL';

                      return (
                        <div
                          key={slide.id}
                          id={`slide_card_${slide.id}`}
                          className={`p-4 rounded-2xl bg-white border shadow-xs transition-all space-y-3 ${
                            isEditing ? 'border-[#1a146b] ring-1 ring-[#1a146b]/20 bg-indigo-50/10' : 'border-[#e2e2e2] hover:border-[#1a146b]'
                          }`}
                        >
                          {/* Slide Header & Controls */}
                          <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-code text-xs font-bold text-[#1a146b]">
                                {slide.slideNumber}
                              </span>
                              <span className="font-semibold text-xs text-[#1a1c1c] truncate max-w-xs md:max-w-md">
                                {slide.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Collaborator Presence on this slide */}
                              {(() => {
                                const activeCollab = collaborators.find(
                                  (c) => c.activeSlideId === slide.id || c.activeSlideNumber === slide.slideNumber
                                );
                                if (!activeCollab) return null;
                                return (
                                  <span
                                    className="text-[9px] font-code px-2 py-0.5 rounded-full font-bold text-white flex items-center gap-1 shadow-2xs mr-1"
                                    style={{ backgroundColor: activeCollab.color }}
                                    title={`${activeCollab.name} (${activeCollab.role}) is viewing this slide`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                    <span>{activeCollab.name.split(' ')[0]}</span>
                                  </span>
                                );
                              })()}

                              {/* Slide Comments Badge */}
                              {(() => {
                                const sComments = threads.filter((t) => t.slideId === slide.id);
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCommentThreadId(sComments[0]?.id || null);
                                      setIsCollaboratorDrawerOpen(true);
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer mr-1 ${
                                      sComments.length > 0
                                        ? 'bg-indigo-50 text-[#1a146b] border border-indigo-200 hover:bg-indigo-100'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                                    title={`${sComments.length} collaborator comments on this slide. Click to open review threads.`}
                                  >
                                    <MessageSquare className="w-3 h-3 text-indigo-600" />
                                    <span>{sComments.length}</span>
                                  </button>
                                );
                              })()}

                              {/* Container Capacity Indicator */}
                              {slideAnalysis && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOptimizerSlideId(slide.id);
                                    setIsOptimizerModalOpen(true);
                                  }}
                                  className={`text-[10px] font-code px-2 py-0.5 rounded font-bold cursor-pointer transition-all mr-1 flex items-center gap-1 ${
                                    slideAnalysis.status === 'CRITICAL_OVERFLOW'
                                      ? 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                                      : slideAnalysis.status === 'MODERATE_OVERFLOW'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title={`Container Capacity: ${slideAnalysis.capacityScore}% (${slideAnalysis.bulletCount} bullets, ${slideAnalysis.totalChars} chars). Click to open layout optimizer.`}
                                >
                                  <Gauge className="w-2.5 h-2.5" />
                                  <span>{slideAnalysis.capacityScore}% cap</span>
                                </button>
                              )}

                              <span className="text-[10px] font-code px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold uppercase mr-1">
                                {slide.layout.replace(/_/g, ' ')}
                              </span>

                              {/* Reorder Buttons */}
                              <button
                                onClick={() => handleMoveSlide(slide.id, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-20 transition-all cursor-pointer"
                                title="Move slide up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveSlide(slide.id, 'down')}
                                disabled={idx === deckPlan.slides.length - 1}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-20 transition-all cursor-pointer"
                                title="Move slide down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Slide AI Visual Button */}
                              <button
                                onClick={() => handleOpenVisualStudio(slide.id)}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                  slide.imageUrl
                                    ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-200'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-purple-50 hover:text-purple-900'
                                }`}
                                title={
                                  slide.imageUrl
                                    ? 'Regenerate or change AI visual / chart'
                                    : 'Generate AI placeholder illustration or business chart for this slide'
                                }
                              >
                                <ImageIcon className="w-3 h-3 text-purple-600" />
                                <span>{slide.imageUrl ? 'Visual' : '+ Visual'}</span>
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => setEditingSlideId(isEditing ? null : slide.id)}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                  isEditing
                                    ? 'bg-[#1a146b] text-white'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                }`}
                                title="Edit slide content"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{isEditing ? 'Done' : 'Edit'}</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteSlide(slide.id)}
                                className="p-1 rounded text-zinc-400 hover:text-rose-600 transition-all cursor-pointer"
                                title="Remove slide from presentation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Container Content Overflow Auto-Layout Recommendation Banner */}
                          {hasOverflow && (
                            <div
                              className={`p-3 rounded-xl border text-xs space-y-2.5 animate-in fade-in duration-200 ${
                                slideAnalysis.status === 'CRITICAL_OVERFLOW'
                                  ? 'bg-rose-50/80 border-rose-200/90 text-rose-950'
                                  : 'bg-amber-50/80 border-amber-200/90 text-amber-950'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle
                                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                                      slideAnalysis.status === 'CRITICAL_OVERFLOW'
                                        ? 'text-rose-600'
                                        : 'text-amber-600'
                                    }`}
                                  />
                                  <div>
                                    <div className="font-semibold text-xs flex items-center gap-1.5 flex-wrap">
                                      <span>
                                        {slideAnalysis.status === 'CRITICAL_OVERFLOW'
                                          ? 'Container Content Overflow Detected'
                                          : 'High Content Density Warning'}{' '}
                                        ({slideAnalysis.capacityScore}% Capacity)
                                      </span>
                                      <span className="text-[9px] font-code px-1.5 py-0.2 rounded bg-white border border-amber-300 text-amber-900 font-bold uppercase">
                                        {deckPlan.conditions.templateCategory || 'Executive'} Template
                                      </span>
                                    </div>
                                    <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
                                      {slideAnalysis.reason}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress capacity gauge */}
                                <div className="w-28 shrink-0 bg-white rounded-full h-2 overflow-hidden border border-amber-300/80 self-start sm:self-center">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      slideAnalysis.status === 'CRITICAL_OVERFLOW'
                                        ? 'bg-rose-500'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (slideAnalysis.capacityScore / 150) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Template-Aware Reorganization Suggestions */}
                              {slideAnalysis.suggestions.length > 0 && (
                                <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-semibold text-zinc-600 uppercase font-code">
                                    Suggested Reorganization:
                                  </span>
                                  {slideAnalysis.suggestions.slice(0, 2).map((sug) => (
                                    <button
                                      key={sug.id}
                                      type="button"
                                      onClick={() => handleApplyOptimization(slide.id, sug.type, sug.title)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                        sug.recommended
                                          ? 'bg-[#1a146b] text-white hover:bg-indigo-900'
                                          : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200'
                                      }`}
                                      title={`${sug.description} • ${sug.templateBenefit}`}
                                    >
                                      <Zap className="w-3 h-3 text-amber-400" />
                                      <span>{sug.title}</span>
                                      <span className="text-[9px] opacity-75 font-code font-normal">
                                        ({sug.badge})
                                      </span>
                                    </button>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOptimizerSlideId(slide.id);
                                      setIsOptimizerModalOpen(true);
                                    }}
                                    className="text-[11px] font-semibold text-[#1a146b] hover:underline cursor-pointer ml-auto flex items-center gap-0.5"
                                  >
                                    <span>All options</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* INLINE EDIT MODE */}
                          {isEditing ? (
                            <div className="space-y-3 pt-1 text-xs">
                              {/* Title & Subtitle inputs */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-[#474651] mb-1">Slide Title</label>
                                  <input
                                    type="text"
                                    value={slide.title}
                                    onChange={(e) => handleUpdateSlide(slide.id, { title: e.target.value })}
                                    className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-[#f9f9f8] focus:bg-white focus:border-[#1a146b] outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-[#474651] mb-1">Subtitle / Strategic Focus</label>
                                  <input
                                    type="text"
                                    value={slide.subtitle || ''}
                                    onChange={(e) => handleUpdateSlide(slide.id, { subtitle: e.target.value })}
                                    className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-[#f9f9f8] focus:bg-white focus:border-[#1a146b] outline-none"
                                  />
                                </div>
                              </div>

                              {/* Layout Selector */}
                              <div>
                                <label className="block text-[11px] font-medium text-[#474651] mb-1">Slide Layout Structure</label>
                                <select
                                  value={slide.layout}
                                  onChange={(e) => handleUpdateSlide(slide.id, { layout: e.target.value as any })}
                                  className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                                >
                                  <option value="TITLE">Cover / Title Slide (TITLE)</option>
                                  <option value="TITLE_AND_BODY">Standard Bullets (TITLE_AND_BODY)</option>
                                  <option value="TWO_COLUMNS">Two Columns / Pillars (TWO_COLUMNS)</option>
                                  <option value="METRIC_HIGHLIGHT">Metric KPI Highlight (METRIC_HIGHLIGHT)</option>
                                  <option value="TIMELINE">Timeline / Milestones (TIMELINE)</option>
                                  <option value="CONCLUSION">Strategic Conclusion (CONCLUSION)</option>
                                </select>
                              </div>

                              {/* Bullets Editor */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-medium text-[#474651]">Key Points / Bullets</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = slide.bullets || [];
                                      handleUpdateSlide(slide.id, { bullets: [...cur, 'New strategic point'] });
                                    }}
                                    className="text-[10px] text-[#1a146b] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Bullet</span>
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {(slide.bullets || []).map((bullet, bIdx) => (
                                    <div key={bIdx} className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        value={bullet}
                                        onChange={(e) => {
                                          const nextBullets = [...(slide.bullets || [])];
                                          nextBullets[bIdx] = e.target.value;
                                          handleUpdateSlide(slide.id, { bullets: nextBullets });
                                        }}
                                        className="flex-1 text-xs p-1.5 rounded-lg border border-[#e2e2e2] bg-white focus:border-[#1a146b] outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextBullets = (slide.bullets || []).filter((_, i) => i !== bIdx);
                                          handleUpdateSlide(slide.id, { bullets: nextBullets });
                                        }}
                                        className="p-1 rounded text-zinc-400 hover:text-rose-600 transition-colors"
                                        title="Delete bullet"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Metric Editor */}
                              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-[#1a1c1c]">KPI / Metric Card</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (slide.metric) {
                                        handleUpdateSlide(slide.id, { metric: undefined });
                                      } else {
                                        handleUpdateSlide(slide.id, {
                                          metric: { value: '50,000 /s', label: 'Throughput', trend: '+99.4% SLA' },
                                        });
                                      }
                                    }}
                                    className="text-[10px] font-semibold text-[#1a146b] hover:underline"
                                  >
                                    {slide.metric ? 'Remove Metric' : '+ Enable Metric'}
                                  </button>
                                </div>

                                {slide.metric && (
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-[#777682] mb-0.5">Value</label>
                                      <input
                                        type="text"
                                        value={slide.metric.value}
                                        onChange={(e) =>
                                          handleUpdateSlide(slide.id, {
                                            metric: { ...slide.metric!, value: e.target.value },
                                          })
                                        }
                                        className="w-full text-xs p-1.5 rounded-lg border border-[#e2e2e2] bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-[#777682] mb-0.5">Label</label>
                                      <input
                                        type="text"
                                        value={slide.metric.label}
                                        onChange={(e) =>
                                          handleUpdateSlide(slide.id, {
                                            metric: { ...slide.metric!, label: e.target.value },
                                          })
                                        }
                                        className="w-full text-xs p-1.5 rounded-lg border border-[#e2e2e2] bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-[#777682] mb-0.5">Trend / Subtext</label>
                                      <input
                                        type="text"
                                        value={slide.metric.trend || ''}
                                        onChange={(e) =>
                                          handleUpdateSlide(slide.id, {
                                            metric: { ...slide.metric!, trend: e.target.value },
                                          })
                                        }
                                        className="w-full text-xs p-1.5 rounded-lg border border-[#e2e2e2] bg-white"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Callout takeaway */}
                              <div>
                                <label className="block text-[11px] font-medium text-[#474651] mb-1">
                                  💡 Key Takeaway Callout Banner
                                </label>
                                <input
                                  type="text"
                                  value={slide.callout || ''}
                                  onChange={(e) => handleUpdateSlide(slide.id, { callout: e.target.value })}
                                  placeholder="e.g. Accelerates throughput by 10x with zero data loss."
                                  className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                                />
                              </div>

                              {/* Speaker notes */}
                              <div>
                                <label className="block text-[11px] font-medium text-[#474651] mb-1">Speaker Notes</label>
                                <input
                                  type="text"
                                  value={slide.notes || ''}
                                  onChange={(e) => handleUpdateSlide(slide.id, { notes: e.target.value })}
                                  placeholder="Notes for the presenter when delivering this slide..."
                                  className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                                />
                              </div>

                              {/* Attached Image / Visual Editor */}
                              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/90 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-950">
                                    <ImageIcon className="w-4 h-4 text-purple-700" />
                                    <span>Slide Visual / Business Chart</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenVisualStudio(slide.id)}
                                      className="text-[11px] font-semibold text-[#1a146b] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Wand2 className="w-3 h-3 text-[#1a146b]" />
                                      <span>{slide.imageUrl ? 'Replace Visual' : '+ Generate Visual'}</span>
                                    </button>
                                    {slide.imageUrl && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVisualFromSlide(slide.id)}
                                        className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {slide.imageUrl ? (
                                  <div className="flex items-center gap-3">
                                    <div
                                      onClick={() => setPreviewZoomImageUrl(slide.imageUrl!)}
                                      className="w-24 h-16 rounded-lg overflow-hidden bg-black border border-purple-300 shrink-0 cursor-pointer group/thumb relative"
                                    >
                                      <img
                                        src={slide.imageUrl}
                                        alt="Slide visual preview"
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                        <Maximize2 className="w-3 h-3 text-white" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                      <p className="text-[11px] text-zinc-700 font-medium line-clamp-1">
                                        {slide.imagePrompt || 'Custom AI Visual'}
                                      </p>
                                      <input
                                        type="text"
                                        value={slide.imageCaption || ''}
                                        onChange={(e) => handleUpdateSlide(slide.id, { imageCaption: e.target.value })}
                                        placeholder="Optional visual caption (e.g. Figure 1: Outbox Ingress Topology)..."
                                        className="w-full text-[11px] p-1.5 mt-1 rounded-lg border border-[#e2e2e2] bg-white outline-none"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-purple-800/80">
                                    No visual attached. Generate a high-resolution placeholder illustration or business chart using Gemini AI.
                                  </p>
                                )}
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingSlideId(null)}
                                  className="px-3 py-1.5 rounded-xl bg-[#1a146b] text-white text-xs font-semibold cursor-pointer"
                                >
                                  Done Editing
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* DISPLAY / PREVIEW MODE */
                            <div className="space-y-3">
                              {slide.subtitle && (
                                <div className="text-xs text-[#777682] italic">{slide.subtitle}</div>
                              )}

                              {/* Bullets or Columns */}
                              {slide.bullets && slide.bullets.length > 0 && (
                                <ul className="space-y-1 text-xs text-[#474651]">
                                  {slide.bullets.map((b, bIdx) => (
                                    <li key={bIdx} className="flex items-start gap-1.5">
                                      <span className="text-[#1a146b] font-bold">•</span>
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {/* Two Columns Layout Preview */}
                              {slide.leftColumn && slide.rightColumn && (
                                <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                                  <div>
                                    <div className="text-[10px] font-code font-bold text-[#1a146b] mb-1">
                                      DOMAIN PILLARS:
                                    </div>
                                    <ul className="space-y-1 text-[#474651]">
                                      {slide.leftColumn.map((b, i) => (
                                        <li key={i}>• {b}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-code font-bold text-[#1a146b] mb-1">
                                      EXECUTION STRATEGY:
                                    </div>
                                    <ul className="space-y-1 text-[#474651]">
                                      {slide.rightColumn.map((b, i) => (
                                        <li key={i}>• {b}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {/* Metric Highlight Preview */}
                              {slide.metric && (
                                <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="text-[10px] text-[#777682]">{slide.metric.label}</div>
                                    <div className="text-lg font-bold font-headline text-[#1a146b]">
                                      {slide.metric.value}
                                    </div>
                                  </div>
                                  {slide.metric.trend && (
                                    <span className="text-[10px] font-code font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                      {slide.metric.trend}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Callout Banner Preview */}
                              {slide.callout && (
                                <div className="text-[11px] text-[#474651] bg-[#f8f9fa] p-2 rounded-lg border border-[#e2e2e2] flex items-center gap-1.5 font-code">
                                  <span className="text-amber-500 font-bold">💡 Takeaway:</span>
                                  <span>{slide.callout}</span>
                                </div>
                              )}

                              {/* Attached AI Slide Visual or Business Chart Banner */}
                              {slide.imageUrl ? (
                                <div className="mt-3 rounded-xl border border-purple-200 bg-zinc-950 p-2 overflow-hidden shadow-xs relative group">
                                  <div className="relative rounded-lg overflow-hidden aspect-video bg-black flex items-center justify-center">
                                    <img
                                      src={slide.imageUrl}
                                      alt={slide.imagePrompt || slide.title}
                                      className="w-full h-full object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Overlay actions on hover */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewZoomImageUrl(slide.imageUrl!)}
                                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
                                        title="Zoom preview"
                                      >
                                        <Maximize2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVisualStudio(slide.id)}
                                        className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Regenerate or change visual"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Replace</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVisualFromSlide(slide.id)}
                                        className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                                        title="Remove visual"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1.5 px-1 text-[10px] text-zinc-400">
                                    <span className="truncate max-w-xs font-code">
                                      {slide.imagePrompt ? `🎨 ${slide.imagePrompt.slice(0, 48)}...` : 'AI Generated Visual'}
                                    </span>
                                    <span className="font-code text-purple-400 shrink-0">16:9 • Gemini Visual</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 text-xs">
                                  <div className="flex items-center gap-2 text-zinc-500">
                                    <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-[11px]">No visual illustration or chart attached</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVisualStudio(slide.id)}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:border-purple-300 hover:bg-purple-50/50 text-purple-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                                  >
                                    <Wand2 className="w-3 h-3 text-purple-600" />
                                    <span>+ Visual / Chart</span>
                                  </button>
                                </div>
                              )}

                              {/* Speaker Notes */}
                              {slide.notes && (
                                <div className="text-[10px] text-[#777682] pt-1 border-t border-[#f0f0f0]">
                                  <strong>Speaker Notes:</strong> {slide.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="p-10 rounded-2xl bg-white border border-[#e2e2e2] text-center space-y-4 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#1a146b] mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base text-[#1a1c1c]">
                      No Slide Outline Generated Yet
                    </h3>
                    <p className="text-xs text-[#52525e] max-w-md mx-auto mt-1">
                      Configure your prompt, target audience, slide count, and conditions on the left, then click{' '}
                      <strong>"Generate Slide Deck Outline"</strong> to preview your presentation before creating it in
                      Google Slides.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* =========================================================================
            TAB 2: GOOGLE DRIVE PRESENTATIONS LIBRARY
           ========================================================================= */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#e2e2e2] shadow-xs">
              <div>
                <h3 className="font-headline font-bold text-sm text-[#1a1c1c]">
                  Your Google Slides Presentations in Google Drive
                </h3>
                <p className="text-xs text-[#52525e]">
                  Browse, open, or manage presentation decks created or stored in your connected Google account.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLibraryPresentations}
                  disabled={isLoadingLibrary || !accessToken}
                  className="px-3 py-1.5 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs font-semibold text-[#1a1c1c] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {!accessToken ? (
              <div className="p-10 rounded-2xl bg-white border border-[#e2e2e2] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="font-headline font-bold text-sm text-[#1a1c1c]">
                  Google Account Connection Required
                </h4>
                <p className="text-xs text-[#52525e] max-w-sm mx-auto">
                  Sign in with Google to view and manage presentations stored in your Google Drive.
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  className="px-4 py-2 rounded-xl bg-[#1a146b] text-white text-xs font-semibold shadow-xs"
                >
                  Sign in with Google
                </button>
              </div>
            ) : isLoadingLibrary ? (
              <div className="p-12 text-center text-xs text-[#777682] font-code">
                Loading Google Drive presentations...
              </div>
            ) : drivePresentations.length === 0 ? (
              <div className="p-10 rounded-2xl bg-white border border-[#e2e2e2] text-center space-y-2">
                <p className="text-xs text-[#777682]">No presentations found in your Google Drive.</p>
                <button
                  onClick={() => setActiveTab('creator')}
                  className="text-xs text-[#1a146b] font-semibold hover:underline"
                >
                  Create your first presentation now →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivePresentations.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 rounded-2xl bg-white border border-[#e2e2e2] hover:border-[#1a146b] shadow-xs transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-code text-[#777682]">Google Slides</span>
                      </div>
                      <h4 className="font-semibold text-xs text-[#1a1c1c] line-clamp-2 leading-snug">
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-[#777682] mt-1">
                        Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0] text-xs">
                      <div className="flex items-center gap-2">
                        <a
                          href={file.webViewLink || `https://docs.google.com/presentation/d/${file.id}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#1a146b] hover:underline flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          onClick={() => handleExportDriveFile(file.id, file.name, 'pdf')}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 text-zinc-600 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Download as PDF"
                        >
                          <Download className="w-2.5 h-2.5 text-rose-600" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => handleExportDriveFile(file.id, file.name, 'pptx')}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-amber-50 hover:text-amber-800 text-zinc-600 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Download as PowerPoint (.pptx)"
                        >
                          <Download className="w-2.5 h-2.5 text-amber-600" />
                          <span>PPTX</span>
                        </button>
                      </div>

                      <button
                        onClick={() => promptDeletePresentation(file)}
                        className="p-1 rounded text-[#777682] hover:text-[#ba1a1a] transition-colors cursor-pointer"
                        title="Delete from Google Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: COLLABORATOR VIEW & REAL-TIME SIMULATED TEAM DISCUSSION
           ========================================================================= */}
        {activeTab === 'collaborator' && (
          <div className="space-y-4">
            {deckPlan ? (
              <CollaboratorDeckView
                deckPlan={deckPlan}
                collaborators={collaborators}
                threads={threads}
                currentUser={CURRENT_USER}
                activePalette={activePalette}
                activeTypography={activeTypography}
                isSimulationActive={isSimulationActive}
                onToggleSimulation={() => setIsSimulationActive(!isSimulationActive)}
                onSimulateTeammateComment={handleSimulateTeammateComment}
                onAddComment={handleAddComment}
                onAddReply={handleAddReply}
                onResolveThread={handleResolveThread}
                onReopenThread={handleReopenThread}
                onDeleteThread={handleDeleteThread}
                onToggleReaction={handleToggleReaction}
                onExportPDF={handleExportPDF}
                onExportPPTX={handleExportPPTX}
                onCreateGoogleSlides={promptCreateInGoogleSlides}
              />
            ) : (
              <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#e2e2e2] shadow-xs text-center space-y-5 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-[#1a146b] flex items-center justify-center mx-auto shadow-xs">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-headline font-bold text-lg text-[#1a1c1c]">
                    Collaborator Real-Time Review View
                  </h3>
                  <p className="text-xs text-[#52525e] leading-relaxed max-w-md mx-auto">
                    Simulate real-time teammate presence indicators, interactive comment pins, and cross-functional feedback threads across your presentation decks with VP of Product, Systems Architect, and CFO.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleGenerateOutline();
                    }}
                    disabled={isGeneratingOutline}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1a146b] hover:bg-indigo-900 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingOutline ? 'animate-spin' : ''}`} />
                    <span>
                      {isGeneratingOutline ? 'Synthesizing Deck with Collaborators...' : 'Generate Deck with Live Team Review'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('creator')}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Configure in Outline Creator
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide-over Collaborator Discussion Drawer for Outline Creator */}
      {isCollaboratorDrawerOpen && deckPlan && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCollaboratorDrawerOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <CollaboratorDiscussionPanel
              deckPlan={deckPlan}
              threads={threads}
              collaborators={collaborators}
              currentUser={CURRENT_USER}
              selectedThreadId={selectedCommentThreadId}
              activeFilterSlideId={null}
              onSelectThread={setSelectedCommentThreadId}
              onAddComment={handleAddComment}
              onAddReply={handleAddReply}
              onResolveThread={handleResolveThread}
              onReopenThread={handleReopenThread}
              onDeleteThread={handleDeleteThread}
              onToggleReaction={handleToggleReaction}
              onScrollToSlide={(slideId) => {
                const el = document.getElementById(`slide_card_${slideId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              onClose={() => setIsCollaboratorDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          MANDATORY USER CONFIRMATION DIALOG FOR WORKSPACE OPERATIONS
         ========================================================================= */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e2e2] space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  confirmModal.isDestructive
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-indigo-50 text-[#1a146b] border border-indigo-200'
                }`}
              >
                {confirmModal.isDestructive ? <AlertCircle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              </div>
              <h3 className="font-headline font-bold text-base text-[#1a1c1c]">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs text-[#52525e] leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f0]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs font-semibold text-[#474651] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#1a146b] hover:bg-[#312e81]'
                }`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SLIDE LAYOUT TEMPLATE BLUEPRINT PREVIEW MODAL
         ========================================================================= */}
      {previewingTemplateBlueprint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#e2e2e2] space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    previewingTemplateBlueprint === 'Executive'
                      ? 'bg-indigo-100 text-[#1a146b]'
                      : previewingTemplateBlueprint === 'Technical'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {previewingTemplateBlueprint === 'Executive' && <Briefcase className="w-5 h-5" />}
                  {previewingTemplateBlueprint === 'Technical' && <Cpu className="w-5 h-5" />}
                  {previewingTemplateBlueprint === 'Creative' && <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-[#1a1c1c]">
                      {SLIDE_TEMPLATES[previewingTemplateBlueprint].title}
                    </h3>
                    <span className="text-[10px] font-code px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold">
                      {SLIDE_TEMPLATES[previewingTemplateBlueprint].badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#52525e]">
                    {SLIDE_TEMPLATES[previewingTemplateBlueprint].tagline}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewingTemplateBlueprint(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#474651] leading-relaxed">
              {SLIDE_TEMPLATES[previewingTemplateBlueprint].description}
            </p>

            {/* Slide Layout Sequence Blueprint */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#1a1c1c] uppercase font-code tracking-wide">
                  Pre-defined Slide Sequence & Layout Structure
                </h4>
                <span className="text-[10px] font-code text-zinc-500">
                  {SLIDE_TEMPLATES[previewingTemplateBlueprint].layoutSequence.length} Slides Pre-structured
                </span>
              </div>

              <div className="space-y-2.5">
                {SLIDE_TEMPLATES[previewingTemplateBlueprint].layoutSequence.map((item) => (
                  <div
                    key={item.slideNumber}
                    className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start justify-between gap-3 text-xs hover:border-zinc-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-white border border-zinc-300 flex items-center justify-center font-code font-bold text-[11px] text-[#1a146b] shrink-0 mt-0.5 shadow-2xs">
                        {item.slideNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#1a1c1c]">{item.title}</span>
                          <span className="text-[9px] font-code px-1.5 py-0.2 rounded bg-indigo-50 text-[#1a146b] font-bold">
                            {item.layout}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#52525e] mt-0.5">{item.purpose}</p>
                      </div>
                    </div>

                    {/* Layout visual badge / miniature tag */}
                    <div className="text-[10px] font-code text-zinc-500 bg-white border border-zinc-200 px-2 py-1 rounded-md shrink-0 shadow-2xs">
                      {item.layout === 'TITLE' && 'Executive Hero Title'}
                      {item.layout === 'TWO_COLUMNS' && '2-Pillars / Contrast'}
                      {item.layout === 'METRIC_HIGHLIGHT' && 'KPI Hero Metric Card'}
                      {item.layout === 'TIMELINE' && 'Phased Milestones'}
                      {item.layout === 'CONCLUSION' && 'Strategic Takeaways'}
                      {item.layout === 'TITLE_AND_BODY' && 'Bulleted Body'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#f0f0f0]">
              <div className="text-[11px] text-[#777682]">
                Recommended Theme: <strong className="text-zinc-800">{SLIDE_TEMPLATES[previewingTemplateBlueprint].recommendedTheme}</strong> • Tone: <strong className="text-zinc-800">{SLIDE_TEMPLATES[previewingTemplateBlueprint].recommendedTone}</strong>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPreviewingTemplateBlueprint(null)}
                  className="px-4 py-2 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs font-semibold text-[#474651] transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectTemplate(previewingTemplateBlueprint);
                    setPreviewingTemplateBlueprint(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1a146b] hover:bg-[#312e81] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply {SLIDE_TEMPLATES[previewingTemplateBlueprint].title}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          EXPORT TO PDF / PPTX PRESENTATION MODAL
         ========================================================================= */}
      {isExportModalOpen && deckPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#e2e2e2] space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#1a146b]">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-[#1a1c1c]">
                    Export Presentation Deck
                  </h3>
                  <p className="text-xs text-[#52525e]">
                    Download your slide deck as an executive PDF or native PowerPoint (.pptx).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Deck Brief Card */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-code font-bold uppercase tracking-wider text-[#1a146b] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {deckPlan.conditions.templateCategory || selectedTemplate} Template
                </span>
                <span className="text-[11px] font-code text-zinc-500 font-medium">
                  {deckPlan.slides.length} Widescreen 16:9 Slides
                </span>
              </div>
              <h4 className="font-semibold text-xs text-[#1a1c1c] line-clamp-1">{deckPlan.title}</h4>
              <p className="text-[11px] text-[#777682] line-clamp-1">
                Audience: {deckPlan.conditions.audience} • Theme: {deckPlan.conditions.theme}
              </p>
            </div>

            {/* Format Selection Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1a1c1c]">
                Choose Export Format
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* PDF Option */}
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    exportFormat === 'pdf'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                      : 'border-[#e2e2e2] bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    {exportFormat === 'pdf' && (
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#1a1c1c]">PDF Document (.pdf)</div>
                  <p className="text-[11px] text-[#52525e] mt-1 leading-snug">
                    Crisp 16:9 vector layouts. Universal viewing across all devices and printers.
                  </p>
                  <span className="inline-block mt-2 text-[9px] font-code font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                    VECTOR 16:9
                  </span>
                </button>

                {/* PPTX Option */}
                <button
                  type="button"
                  onClick={() => setExportFormat('pptx')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    exportFormat === 'pptx'
                      ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                      : 'border-[#e2e2e2] bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    {exportFormat === 'pptx' && (
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#1a1c1c]">PowerPoint (.pptx)</div>
                  <p className="text-[11px] text-[#52525e] mt-1 leading-snug">
                    Fully editable native slides, shapes, bullet points, and presenter speaker notes.
                  </p>
                  <span className="inline-block mt-2 text-[9px] font-code font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                    MICROSOFT PPTX
                  </span>
                </button>
              </div>
            </div>

            {/* Source Selection (If created in Google Slides) */}
            {createdPresentation?.id && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-[#1a1c1c]">
                  Export Engine
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      exportSourcePreference === 'native'
                        ? 'border-[#1a146b] bg-indigo-50/30'
                        : 'border-[#e2e2e2] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportSource"
                      checked={exportSourcePreference === 'native'}
                      onChange={() => setExportSourcePreference('native')}
                      className="mt-0.5 accent-[#1a146b]"
                    />
                    <div>
                      <div className="font-semibold text-xs text-[#1a1c1c]">LOGITIX High-Fi Render</div>
                      <p className="text-[10px] text-[#777682] leading-tight">
                        Instant client export with {deckPlan.conditions.theme} palette & inline edits.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      exportSourcePreference === 'google'
                        ? 'border-emerald-600 bg-emerald-50/30'
                        : 'border-[#e2e2e2] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportSource"
                      checked={exportSourcePreference === 'google'}
                      onChange={() => setExportSourcePreference('google')}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="font-semibold text-xs text-[#1a1c1c]">Google Drive Official</div>
                      <p className="text-[10px] text-[#777682] leading-tight">
                        Downloaded from your synced Google Slides file on Drive.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Content Options */}
            <div className="space-y-2 pt-1 border-t border-[#f0f0f0]">
              <label className="block text-xs font-semibold text-[#1a1c1c]">
                Include Content Options
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[#474651]">
                  <input
                    type="checkbox"
                    checked={exportIncludeNotes}
                    onChange={(e) => setExportIncludeNotes(e.target.checked)}
                    className="rounded accent-[#1a146b]"
                  />
                  <span>Include Presenter Speaker Notes (available in PPTX notes view & PDF summary)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#474651]">
                  <input
                    type="checkbox"
                    checked={exportIncludeFooter}
                    onChange={(e) => setExportIncludeFooter(e.target.checked)}
                    className="rounded accent-[#1a146b]"
                  />
                  <span>Include Slide Numbers and LOGITIX Workspace Branding Footer</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0]">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs font-semibold text-[#474651] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => (exportFormat === 'pdf' ? handleExportPDF() : handleExportPPTX())}
                disabled={isExportingPDF || isExportingPPTX}
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  exportFormat === 'pdf'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <Download className={`w-3.5 h-3.5 ${(isExportingPDF || isExportingPPTX) ? 'animate-bounce' : ''}`} />
                <span>
                  {exportFormat === 'pdf'
                    ? isExportingPDF
                      ? 'Generating PDF...'
                      : 'Download PDF'
                    : isExportingPPTX
                    ? 'Generating PPTX...'
                    : 'Download PPTX'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          AI SLIDE VISUAL & BUSINESS CHART STUDIO MODAL
         ========================================================================= */}
      {isVisualModalOpen && deckPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#e2e2e2] space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-[#1a1c1c]">
                      AI Slide Visual & Business Chart Studio
                    </h3>
                    <span className="text-[10px] font-code bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold">
                      GEMINI VISION
                    </span>
                  </div>
                  <p className="text-xs text-[#52525e]">
                    Generate high-quality placeholder illustrations or business charts for your presentation using AI.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsVisualModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Slide & Mode Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div>
                <label className="block text-[11px] font-semibold text-[#1a1c1c] mb-1">
                  Target Slide to Attach Visual
                </label>
                <select
                  value={visualTargetSlideId || ''}
                  onChange={(e) => setVisualTargetSlideId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#e2e2e2] bg-white text-[#1a1c1c] outline-none"
                >
                  {deckPlan.slides.map((s) => (
                    <option key={s.id} value={s.id}>
                      Slide {s.slideNumber}: {s.title.length > 40 ? s.title.slice(0, 38) + '...' : s.title} ({s.layout})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1a1c1c] mb-1">
                  Visual Asset Category
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setVisualType('chart');
                      setVisualStyle('data-chart');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      visualType === 'chart'
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Chart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisualType('diagram');
                      setVisualStyle('corporate-isometric');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      visualType === 'diagram'
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Diagram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisualType('illustration');
                      setVisualStyle('business-vector');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      visualType === 'illustration'
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Artwork</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1a1c1c] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Curated Business Presets ({visualType.toUpperCase()})</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-code">Click preset to load prompt</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {SLIDE_VISUAL_PRESETS.filter((p) => p.category === visualType).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-left transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-[#1a1c1c] group-hover:text-purple-900 truncate">
                        {preset.title}
                      </span>
                      <span className="text-[9px] font-code px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-bold shrink-0">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#777682] line-clamp-1 leading-snug">
                      {preset.tagline}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input & Style Controls */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1a1c1c] mb-1">
                  AI Visual Description / Chart Parameters
                </label>
                <textarea
                  rows={3}
                  value={visualPrompt}
                  onChange={(e) => setVisualPrompt(e.target.value)}
                  placeholder="Describe your business chart, architecture diagram, or slide illustration..."
                  className="w-full text-xs p-3 rounded-xl border border-[#e2e2e2] bg-[#f9f9f8] focus:bg-white focus:border-purple-600 outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Style & Aspect Ratio Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-[#474651] mb-1">
                    Visual Art Style
                  </label>
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                  >
                    <option value="data-chart">Business Data Visualization (Charts & Graphs)</option>
                    <option value="corporate-isometric">Corporate Isometric 3D (Topology & Systems)</option>
                    <option value="business-vector">Polished Corporate Vector (Pitch Deck)</option>
                    <option value="3d-render">Futuristic 3D Render (High Tech & AI)</option>
                    <option value="blueprint-diagram">Technical Blueprint Diagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#474651] mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={visualAspectRatio}
                    onChange={(e) => setVisualAspectRatio(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-xl border border-[#e2e2e2] bg-white outline-none"
                  >
                    <option value="16:9">16:9 (Standard Widescreen Slide Banner)</option>
                    <option value="4:3">4:3 (Column / Slide Card Panel)</option>
                    <option value="1:1">1:1 (Square Hero Badge / Icon)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateSlideVisual}
                disabled={isGeneratingVisual}
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Wand2 className={`w-4 h-4 ${isGeneratingVisual ? 'animate-spin' : ''}`} />
                <span>{isGeneratingVisual ? 'Synthesizing Visual Asset with AI...' : 'Generate Visual with AI'}</span>
              </button>
            </div>

            {/* Generated Result Preview Card */}
            {generatedVisualResult && (
              <div className="p-4 rounded-2xl bg-zinc-950 text-white border border-purple-900/60 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">Visual Generated Successfully</span>
                  </div>
                  <span className="text-[10px] font-code px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-800">
                    Model: {generatedVisualResult.model}
                  </span>
                </div>

                {/* Main Visual Image Preview */}
                <div className="rounded-xl overflow-hidden aspect-video bg-black/80 border border-zinc-800 flex items-center justify-center relative group">
                  <img
                    src={generatedVisualResult.imageUrl}
                    alt="Generated slide visual"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewZoomImageUrl(generatedVisualResult.imageUrl)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                    title="Fullscreen zoom"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <p className="text-[11px] text-zinc-400 truncate max-w-sm">
                    {visualPrompt}
                  </p>

                  <div className="flex items-center gap-2">
                    <a
                      href={generatedVisualResult.imageUrl}
                      download={`slide_visual_${Date.now()}.png`}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleApplyVisualToSlide}
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Attach to Slide</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0]">
              <span className="text-[11px] text-[#777682]">
                Supports SVG vector infographics and neural PNG renders.
              </span>
              <button
                type="button"
                onClick={() => setIsVisualModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs font-semibold text-[#474651] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULLSCREEN IMAGE LIGHTBOX PREVIEW MODAL
         ========================================================================= */}
      {previewZoomImageUrl && (
        <div
          onClick={() => setPreviewZoomImageUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative p-2"
          >
            <div className="flex items-center justify-between p-3 border-b border-zinc-800 text-zinc-300 text-xs">
              <span className="font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>AI Slide Visual High-Resolution Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewZoomImageUrl(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-hidden">
              <img
                src={previewZoomImageUrl}
                alt="Full preview"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          AUTO-LAYOUT & CONTAINER DENSITY OPTIMIZER MODAL
         ========================================================================= */}
      {isOptimizerModalOpen && deckPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-[#e2e2e2] space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-[#1a1c1c]">
                      Auto-Layout & Container Density Optimizer
                    </h3>
                    <span className="text-[10px] font-code bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase">
                      {deckPlan.conditions.templateCategory || selectedTemplate} Profile
                    </span>
                  </div>
                  <p className="text-xs text-[#52525e]">
                    Detects overlong content, prevents container overflow, and reorganizes slide layouts based on your chosen template rules.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOptimizerModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Scorecard Bar */}
            {deckOptimizationReport && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                      deckOptimizationReport.overflowSlidesCount === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {deckOptimizationReport.optimizedSlidesCount}/{deckOptimizationReport.totalSlides}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1a1c1c]">Optimal Containers</div>
                    <div className="text-[10px] text-[#777682]">
                      {deckOptimizationReport.overflowSlidesCount === 0
                        ? 'All slides fit standard 16:9 viewports'
                        : `${deckOptimizationReport.overflowSlidesCount} slide${
                            deckOptimizationReport.overflowSlidesCount > 1 ? 's need' : ' needs'
                          } reorganization`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                      deckOptimizationReport.criticalCount > 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {deckOptimizationReport.criticalCount}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1a1c1c]">Critical Overflows</div>
                    <div className="text-[10px] text-[#777682]">
                      {deckOptimizationReport.criticalCount > 0
                        ? 'Exceeds max safe height'
                        : 'Zero severe clipping risks'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleBatchOptimize}
                    disabled={deckOptimizationReport.overflowSlidesCount === 0}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-200 disabled:text-zinc-500 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-200" />
                    <span>Auto-Optimize Entire Deck</span>
                  </button>
                </div>
              </div>
            )}

            {/* Slide Analysis Cards List */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {deckOptimizationReport?.slideAnalyses.map((analysis) => {
                const isSelected = selectedOptimizerSlideId === analysis.slideId;
                const isOverflow = analysis.status !== 'OPTIMAL';

                return (
                  <div
                    key={analysis.slideId}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isSelected
                        ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/20'
                        : isOverflow
                        ? analysis.status === 'CRITICAL_OVERFLOW'
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-amber-200 bg-amber-50/20'
                        : 'border-[#e2e2e2] bg-white'
                    }`}
                  >
                    {/* Slide Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-100 font-code text-xs font-bold text-zinc-700 flex items-center justify-center">
                          {analysis.slideNumber}
                        </span>
                        <span className="font-semibold text-xs text-[#1a1c1c] truncate max-w-sm">
                          {analysis.slideTitle}
                        </span>
                        <span className="text-[10px] font-code px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold uppercase">
                          {analysis.layout.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[10px] text-[#777682] font-code">
                            {analysis.bulletCount} bullets • {analysis.totalChars} chars
                          </span>
                          <span
                            className={`text-[10px] font-code px-2 py-0.5 rounded font-bold ${
                              analysis.status === 'CRITICAL_OVERFLOW'
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : analysis.status === 'MODERATE_OVERFLOW'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {analysis.capacityScore}% capacity
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Reason & Meter */}
                    <div className="space-y-1">
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            analysis.status === 'CRITICAL_OVERFLOW'
                              ? 'bg-rose-500'
                              : analysis.status === 'MODERATE_OVERFLOW'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (analysis.capacityScore / 150) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-[#52525e] leading-snug">
                        {analysis.reason}
                      </p>
                    </div>

                    {/* Suggestions Grid */}
                    {analysis.suggestions.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-zinc-100">
                        <div className="text-[11px] font-semibold text-[#1a1c1c] flex items-center justify-between">
                          <span>Reorganization Strategies:</span>
                          <span className="text-[10px] text-zinc-500 font-normal">
                            Select a strategy to apply immediately
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {analysis.suggestions.map((suggestion) => (
                            <div
                              key={suggestion.id}
                              className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all ${
                                suggestion.recommended
                                  ? 'border-indigo-300 bg-indigo-50/40 shadow-xs'
                                  : 'border-zinc-200 bg-white hover:bg-zinc-50'
                              }`}
                            >
                              <div className="space-y-1 mb-2">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-xs text-[#1a1c1c]">
                                    {suggestion.title}
                                  </span>
                                  <span className="text-[9px] font-code px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-bold shrink-0">
                                    {suggestion.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#52525e] leading-snug">
                                  {suggestion.description}
                                </p>
                                <p className="text-[10px] text-[#1a146b] font-medium leading-snug">
                                  💡 {suggestion.templateBenefit}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                                {suggestion.recommended && (
                                  <span className="text-[9px] font-code text-indigo-700 font-bold">
                                    ★ RECOMMENDED
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleApplyOptimization(
                                      analysis.slideId,
                                      suggestion.type,
                                      suggestion.title
                                    );
                                  }}
                                  className="ml-auto px-3 py-1 rounded-lg bg-[#1a146b] hover:bg-indigo-900 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Zap className="w-3 h-3 text-amber-400" />
                                  <span>Apply</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Content fits container margins perfectly. No reorganization needed.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0]">
              <span className="text-[11px] text-[#777682]">
                Reorganizations preserve all slide content, moving supplementary items to Speaker Notes or dedicated slides.
              </span>
              <button
                type="button"
                onClick={() => setIsOptimizerModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs font-semibold text-[#474651] transition-all cursor-pointer"
              >
                Close Optimizer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ALL 8 CURATED PRESENTATION PALETTES MODAL
         ========================================================================= */}
      {showAllPalettesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#e2e2e2] space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#1a146b]">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-[#1a1c1c]">
                    Curated Presentation Color Palettes
                  </h3>
                  <p className="text-xs text-[#52525e]">
                    Select any designer-curated high-contrast palette to style your presentation and live previews.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAllPalettesModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of all 8 palettes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(CURATED_PALETTES).map((pal) => {
                const isSelected = activePalette.id === pal.id;

                return (
                  <div
                    key={pal.id}
                    onClick={() => {
                      handleSelectPalette(pal);
                      setShowAllPalettesModal(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between group ${
                      isSelected
                        ? 'border-[#1a146b] bg-indigo-50/40 ring-2 ring-[#1a146b]/20 shadow-xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center -space-x-1.5">
                            <span
                              className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: pal.primaryAccent }}
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: pal.secondaryAccent }}
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: pal.surfaceBg }}
                            />
                          </div>
                          <span className="font-bold text-xs text-[#1a1c1c] group-hover:text-[#1a146b]">
                            {pal.name}
                          </span>
                        </div>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#1a146b] text-white flex items-center justify-center text-xs">
                            ✓
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#52525e] leading-snug mb-2">
                        {pal.reason}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-code text-zinc-500">
                      <span>{pal.category}</span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-semibold">
                        {pal.isDark ? 'Dark Surface' : 'Light Surface'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0]">
              <span className="text-[11px] text-[#777682]">
                Palettes automatically synchronize with Google Slides API, PDF export, and PPTX downloads.
              </span>
              <button
                type="button"
                onClick={() => setShowAllPalettesModal(false)}
                className="px-4 py-2 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs font-semibold text-[#474651] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
