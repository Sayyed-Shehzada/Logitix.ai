import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  X,
  Bot,
  Trash2,
  Tag,
  Check,
  Filter,
  Calendar,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Conversation } from '../types.js';

interface ChatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateConversationTags?: (id: string, tags: string[]) => void;
  darkMode?: boolean;
}

const PRESET_TAGS = ['Work', 'Personal', 'Research', 'Project', 'Urgent', 'Idea'];

export const ChatsDrawer: React.FC<ChatsDrawerProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onUpdateConversationTags,
  darkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [activeTagPopoverId, setActiveTagPopoverId] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Collect all unique tags across conversations
  const allUsedTags: string[] = Array.from(
    new Set<string>(
      conversations
        .flatMap((c) => c.tags || [])
        .filter((t): t is string => Boolean(t))
    )
  );

  const availableTags: string[] = Array.from(new Set<string>([...PRESET_TAGS, ...allUsedTags]));

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      selectedTagFilter === 'All' ||
      (c.tags && c.tags.includes(selectedTagFilter));

    return matchesSearch && matchesTag;
  });

  const todayConversations = filteredConversations.filter((c) => c.group === 'Today');
  const yesterdayConversations = filteredConversations.filter((c) => c.group === 'Yesterday');
  const olderConversations = filteredConversations.filter(
    (c) => c.group === 'Previous 7 Days' || c.group === 'Older'
  );

  const toggleTagForConv = (conv: Conversation, tagToToggle: string) => {
    if (!onUpdateConversationTags) return;
    const currentTags = conv.tags || [];
    const exists = currentTags.includes(tagToToggle);
    const newTags = exists
      ? currentTags.filter((t) => t !== tagToToggle)
      : [...currentTags, tagToToggle];
    onUpdateConversationTags(conv.id, newTags);
  };

  const addCustomTagForConv = (conv: Conversation) => {
    const trimmed = customTagInput.trim();
    if (!trimmed || !onUpdateConversationTags) return;
    const currentTags = conv.tags || [];
    if (!currentTags.includes(trimmed)) {
      onUpdateConversationTags(conv.id, [...currentTags, trimmed]);
    }
    setCustomTagInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-out Drawer Container */}
      <motion.div
        ref={drawerRef}
        initial={{ x: -340, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -340, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`relative z-50 w-80 sm:w-96 max-w-[85vw] h-full shadow-2xl flex flex-col border-r backdrop-blur-2xl ${
          darkMode
            ? 'bg-slate-950/95 border-white/10 text-slate-200'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        {/* Drawer Header */}
        <div className={`p-4 border-b shrink-0 flex items-center justify-between ${
          darkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Chat History</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {conversations.length}
                </span>
              </h2>
              <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Browse and switch between saved chats
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title="Start New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className={`p-3 space-y-2 border-b shrink-0 ${
          darkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
        }`}>
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-8 pl-8 pr-7 rounded-xl border text-xs focus:outline-none transition-colors ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-white focus:border-blue-400 placeholder:text-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-blue-400 placeholder:text-slate-400 shadow-2xs'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tag Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setSelectedTagFilter('All')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all whitespace-nowrap cursor-pointer ${
                selectedTagFilter === 'All'
                  ? darkMode
                    ? 'bg-blue-500/30 text-blue-200 border-blue-500/50 font-bold'
                    : 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                  : darkMode
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    : 'bg-slate-200/60 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({conversations.length})
            </button>
            {availableTags.map((tag) => {
              const count = conversations.filter((c) => c.tags?.includes(tag)).length;
              if (count === 0 && selectedTagFilter !== tag && !PRESET_TAGS.includes(tag)) return null;

              const isSel = selectedTagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(isSel ? 'All' : tag)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    isSel
                      ? darkMode
                        ? 'bg-purple-500/30 text-purple-200 border-purple-400/50 font-bold'
                        : 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                      : darkMode
                        ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        : 'bg-slate-200/60 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="text-[9px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {filteredConversations.length === 0 && (
            <div className={`px-4 py-12 text-center text-xs border border-dashed rounded-2xl ${
              darkMode ? 'border-white/10 bg-white/[0.02] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-400" />
              <p className="font-semibold">No conversations found</p>
              <p className="text-[11px] mt-1 opacity-80">
                {selectedTagFilter !== 'All'
                  ? `No chats tagged with #${selectedTagFilter}`
                  : searchQuery
                  ? `No chats match "${searchQuery}"`
                  : 'Start a new conversation to begin chatting!'}
              </p>
            </div>
          )}

          {/* Helper render group */}
          {[
            { label: 'Today', list: todayConversations },
            { label: 'Yesterday', list: yesterdayConversations },
            { label: 'Previous 7 Days & Older', list: olderConversations },
          ].map((group) => {
            if (group.list.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>{group.label}</span>
                </div>

                <div className="space-y-1">
                  {group.list.map((conv) => {
                    const isSel = conv.id === activeConversationId;
                    const isPopoverOpen = activeTagPopoverId === conv.id;
                    const tags = conv.tags || [];

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          onClose();
                        }}
                        className={`group relative p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                          isSel
                            ? darkMode
                              ? 'bg-blue-600/20 border-blue-500/40 text-white shadow-sm ring-1 ring-blue-500/30'
                              : 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs font-semibold'
                            : darkMode
                              ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Bot className={`w-3.5 h-3.5 shrink-0 ${isSel ? 'text-blue-400' : 'text-slate-400'}`} />
                            <span className="text-xs font-medium truncate">{conv.title}</span>
                          </div>
                          <span className={`text-[9px] shrink-0 pr-12 group-hover:pr-14 transition-all ${
                            darkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {conv.updatedAt}
                          </span>
                        </div>

                        {conv.summary && (
                          <p className={`text-[10px] truncate mt-1 pl-5 pr-4 ${
                            darkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {conv.summary}
                          </p>
                        )}

                        {/* Tag Pills */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
                            {tags.map((t) => (
                              <span
                                key={t}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTagFilter(t);
                                }}
                                title={`Filter by #${t}`}
                                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Hover Actions: Manage Tags & Delete */}
                        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTagPopoverId(isPopoverOpen ? null : conv.id);
                            }}
                            title="Manage Tags"
                            className={`p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                              tags.length > 0 ? 'text-blue-400' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Tag className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv.id);
                            }}
                            title="Delete Chat"
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Tag Popover */}
                        {isPopoverOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 right-0 top-full mt-1.5 z-30 p-2.5 rounded-xl bg-slate-900 border border-white/20 shadow-2xl space-y-2 backdrop-blur-2xl"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 pb-1 border-b border-white/10">
                              <span className="flex items-center gap-1 font-bold text-blue-300">
                                <Tag className="w-3 h-3 text-blue-400" />
                                Add Tags
                              </span>
                              <button
                                onClick={() => setActiveTagPopoverId(null)}
                                className="text-slate-400 hover:text-white cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto custom-scrollbar">
                              {availableTags.map((t) => {
                                const isTagged = tags.includes(t);
                                return (
                                  <button
                                    key={t}
                                    onClick={() => toggleTagForConv(conv, t)}
                                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
                                      isTagged
                                        ? 'bg-blue-500/30 text-blue-200 border-blue-400/50 font-bold'
                                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    <span>#{t}</span>
                                    {isTagged && <Check className="w-2.5 h-2.5 text-blue-300" />}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-1 pt-1 border-t border-white/10">
                              <input
                                type="text"
                                placeholder="New tag name..."
                                value={customTagInput}
                                onChange={(e) => setCustomTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') addCustomTagForConv(conv);
                                }}
                                className="flex-1 h-6 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-white focus:outline-none focus:border-blue-400"
                              />
                              <button
                                onClick={() => addCustomTagForConv(conv)}
                                className="px-2 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-[10px] text-white font-medium cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
