import {
  CollaboratorUser,
  SlideCommentThread,
  SlideCommentReply,
  CollaboratorActivityEvent,
  CommentCategory,
} from '../types/collaborator';
import { PresentationDeckPlan, SlideItem } from '../types';

/**
 * Curated simulated team members representing diverse cross-functional roles
 */
export const INITIAL_COLLABORATORS: CollaboratorUser[] = [
  {
    id: 'user_sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@enterprise.internal',
    initials: 'SC',
    role: 'VP of Product',
    color: '#4f46e5', // Indigo
    bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borderColor: '#4f46e5',
    status: 'online',
    activeSlideId: null,
    activeSlideNumber: 1,
    currentAction: 'Reviewing executive summary & market framing',
    cursor: { xPercent: 28, yPercent: 34 },
    lastActive: 'Just now',
  },
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@enterprise.internal',
    initials: 'AR',
    role: 'Principal Systems Architect',
    color: '#059669', // Emerald
    bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderColor: '#059669',
    status: 'online',
    activeSlideId: null,
    activeSlideNumber: 2,
    currentAction: 'Validating architecture throughput pillars',
    cursor: { xPercent: 64, yPercent: 48 },
    lastActive: '1m ago',
  },
  {
    id: 'user_maya',
    name: 'Maya Lin',
    email: 'maya.lin@enterprise.internal',
    initials: 'ML',
    role: 'Staff Design Director',
    color: '#7c3aed', // Purple
    bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
    borderColor: '#7c3aed',
    status: 'online',
    activeSlideId: null,
    activeSlideNumber: 3,
    currentAction: 'Inspecting visual hierarchy & contrast balance',
    cursor: { xPercent: 45, yPercent: 72 },
    lastActive: 'Just now',
  },
  {
    id: 'user_david',
    name: 'David K.',
    email: 'david.k@enterprise.internal',
    initials: 'DK',
    role: 'VP Strategic Finance & Ops',
    color: '#d97706', // Amber
    bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
    borderColor: '#d97706',
    status: 'online',
    activeSlideId: null,
    activeSlideNumber: 1,
    currentAction: 'Auditing ROI metrics & capital allocation',
    cursor: { xPercent: 78, yPercent: 22 },
    lastActive: '2m ago',
  },
  {
    id: 'user_elena',
    name: 'Elena Vance',
    email: 'elena.vance@enterprise.internal',
    initials: 'EV',
    role: 'Director of Security Governance',
    color: '#e11d48', // Rose
    bgLight: 'bg-rose-50 text-rose-700 border-rose-200',
    borderColor: '#e11d48',
    status: 'idle',
    activeSlideId: null,
    activeSlideNumber: 2,
    currentAction: 'Cross-checking compliance boundary statements',
    cursor: { xPercent: 18, yPercent: 60 },
    lastActive: '5m ago',
  },
];

export const CURRENT_USER: CollaboratorUser = {
  id: 'user_me',
  name: 'You (Author)',
  email: 'author@logitix.ai',
  initials: 'ME',
  role: 'Presentation Lead',
  color: '#0284c7', // Sky
  bgLight: 'bg-sky-50 text-sky-700 border-sky-200',
  borderColor: '#0284c7',
  status: 'online',
  activeSlideId: null,
  activeSlideNumber: 1,
  currentAction: 'Editing deck outline & collaborator feedback',
  cursor: { xPercent: 50, yPercent: 50 },
  lastActive: 'Now',
  isCurrentUser: true,
};

const STORAGE_PREFIX = 'logitix_deck_comments_';

/**
 * Generate contextual seed comments tailored to the generated deck slides
 */
