import React, { useState } from 'react';
import {
  CollaboratorUser,
  SlideCommentThread,
  CommentCategory,
} from '../../types/collaborator';
import { PresentationDeckPlan } from '../../types';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  RotateCcw,
  Trash2,
  CornerDownRight,
  Filter,
  Search,
  Plus,
  HelpCircle,
  AlertCircle,
  Lightbulb,
  Heart,
  X,
  MapPin,
  Smile,
  AtSign,
} from 'lucide-react';

interface CollaboratorDiscussionPanelProps {
  deckPlan: PresentationDeckPlan;
  threads: SlideCommentThread[];
  collaborators: CollaboratorUser[];
  currentUser: CollaboratorUser;
  selectedThreadId: string | null;
  activeFilterSlideId: string | null;
  onSelectThread: (threadId: string | null) => void;
  onAddComment: (
    slideId: string,
    content: string,
    category: CommentCategory,
    pinPosition?: { xPercent: number; yPercent: number }
  ) => void;
  onAddReply: (threadId: string, content: string) => void;
  onResolveThread: (threadId: string) => void;
  onReopenThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onToggleReaction: (threadId: string, emoji: string) => void;
  onScrollToSlide?: (slideId: string) => void;
  onClose?: () => void;
}

export const CollaboratorDiscussionPanel: React.FC<CollaboratorDiscussionPanelProps> = ({
  deckPlan,
  threads,
  collaborators,
  currentUser,
  selectedThreadId,
  activeFilterSlideId,
  onSelectThread,
  onAddComment,
  onAddReply,
  onResolveThread,
  onReopenThread,
  onDeleteThread,
  onToggleReaction,
  onScrollToSlide,
  onClose,
}) => {
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [slideFilter, setSlideFilter] = useState<string>(activeFilterSlideId || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Comment Form State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newCommentTargetSlide, setNewCommentTargetSlide] = useState<string>(
    activeFilterSlideId || deckPlan.slides[0]?.id || ''
  );
  const [newCommentCategory, setNewCommentCategory] = useState<CommentCategory>('suggestion');
  const [newCommentText, setNewCommentText] = useState('');

  // Replying state per thread: map threadId -> reply text
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [activeReplyThreadId, setActiveReplyThreadId] = useState<string | null>(null);

  // Filtered threads
  const filteredThreads = threads.filter((t) => {
    if (statusFilter === 'open' && t.status !== 'open') return false;
    if (statusFilter === 'resolved' && t.status !== 'resolved') return false;
    if (slideFilter !== 'all' && t.slideId !== slideFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchContent = t.content.toLowerCase().includes(q);
      const matchAuthor = t.author.name.toLowerCase().includes(q);
      const matchReplies = t.replies.some((r) => r.content.toLowerCase().includes(q) || r.author.name.toLowerCase().includes(q));
      if (!matchContent && !matchAuthor && !matchReplies) return false;
    }
    return true;
  });

  const handlePostNewComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    onAddComment(newCommentTargetSlide, newCommentText.trim(), newCommentCategory);
    setNewCommentText('');
    setIsComposerOpen(false);
  };

  const handlePostReply = (threadId: string) => {
    const text = replyTexts[threadId];
    if (!text || !text.trim()) return;

    onAddReply(threadId, text.trim());
    setReplyTexts((prev) => ({ ...prev, [threadId]: '' }));
    setActiveReplyThreadId(null);
  };

  const handleInsertMention = (name: string) => {
    setNewCommentText((prev) => `${prev}@${name} `);
  };

  const renderContentWithMentions = (text: string) => {
    const parts = text.split(/(@[A-Za-z0-9_.\s]+?)(?=[,!?\s]|$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-code">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#e2e2e2] shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#f0f0f0] bg-zinc-50/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-[#1a146b] flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-xs text-[#1a1c1c] flex items-center gap-1.5">
              <span>Deck Collaborator Threads</span>
              <span className="text-[10px] font-code px-1.5 py-0.2 rounded bg-indigo-100 text-[#1a146b] font-bold">
                {threads.length}
              </span>
            </h3>
            <p className="text-[10px] text-[#777682]">
              Real-time comments, inline pins & cross-functional reviews
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsComposerOpen(!isComposerOpen)}
            className="px-2.5 py-1 rounded-xl bg-[#1a146b] hover:bg-indigo-900 text-white text-xs font-semibold shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
            title="Start a new review thread on any slide"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Comment</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Ribbon & Search */}
      <div className="p-3 border-b border-[#f0f0f0] space-y-2 text-xs bg-white">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feedback by keyword or teammate..."
            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-[#1a146b] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Status Filters & Slide Selector */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All ({threads.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('open')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                statusFilter === 'open' ? 'bg-white text-[#1a146b] shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Open ({threads.filter((t) => t.status === 'open').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                statusFilter === 'resolved' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Resolved ({threads.filter((t) => t.status === 'resolved').length})
            </button>
          </div>

          {/* Slide Filter Dropdown */}
          <select
            value={slideFilter}
            onChange={(e) => setSlideFilter(e.target.value)}
            className="text-[11px] p-1 px-2 rounded-lg border border-zinc-200 bg-white outline-none cursor-pointer text-zinc-700"
          >
            <option value="all">All Slides</option>
            {deckPlan.slides.map((s) => (
              <option key={s.id} value={s.id}>
                Slide {s.slideNumber}: {s.title.slice(0, 18)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* New Comment Composer Drawer */}
      {isComposerOpen && (
        <form onSubmit={handlePostNewComment} className="p-3 bg-indigo-50/50 border-b border-indigo-100 space-y-2.5 animate-in slide-in-from-top-2 duration-150 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#1a146b] flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Collaborator Feedback</span>
            </span>
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Target Slide & Category */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Target Slide</label>
              <select
                value={newCommentTargetSlide}
                onChange={(e) => setNewCommentTargetSlide(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg border border-indigo-200 bg-white outline-none"
              >
                {deckPlan.slides.map((s) => (
                  <option key={s.id} value={s.id}>
                    Slide {s.slideNumber}: {s.title.slice(0, 24)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Category</label>
              <select
                value={newCommentCategory}
                onChange={(e) => setNewCommentCategory(e.target.value as CommentCategory)}
                className="w-full text-xs p-1.5 rounded-lg border border-indigo-200 bg-white outline-none"
              >
                <option value="suggestion">💡 Suggestion</option>
                <option value="question">❓ Question</option>
                <option value="praise">❤️ Praise</option>
                <option value="blocker">⚠️ Blocker</option>
              </select>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <textarea
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Leave specific strategic, design, or technical feedback..."
              className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white focus:border-[#1a146b] outline-none resize-none leading-relaxed"
              required
            />
          </div>

          {/* Mention Helpers & Submit */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 flex-wrap text-[10px] text-zinc-500">
              <span className="flex items-center gap-0.5">
                <AtSign className="w-2.5 h-2.5" />
                <span>Tag:</span>
              </span>
              {collaborators.slice(0, 3).map((collab) => (
                <button
                  key={collab.id}
                  type="button"
                  onClick={() => handleInsertMention(collab.name.split(' ')[0])}
                  className="px-1.5 py-0.5 rounded bg-white hover:bg-indigo-100 border border-indigo-200 text-[#1a146b] font-medium cursor-pointer"
                >
                  @{collab.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[#1a146b] hover:bg-indigo-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
            >
              <Send className="w-3 h-3" />
              <span>Post Comment</span>
            </button>
          </div>
        </form>
      )}

      {/* Threads List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-zinc-100">
        {filteredThreads.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 space-y-2">
            <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-700">No comment threads found</p>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
              {searchQuery || statusFilter !== 'all' || slideFilter !== 'all'
                ? 'Try adjusting your search terms or filters.'
                : 'Click "+ Comment" or use the Drop Pin Tool to leave feedback on any slide.'}
            </p>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            const isResolved = thread.status === 'resolved';

            return (
              <div
                key={thread.id}
                id={`thread_${thread.id}`}
                onClick={() => onSelectThread(thread.id)}
                className={`pt-3 first:pt-0 rounded-xl transition-all ${
                  isSelected ? 'bg-indigo-50/40 p-2 border border-indigo-200/80 -mx-1' : ''
                }`}
              >
                {/* Thread Header */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: thread.author.color }}
                    >
                      {thread.author.initials}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-[#1a1c1c] truncate">
                          {thread.author.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-normal truncate">
                          {thread.author.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges: Category & Slide */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScrollToSlide?.(thread.slideId);
                      }}
                      className="text-[9px] font-code px-1.5 py-0.2 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold cursor-pointer"
                      title="Scroll to this slide"
                    >
                      Slide #{thread.slideNumber}
                    </button>

                    <span
                      className={`text-[9px] font-code px-1.5 py-0.2 rounded font-bold uppercase ${
                        thread.category === 'praise'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : thread.category === 'question'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : thread.category === 'blocker'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {thread.category}
                    </span>
                  </div>
                </div>

                {/* Comment Content */}
                <div className="text-xs text-[#474651] leading-relaxed pl-8">
                  <p>{renderContentWithMentions(thread.content)}</p>

                  {/* Pin Location indicator if present */}
                  {thread.pinPosition && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400 font-code">
                      <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                      <span>Pinned at {thread.pinPosition.xPercent}%, {thread.pinPosition.yPercent}%</span>
                    </div>
                  )}

                  {/* Reactions & Actions Bar */}
                  <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                    {/* Emoji Reactions */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {['👍', '❤️', '🚀', '👀'].map((emoji) => {
                        const reaction = thread.reactions.find((r) => r.emoji === emoji);
                        const hasReacted = reaction?.users.includes(currentUser.name);

                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleReaction(thread.id, emoji);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                              hasReacted
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold'
                                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200/60'
                            }`}
                          >
                            <span>{emoji}</span>
                            {reaction && reaction.count > 0 && (
                              <span className="text-[10px] font-code font-bold">{reaction.count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Thread Status Actions */}
                    <div className="flex items-center gap-2 text-[11px]">
                      {isResolved ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReopenThread(thread.id);
                          }}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Re-open</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResolveThread(thread.id);
                          }}
                          className="text-zinc-500 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReplyThreadId(activeReplyThreadId === thread.id ? null : thread.id);
                        }}
                        className="text-[#1a146b] hover:underline font-semibold cursor-pointer"
                      >
                        Reply
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                        className="text-zinc-400 hover:text-rose-600 transition-colors p-0.5"
                        title="Delete thread"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Nested Replies */}
                  {thread.replies.length > 0 && (
                    <div className="mt-2.5 space-y-2 border-l-2 border-indigo-100 pl-3">
                      {thread.replies.map((reply) => (
                        <div key={reply.id} className="text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center shrink-0"
                              style={{ backgroundColor: reply.author.color }}
                            >
                              {reply.author.initials}
                            </span>
                            <span className="font-semibold text-zinc-900">{reply.author.name}</span>
                            <span className="text-[9px] text-zinc-400">{reply.createdAt}</span>
                          </div>
                          <p className="text-zinc-700 pl-5 leading-relaxed">
                            {renderContentWithMentions(reply.content)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Reply Composer */}
                  {(activeReplyThreadId === thread.id || isSelected) && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center gap-1.5">
                      <CornerDownRight className="w-3 h-3 text-zinc-400 shrink-0" />
                      <input
                        type="text"
                        value={replyTexts[thread.id] || ''}
                        onChange={(e) =>
                          setReplyTexts((prev) => ({ ...prev, [thread.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePostReply(thread.id);
                          }
                        }}
                        placeholder={`Reply to ${thread.author.name.split(' ')[0]}...`}
                        className="flex-1 text-[11px] p-1.5 rounded-lg border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-[#1a146b] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handlePostReply(thread.id)}
                        disabled={!replyTexts[thread.id]?.trim()}
                        className="px-2.5 py-1 rounded-lg bg-[#1a146b] hover:bg-indigo-900 text-white text-[10px] font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
