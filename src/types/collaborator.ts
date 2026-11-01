export interface CollaboratorUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  role: string;
  color: string; // Hex color for presence indicator and cursor
  bgLight: string; // Tailwind-friendly light color
  borderColor: string;
  status: 'online' | 'idle' | 'offline';
  activeSlideId: string | null;
  activeSlideNumber: number | null;
  currentAction: string; // e.g. "Reviewing Slide 2 KPIs", "Typing comment...", "Inspecting architecture pillars"
  cursor?: {
    xPercent: number; // 0-100%
    yPercent: number; // 0-100%
  };
  lastActive: string;
  isCurrentUser?: boolean;
}

export type CommentCategory = 'question' | 'suggestion' | 'praise' | 'blocker';

export interface CommentReaction {
  emoji: string;
  count: number;
  users: string[]; // names or IDs
}

export interface SlideCommentReply {
  id: string;
  author: CollaboratorUser;
  content: string;
  createdAt: string;
  reactions: CommentReaction[];
}

export interface SlideCommentThread {
  id: string;
  deckId: string;
  slideId: string;
  slideNumber: number;
  slideTitle: string;
  author: CollaboratorUser;
  content: string;
  createdAt: string;
  category: CommentCategory;
  pinPosition?: {
    xPercent: number; // 0-100%
    yPercent: number; // 0-100%
    targetElement?: 'title' | 'bullets' | 'metric' | 'visual' | 'notes' | 'callout' | 'general';
  };
  status: 'open' | 'resolved';
  resolvedBy?: CollaboratorUser;
  resolvedAt?: string;
  replies: SlideCommentReply[];
  reactions: CommentReaction[];
}

export interface CollaboratorActivityEvent {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  slideNumber?: number;
  action: string;
  timestamp: string;
}