export function generateContextualDeckComments(deckPlan: PresentationDeckPlan): SlideCommentThread[] {
  const threads: SlideCommentThread[] = [];
  const slides = deckPlan.slides;
  if (!slides || slides.length === 0) return threads;

  // Slide 1 (Cover / Intro): Product feedback from Sarah Chen
  if (slides[0]) {
    threads.push({
      id: `comment_${deckPlan.id}_1`,
      deckId: deckPlan.id,
      slideId: slides[0].id,
      slideNumber: 1,
      slideTitle: slides[0].title,
      author: INITIAL_COLLABORATORS[0], // Sarah Chen
      content: `The title "${slides[0].title}" is compelling! Make sure our opening pitch highlights the customer ROI right away in the presenter remarks.`,
      createdAt: '12m ago',
      category: 'praise',
      pinPosition: { xPercent: 25, yPercent: 30, targetElement: 'title' },
      status: 'open',
      replies: [
        {
          id: `reply_${deckPlan.id}_1_1`,
          author: INITIAL_COLLABORATORS[3], // David K.
          content: 'Agreed @Sarah. I added an opening financial summary point in the speaker notes as well.',
          createdAt: '8m ago',
          reactions: [{ emoji: '👍', count: 2, users: ['Sarah Chen', 'You'] }],
        },
      ],
      reactions: [{ emoji: '🚀', count: 3, users: ['Alex Rivera', 'David K.', 'You'] }],
    });
  }

  // Slide 2: Technical / Architecture feedback from Alex Rivera
  if (slides[1]) {
    const s2 = slides[1];
    const isTwoCol = s2.layout === 'TWO_COLUMNS';
    threads.push({
      id: `comment_${deckPlan.id}_2`,
      deckId: deckPlan.id,
      slideId: s2.id,
      slideNumber: 2,
      slideTitle: s2.title,
      author: INITIAL_COLLABORATORS[1], // Alex Rivera
      content: isTwoCol
        ? `Clean two-column division here. Should we explicitly state the 99.99% availability SLA target in the execution pillar?`
        : `Let's make sure the key bullet points on "${s2.title}" mention our zero-data-loss failover boundary.`,
      createdAt: '24m ago',
      category: 'suggestion',
      pinPosition: { xPercent: 68, yPercent: 42, targetElement: 'bullets' },
      status: 'open',
      replies: [],
      reactions: [{ emoji: '💡', count: 2, users: ['Sarah Chen', 'Alex Rivera'] }],
    });
  }

  // Find a metric or visual slide for David K. / Maya Lin
  const metricSlide = slides.find((s) => s.layout === 'METRIC_HIGHLIGHT' || s.metric);
  if (metricSlide) {
    threads.push({
      id: `comment_${deckPlan.id}_3`,
      deckId: deckPlan.id,
      slideId: metricSlide.id,
      slideNumber: metricSlide.slideNumber,
      slideTitle: metricSlide.title,
      author: INITIAL_COLLABORATORS[3], // David K.
      content: `Regarding the metric "${metricSlide.metric?.value || 'Throughput'}": Is this figure sustained throughput or peak burst? Board members will ask for the measurement window.`,
      createdAt: '45m ago',
      category: 'question',
      pinPosition: { xPercent: 75, yPercent: 35, targetElement: 'metric' },
      status: 'open',
      replies: [
        {
          id: `reply_${deckPlan.id}_3_1`,
          author: INITIAL_COLLABORATORS[1], // Alex Rivera
          content: 'This reflects sustained P99 ingestion over a 72-hour synthetic stress harness.',
          createdAt: '30m ago',
          reactions: [{ emoji: '🔥', count: 2, users: ['David K.', 'You'] }],
        },
      ],
      reactions: [{ emoji: '👀', count: 3, users: ['Maya Lin', 'Sarah Chen', 'David K.'] }],
    });
  }

  // Slide with Takeaway / Callout or Last Slide: Design feedback from Maya Lin
  const lastSlide = slides[slides.length - 1];
  if (lastSlide && lastSlide.id !== slides[0]?.id && lastSlide.id !== metricSlide?.id) {
    threads.push({
      id: `comment_${deckPlan.id}_4`,
      deckId: deckPlan.id,
      slideId: lastSlide.id,
      slideNumber: lastSlide.slideNumber,
      slideTitle: lastSlide.title,
      author: INITIAL_COLLABORATORS[2], // Maya Lin
      content: `The closing CTA on "${lastSlide.title}" feels clean. I verified typography pairings match the template standards. Looks ready for presentation!`,
      createdAt: '1h ago',
      category: 'praise',
      pinPosition: { xPercent: 48, yPercent: 65, targetElement: 'callout' },
      status: 'resolved',
      resolvedBy: INITIAL_COLLABORATORS[2],
      resolvedAt: '50m ago',
      replies: [],
      reactions: [{ emoji: '❤️', count: 4, users: ['Sarah Chen', 'Alex Rivera', 'David K.', 'You'] }],
    });
  }

  return threads;
}

