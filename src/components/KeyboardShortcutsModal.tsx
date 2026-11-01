import React, { useState, useMemo, useEffect } from 'react';
import { ActiveView } from '../types';

export interface ShortcutItem {
  id: string;
  category: 'Navigation' | 'Panels' | 'Actions' | 'General';
  title: string;
  description: string;
  keys: string[];
  icon: string;
  action?: () => void;
  targetView?: ActiveView;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView?: (view: ActiveView) => void;
  onToggleSidebar?: () => void;
  onToggleRecentActivity?: () => void;
  onNewSession?: () => void;
  onOpenExportModal?: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onNavigateView,
  onToggleSidebar,
  onToggleRecentActivity,
  onNewSession,
  onOpenExportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Trap Escape key to close cheat sheet
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // List of all shortcuts supported across the application
  const shortcuts: ShortcutItem[] = useMemo(() => [
    // General
    {
      id: 'open-shortcuts',
      category: 'General',
      title: 'Keyboard Shortcuts Cheat Sheet',
      description: 'Open or close this command overlay cheat sheet',
      keys: ['Shift', '?'],
      icon: 'keyboard',
      action: onClose,
    },
    {
      id: 'close-modal',
      category: 'General',
      title: 'Close Modal / Overlay',
      description: 'Dismiss any open dialog, panel, or overlay',
      keys: ['Esc'],
      icon: 'close',
      action: onClose,
    },
    {
      id: 'quick-search',
      category: 'General',
      title: 'Focus Search / Command',
      description: 'Quickly search sessions or filter activities',
      keys: ['Ctrl', 'K'],
      icon: 'search',
    },

    // Panels & Views
    {
      id: 'toggle-activity',
      category: 'Panels',
      title: 'Toggle Recent Activity Panel',
      description: 'Slide open or close the 25-operation history drawer',
      keys: ['Alt', 'A'],
      icon: 'history',
      action: () => {
        onToggleRecentActivity?.();
        onClose();
      },
    },
    {
      id: 'toggle-sidebar',
      category: 'Panels',
      title: 'Toggle Sidebar Collapse',
      description: 'Expand or collapse the left navigation sidebar',
      keys: ['Ctrl', 'B'],
      icon: 'view_sidebar',
      action: () => {
        onToggleSidebar?.();
        onClose();
      },
    },
    {
      id: 'open-export',
      category: 'Panels',
      title: 'Export Session to PDF',
      description: 'Open formatted PDF generator for chats and code',
      keys: ['Ctrl', 'E'],
      icon: 'picture_as_pdf',
      action: () => {
        onOpenExportModal?.();
        onClose();
      },
    },

    // Navigation (Switching Views)
    {
      id: 'view-chat',
      category: 'Navigation',
      title: 'Chat & Synthesis Studio',
      description: 'Switch to multi-model consensus conversation studio',
      keys: ['Alt', '1'],
      icon: 'forum',
      targetView: 'chat-studio',
      action: () => {
        onNavigateView?.('chat-studio');
        onClose();
      },
    },
    {
      id: 'view-slides',
      category: 'Navigation',
      title: 'Google Slides Studio',
      description: 'Open automated presentation builder and deck editor',
      keys: ['Alt', '2'],
      icon: 'slideshow',
      targetView: 'google-slides',
      action: () => {
        onNavigateView?.('google-slides');
        onClose();
      },
    },
    {
      id: 'view-manus',
      category: 'Navigation',
      title: 'Manus AI Agent',
      description: 'Launch autonomous mission planning and execution agent',
      keys: ['Alt', '3'],
      icon: 'smart_toy',
      targetView: 'manus-agent',
      action: () => {
        onNavigateView?.('manus-agent');
        onClose();
      },
    },
    {
      id: 'view-research',
      category: 'Navigation',
      title: 'Research & Grounding Search',
      description: 'Search academic papers, RFCs, and grounded knowledge',
      keys: ['Alt', '4'],
      icon: 'travel_explore',
      targetView: 'research-search',
      action: () => {
        onNavigateView?.('research-search');
        onClose();
      },
    },
    {
      id: 'view-notes',
      category: 'Navigation',
      title: 'Notes & Artifacts Studio',
      description: 'Inspect live architectural code and markdown artifacts',
      keys: ['Alt', '5'],
      icon: 'draw',
      targetView: 'notes-artifacts',
      action: () => {
        onNavigateView?.('notes-artifacts');
        onClose();
      },
    },
    {
      id: 'view-outbox',
      category: 'Navigation',
      title: 'Outbox Health Dashboard',
      description: 'Inspect high-throughput distributed transaction monitors',
      keys: ['Alt', '6'],
      icon: 'monitoring',
      targetView: 'outbox-dashboard',
      action: () => {
        onNavigateView?.('outbox-dashboard');
        onClose();
      },
    },
    {
      id: 'view-memory',
      category: 'Navigation',
      title: 'Memory & Context Directives',
      description: 'Manage persistent user rules, preferences, and memories',
      keys: ['Alt', '7'],
      icon: 'database',
      targetView: 'memory-context',
      action: () => {
        onNavigateView?.('memory-context');
        onClose();
      },
    },
    {
      id: 'view-voice',
      category: 'Navigation',
      title: 'VoiceSpark Podcast Studio',
      description: 'Generate concise spoken audio briefing podcasts',
      keys: ['Alt', '8'],
      icon: 'mic',
      targetView: 'voicespark',
      action: () => {
        onNavigateView?.('voicespark');
        onClose();
      },
    },
    {
      id: 'view-settings',
      category: 'Navigation',
      title: 'Settings & Security',
      description: 'Configure API engines, API keys, and account roles',
      keys: ['Alt', '9'],
      icon: 'tune',
      targetView: 'settings-security',
      action: () => {
        onNavigateView?.('settings-security');
        onClose();
      },
    },
    {
      id: 'view-design',
      category: 'Navigation',
      title: 'Design System & Specs',
      description: 'Inspect color tokens, typography scales, and UI guides',
      keys: ['Alt', '0'],
      icon: 'palette',
      targetView: 'design-system',
      action: () => {
        onNavigateView?.('design-system');
        onClose();
      },
    },

    // Actions & Chat
    {
      id: 'new-session',
      category: 'Actions',
      title: 'New Editorial Session',
      description: 'Start a fresh multi-model synthesis chat session',
      keys: ['Ctrl', 'J'],
      icon: 'add_circle',
      action: () => {
        onNewSession?.();
        onClose();
      },
    },
    {
      id: 'send-message',
      category: 'Actions',
      title: 'Send Message Prompt',
      description: 'Transmit current query to AI consensus engines',
      keys: ['Enter'],
      icon: 'send',
    },
    {
      id: 'multiline-message',
      category: 'Actions',
      title: 'Insert Line Break',
      description: 'Add a new line without submitting the current prompt',
      keys: ['Shift', 'Enter'],
      icon: 'keyboard_return',
    },
    {
      id: 'voice-speech-toggle',
      category: 'Actions',
      title: 'Toggle Voice Listening Mode',
      description: 'Enable or disable browser Web Speech microphone input',
      keys: ['Alt', 'V'],
      icon: 'mic',
    },
  ], [onClose, onNavigateView, onToggleSidebar, onToggleRecentActivity, onNewSession, onOpenExportModal]);

