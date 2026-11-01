import React, { useState, useEffect, useMemo } from 'react';
import { RecentActivityOperation } from '../types';

export type RecentActivityCategory = 'all' | 'presentation' | 'memory' | 'chat' | 'export' | 'agent';

interface RecentActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activities: RecentActivityOperation[];
  onReaccess: (activity: RecentActivityOperation) => void;
  onClearHistory: () => void;
  onTriggerQuickTask?: (taskType: 'presentation' | 'memory' | 'pdf' | 'chat' | 'manus') => void;
}

export const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({
  isOpen,
  onClose,
  activities,
  onReaccess,
  onClearHistory,
  onTriggerQuickTask,
}) => {
  // Category filter state persisted in localStorage
  const [activeCategory, setActiveCategory] = useState<RecentActivityCategory>(() => {
    try {
      const saved = localStorage.getItem('logitix_recent_activity_filter_tab');
      const validCategories: RecentActivityCategory[] = ['all', 'presentation', 'memory', 'chat', 'export', 'agent'];
      if (saved && validCategories.includes(saved as RecentActivityCategory)) {
        return saved as RecentActivityCategory;
      }
    } catch (e) {
      console.warn('Failed to load saved category filter tab:', e);
    }
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Persist selected category tab whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('logitix_recent_activity_filter_tab', activeCategory);
    } catch (e) {
      console.warn('Failed to save category filter tab:', e);
    }
  }, [activeCategory]);

  // Reset search query when reopening, preserving the persisted active category
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Listen for Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter tabs definition with dynamic counters
  const filterTabs = useMemo(() => {
    return [
      {
        id: 'all' as RecentActivityCategory,
        label: 'All',
        icon: 'grid_view',
        count: activities.length,
        color: '#1a146b',
      },
      {
        id: 'presentation' as RecentActivityCategory,
        label: 'Presentations',
        icon: 'slideshow',
        count: activities.filter((a) => a.type === 'presentation').length,
        color: '#f59e0b',
      },
      {
        id: 'memory' as RecentActivityCategory,
        label: 'Memories',
        icon: 'bookmark',
        count: activities.filter((a) => a.type === 'memory').length,
        color: '#10b981',
      },
      {
        id: 'chat' as RecentActivityCategory,
        label: 'Chats',
        icon: 'forum',
        count: activities.filter((a) => a.type === 'chat' || a.type === 'voice').length,
        color: '#6366f1',
      },
      {
        id: 'export' as RecentActivityCategory,
        label: 'Exports',
        icon: 'picture_as_pdf',
        count: activities.filter((a) => a.type === 'pdf').length,
        color: '#ef4444',
      },
      {
        id: 'agent' as RecentActivityCategory,
        label: 'Agents',
        icon: 'smart_toy',
        count: activities.filter((a) => a.type === 'manus' || a.type === 'research').length,
        color: '#ea580c',
      },
    ];
  }, [activities]);

  // Filtered activities based on selected category tab and search query
  const filteredActivities = useMemo(() => {
    let result = activities;
    if (activeCategory === 'presentation') {
      result = activities.filter((a) => a.type === 'presentation');
    } else if (activeCategory === 'memory') {
      result = activities.filter((a) => a.type === 'memory');
    } else if (activeCategory === 'chat') {
      result = activities.filter((a) => a.type === 'chat' || a.type === 'voice');
    } else if (activeCategory === 'export') {
      result = activities.filter((a) => a.type === 'pdf');
    } else if (activeCategory === 'agent') {
      result = activities.filter((a) => a.type === 'manus' || a.type === 'research');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.badge && a.badge.toLowerCase().includes(q))
      );
    }

    return result;
  }, [activities, activeCategory, searchQuery]);

  // Color & styling helper based on operation type
  const getTypeStyling = (type: RecentActivityOperation['type']) => {
    switch (type) {
      case 'presentation':
        return {
          icon: 'slideshow',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          accent: 'border-l-amber-500',
          badgeText: 'Google Slides',
          chipBg: 'bg-amber-100 text-amber-800',
        };
      case 'memory':
        return {
          icon: 'bookmark',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          accent: 'border-l-emerald-500',
          badgeText: 'Memory Directive',
          chipBg: 'bg-emerald-100 text-emerald-800',
        };
      case 'pdf':
        return {
          icon: 'picture_as_pdf',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          accent: 'border-l-rose-500',
          badgeText: 'Export PDF',
          chipBg: 'bg-rose-100 text-rose-800',
        };
      case 'manus':
        return {
          icon: 'smart_toy',
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          accent: 'border-l-orange-500',
          badgeText: 'Manus Agent',
          chipBg: 'bg-orange-100 text-orange-800',
        };
      case 'research':
        return {
          icon: 'science',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          accent: 'border-l-blue-500',
          badgeText: 'Research Grounding',
          chipBg: 'bg-blue-100 text-blue-800',
        };
      case 'voice':
        return {
          icon: 'mic',
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          accent: 'border-l-teal-500',
          badgeText: 'Voice Briefing',
          chipBg: 'bg-teal-100 text-teal-800',
        };
      case 'chat':
      default:
        return {
          icon: 'forum',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          accent: 'border-l-indigo-600',
          badgeText: 'Consensus Chat',
          chipBg: 'bg-indigo-100 text-indigo-800',
        };
    }
  };

  const getWorkspaceLabel = (view: string) => {
    switch (view) {
      case 'google-slides':
        return 'Slides Studio';
      case 'memory-context':
        return 'Directives Workspace';
      case 'chat-studio':
        return 'Chat Studio';
      case 'notes-artifacts':
        return 'Artifacts Library';
      case 'manus-agent':
        return 'Manus Autonomous Agent';
      case 'research-search':
        return 'Evidence Grounding';
      case 'outbox-dashboard':
        return 'Outbox Health';
      case 'settings-security':
        return 'Settings & Security';
      default:
        return 'LOGITIX Studio';
    }
  };

  return (
    <>
      {/* Dimmed backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/45 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Flyout Side-Panel Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-activity-panel-title"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] max-w-full h-full h-[100dvh] bg-white border-l border-[#e2e2e2] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header & Controls */}
        <div className="shrink-0 px-4 sm:px-5 pt-4 pb-3 border-b border-[#e2e2e2] bg-[#f9f9f8]/95 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e2dfff] text-[#1a146b] flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-[20px]">history</span>
              </div>
              <div>
                <h2
                  id="recent-activity-panel-title"
                  className="font-headline text-lg font-bold text-[#1a146b] leading-tight"
                >
                  Recent Activity
                </h2>
                <p className="text-xs text-[#777682] font-body">
                  Tracked operations across workspaces · Click to re-access
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#777682] hover:bg-[#e8e8e7] hover:text-[#1a1c1c] transition-colors cursor-pointer"
              title="Close recent activity panel (Esc)"
              aria-label="Close recent activity panel"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Category Filtering Tabs */}
          <div className="pt-1">
            <div
              role="tablist"
              aria-label="Activity Categories"
              className="flex items-center gap-1.5 p-1 bg-[#ebebeb] rounded-xl overflow-x-auto custom-scrollbar no-scrollbar text-xs select-none"
            >
              {filterTabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls="recent-activities-list"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#1a146b] font-semibold shadow-xs border border-[#e2e2e2]/80'
                        : 'text-[#52525e] hover:text-[#1a1c1c] hover:bg-white/50 border border-transparent'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[15px]"
                      style={{ color: isActive ? tab.color : undefined }}
                    >
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-code px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                        isActive
                          ? 'bg-[#e2dfff] text-[#1a146b]'
                          : 'bg-[#dedede] text-[#777682]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Search & Summary Status Bar */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="relative flex-1 flex items-center bg-white rounded-xl border border-[#e2e2e2] px-3 py-1.5 focus-within:border-[#1a146b] transition-all text-xs">
              <span className="material-symbols-outlined text-[#777682] text-[16px] mr-2">search</span>
              <input
                type="text"
                placeholder={
                  activeCategory === 'all'
                    ? 'Search all operations...'
                    : `Search ${filterTabs.find((t) => t.id === activeCategory)?.label || ''}...`
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-[#1a1c1c] placeholder:text-[#777682] text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#777682] hover:text-[#1a1c1c] p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {activities.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-[11px] font-medium text-[#777682] hover:text-[#ba1a1a] flex items-center gap-1 px-2 py-1.5 rounded-xl border border-[#e2e2e2] bg-white hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
                title="Clear all activity history"
              >
                <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {/* Filter Status Metadata */}
          <div className="flex items-center justify-between text-[11px] text-[#777682] font-code pt-0.5">
            <span>
              {activeCategory === 'all' ? (
                `Showing ${filteredActivities.length} total operations`
              ) : (
                <span>
                  Filtering: <strong className="text-[#1a146b] font-semibold">{filterTabs.find((t) => t.id === activeCategory)?.label}</strong> ({filteredActivities.length})
                </span>
              )}
            </span>
            {activeCategory !== 'all' && (
              <button
                onClick={() => setActiveCategory('all')}
                className="text-[#1a146b] hover:underline cursor-pointer font-medium"
              >
                Reset to All
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div
          id="recent-activities-list"
          role="tabpanel"
          aria-labelledby={`tab-${activeCategory}`}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 custom-scrollbar"
        >
          {filteredActivities.length > 0 ? (
            <div className="space-y-3">
              {filteredActivities.map((activity, index) => {
                const styling = getTypeStyling(activity.type);
                return (
                  <div
                    key={activity.id}
                    onClick={() => onReaccess(activity)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onReaccess(activity);
                      }
                    }}
                    className={`group relative p-3.5 rounded-2xl bg-white border border-[#e2e2e2] hover:border-[#1a146b] border-l-4 ${styling.accent} shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer select-none text-left`}
                  >
                    {/* Header Row: Icon, Title, and Timestamp */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${styling.bg}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {styling.icon}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1a1c1c] group-hover:text-[#1a146b] transition-colors truncate">
                            {activity.title}
                          </div>
                          <div className="text-[10px] text-[#777682] font-code">
                            #{index + 1} · {styling.badgeText}
                          </div>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] font-code text-[#777682] shrink-0 bg-[#f9f9f8] px-1.5 py-0.5 rounded border border-[#e2e2e2]/60">
                        {activity.timestamp}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-2 text-xs text-[#474651] line-clamp-2 leading-relaxed">
                      {activity.description}
                    </p>

                    {/* Metadata Footer & Quick Re-access Button */}
                    <div className="mt-3 pt-2.5 border-t border-[#f0f0f0] flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#777682] text-[11px] truncate">
                        <span className="material-symbols-outlined text-[14px] text-[#777682]">
                          arrow_right_alt
                        </span>
                        <span className="truncate">{getWorkspaceLabel(activity.view)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[#1a146b] font-semibold text-[11px] group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>Re-access</span>
                        <span className="material-symbols-outlined text-[14px]">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Category-Specific Empty States */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#f3f4f3] border border-[#e2e2e2] flex items-center justify-center text-[#777682]">
                <span className="material-symbols-outlined text-[28px]">
                  {searchQuery
                    ? 'search_off'
                    : activeCategory === 'presentation'
                    ? 'slideshow'
                    : activeCategory === 'memory'
                    ? 'bookmark'
                    : activeCategory === 'chat'
                    ? 'forum'
                    : activeCategory === 'export'
                    ? 'picture_as_pdf'
                    : activeCategory === 'agent'
                    ? 'smart_toy'
                    : 'history_toggle_off'}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-headline text-base font-bold text-[#1a1c1c]">
                  {searchQuery
                    ? 'No matching operations'
                    : activeCategory === 'presentation'
                    ? 'No presentation tasks'
                    : activeCategory === 'memory'
                    ? 'No saved memories'
                    : activeCategory === 'chat'
                    ? 'No chat syntheses'
                    : activeCategory === 'export'
                    ? 'No exported files'
                    : activeCategory === 'agent'
                    ? 'No agent missions'
                    : 'No Recent Operations'}
                </h3>
                <p className="text-xs text-[#777682] max-w-[280px] leading-relaxed">
                  {searchQuery ? (
                    `No operations matched "${searchQuery}". Try clearing search or switching categories.`
                  ) : activeCategory === 'presentation' ? (
                    'Generate presentations in Google Slides Studio to track slides tasks here.'
                  ) : activeCategory === 'memory' ? (
                    'Save executive memory directives to ground multi-model consensus passes.'
                  ) : activeCategory === 'chat' ? (
                    'Synthesize multi-model chat sessions across Gemini, Claude, and Manus.'
                  ) : activeCategory === 'export' ? (
                    'Export formatted session PDFs or code snippets to track recent document exports.'
                  ) : activeCategory === 'agent' ? (
                    'Launch autonomous multi-hop research or code tasks in Manus Agent.'
                  ) : (
                    'Your recent operations will appear here automatically so you can resume previous tasks quickly.'
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="w-full pt-2 space-y-2">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1a146b] text-white text-xs font-semibold hover:bg-indigo-900 transition-all cursor-pointer"
                  >
                    Clear Search Query
                  </button>
                ) : activeCategory === 'presentation' ? (
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerQuickTask?.('presentation');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px] text-amber-700">slideshow</span>
                    <span>Create Google Slides Deck</span>
                  </button>
                ) : activeCategory === 'memory' ? (
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerQuickTask?.('memory');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-900 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">bookmark</span>
                    <span>Save New Memory Directive</span>
                  </button>
                ) : activeCategory === 'chat' ? (
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerQuickTask?.('chat');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-900 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px] text-indigo-700">forum</span>
                    <span>Start New Chat Synthesis</span>
                  </button>
                ) : activeCategory === 'export' ? (
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerQuickTask?.('pdf');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-900 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px] text-rose-700">picture_as_pdf</span>
                    <span>Export Session PDF</span>
                  </button>
                ) : activeCategory === 'agent' ? (
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerQuickTask?.('manus');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 text-xs font-semibold text-orange-900 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px] text-orange-700">smart_toy</span>
                    <span>Launch Manus Agent</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        onClose();
                        onTriggerQuickTask?.('presentation');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#e2e2e2] hover:border-amber-400 bg-amber-50/50 hover:bg-amber-50 text-xs text-[#1a1c1c] transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">slideshow</span>
                        <span className="font-medium">Generate Presentation</span>
                      </div>
                      <span className="material-symbols-outlined text-[#777682] text-[16px]">chevron_right</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onTriggerQuickTask?.('memory');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#e2e2e2] hover:border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-xs text-[#1a1c1c] transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">bookmark</span>
                        <span className="font-medium">Save Memory Directive</span>
                      </div>
                      <span className="material-symbols-outlined text-[#777682] text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}

                {activeCategory !== 'all' && (
                  <button
                    onClick={() => setActiveCategory('all')}
                    className="w-full text-center text-xs text-[#777682] hover:text-[#1a146b] pt-1 font-medium cursor-pointer"
                  >
                    Show all categories ({activities.length})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="shrink-0 px-4 sm:px-5 py-3 pb-safe border-t border-[#e2e2e2] bg-[#f9f9f8] flex items-center justify-between text-[11px] text-[#777682]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-code">Telemetry Synced</span>
          </div>
          <div className="font-code text-[10px]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#e2e2e2] text-[#1a1c1c] shadow-2xs">Esc</kbd> to exit
          </div>
        </div>
      </aside>
    </>
  );
};