/**
 * Load comments from localStorage or initialize with seed comments
 */
export function getDeckComments(deckPlan: PresentationDeckPlan): SlideCommentThread[] {
  if (!deckPlan || !deckPlan.id) return [];
  const key = `${STORAGE_PREFIX}${deckPlan.id}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read comments from localStorage', e);
  }

  // Generate seed comments and persist
  const initialThreads = generateContextualDeckComments(deckPlan);
  saveDeckComments(deckPlan.id, initialThreads);
  return initialThreads;
}

/**
 * Persist comments to localStorage
 */
export function saveDeckComments(deckId: string, comments: SlideCommentThread[]): void {
  try {
    const key = `${STORAGE_PREFIX}${deckId}`;
    localStorage.setItem(key, JSON.stringify(comments));
  } catch (e) {
    console.warn('Could not save comments to localStorage', e);
  }
}

/**
 * Contextual simulated comment prompts to generate dynamic teammate feedback
 */
const SIMULATED_COMMENT_TEMPLATES = [
  {
    authorIdx: 0, // Sarah Chen (VP of Product)
    category: 'suggestion' as CommentCategory,
    texts: [
      'Can we add a clear customer testimonial quote or proof-of-concept metric here?',
      'Let’s ensure this slide directly links back to our strategic Q4 deliverables.',
      'Love this framing! We should use this slide as the anchor for the executive summary.',
    ],
  },
  {
    authorIdx: 1, // Alex Rivera (Principal Architect)
    category: 'question' as CommentCategory,
    texts: [
      'Has the infrastructure failover threshold been tested under multi-region split-brain scenarios?',
      'Let’s double-check if the Kafka partition count matches our newest benchmark run.',
      'Could we clarify whether this component runs synchronous RPC or asynchronous event streaming?',
    ],
  },
  {
    authorIdx: 2, // Maya Lin (Design Director)
    category: 'praise' as CommentCategory,
    texts: [
      'Visual density is well balanced here—plenty of breathing room between cards.',
      'The contrast ratio between headers and card backgrounds meets WCAG AAA standards. Great job!',
      'Consider adding an AI illustration or architecture diagram to make this slide pop even more.',
    ],
  },
  {
    authorIdx: 3, // David K. (CFO / Finance)
    category: 'question' as CommentCategory,
    texts: [
      'What is our projected cloud infrastructure cost savings per million transactions with this setup?',
      'Can we quantify the ROI timeline (e.g., payback period < 6 months)?',
      'The board will definitely ask for the margin impact of this initiative.',
    ],
  },
];

/**
 * Generates a realistic simulated teammate comment on a target slide
 */
export function createSimulatedComment(
  deckPlan: PresentationDeckPlan,
  targetSlideId?: string
): SlideCommentThread | null {
  const slides = deckPlan.slides;
  if (!slides || slides.length === 0) return null;

  const targetSlide = targetSlideId
    ? slides.find((s) => s.id === targetSlideId) || slides[0]
    : slides[Math.floor(Math.random() * slides.length)];

  // Pick random template
  const tmpl = SIMULATED_COMMENT_TEMPLATES[Math.floor(Math.random() * SIMULATED_COMMENT_TEMPLATES.length)];
  const author = INITIAL_COLLABORATORS[tmpl.authorIdx];
  const content = tmpl.texts[Math.floor(Math.random() * tmpl.texts.length)];

  const pinX = 20 + Math.floor(Math.random() * 60);
  const pinY = 25 + Math.floor(Math.random() * 50);

  const newThread: SlideCommentThread = {
    id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deckId: deckPlan.id,
    slideId: targetSlide.id,
    slideNumber: targetSlide.slideNumber,
    slideTitle: targetSlide.title,
    author,
    content,
    createdAt: 'Just now',
    category: tmpl.category,
    pinPosition: {
      xPercent: pinX,
      yPercent: pinY,
      targetElement: 'general',
    },
    status: 'open',
    replies: [],
    reactions: [],
  };

  return newThread;
}