  const categories = ['All', 'Navigation', 'Panels', 'Actions', 'General'];

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((sc) => {
      const matchesCategory = selectedCategory === 'All' || sc.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sc.title.toLowerCase().includes(q) ||
        sc.description.toLowerCase().includes(q) ||
        sc.keys.some((k) => k.toLowerCase().includes(q)) ||
        sc.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [shortcuts, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts Cheat Sheet"
    >
      <div
        className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
                <span className="material-symbols-outlined text-[24px]">keyboard</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Keyboard Shortcuts
                  </h2>
                  <span className="font-code text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100/70 text-indigo-800 border border-indigo-200/50">
                    Cheat Sheet
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-code font-bold text-[10px] text-slate-700 shadow-2xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-code font-bold text-[10px] text-slate-700 shadow-2xs">?</kbd> anytime to open this sheet
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title="Close (Esc)"
              aria-label="Close keyboard shortcuts"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Search Filter & Category Tabs */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search shortcuts (e.g. Slides, Alt+1, Activity)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shortcuts Grid List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {filteredShortcuts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((item) => {
                const isClickable = !!item.action;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isClickable
                        ? 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer shadow-2xs group'
                        : 'border-slate-100 bg-slate-50/50'
                    }`}
                    title={isClickable ? `Click to trigger: ${item.title}` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-indigo-100/70 text-slate-600 group-hover:text-indigo-700 flex items-center justify-center shrink-0 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-950 truncate flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {isClickable && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-indigo-600 font-normal">
                              ↵
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Key Badges */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, idx) => (
                        <React.Fragment key={idx}>
                          <kbd className="px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-800 text-[11px] font-code font-bold shadow-[0_1px_0_1px_rgba(0,0,0,0.06)] leading-none select-none">
                            {k}
                          </kbd>
                          {idx < item.keys.length - 1 && (
                            <span className="text-[10px] text-slate-400 font-bold">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-[36px] text-slate-300 block mb-2">
                search_off
              </span>
              <p className="text-xs font-semibold text-slate-600">No matching shortcuts found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Try searching for "Slides", "Esc", or "Activity"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Footer with Hint & Close Action */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-indigo-600">lightbulb</span>
            <span className="text-[11px]">
              Click any shortcut above to run that command instantly
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
