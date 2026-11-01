import React, { useState } from 'react';
import { ActiveView, UserProfile } from '../types';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenExportModal?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUser?: UserProfile | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onOpenRecentActivity?: () => void;
  recentActivityCount?: number;
  onOpenKeyboardShortcuts?: () => void;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  active?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  onOpenExportModal,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenRecentActivity,
  recentActivityCount,
  onOpenKeyboardShortcuts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { id: 'chat-studio' as ActiveView, label: 'Chat & Studio', icon: 'forum' },
    { id: 'research-search' as ActiveView, label: 'Research & Search', icon: 'travel_explore' },
    { id: 'notes-artifacts' as ActiveView, label: 'Notes & Artifacts', icon: 'draw' },
    { id: 'google-slides' as ActiveView, label: 'Google Slides Studio', icon: 'slideshow', badge: 'Slides' },
    { id: 'outbox-dashboard' as ActiveView, label: 'Outbox Health Dashboard', icon: 'monitoring', badge: '50k/s' },
    { id: 'memory-context' as ActiveView, label: 'Memory & Context', icon: 'database' },
    { id: 'voicespark' as ActiveView, label: 'VoiceSpark', icon: 'mic' },
    { id: 'settings-security' as ActiveView, label: 'Settings & Security', icon: 'tune' },
    { id: 'design-system' as ActiveView, label: 'Specs & Design System', icon: 'palette' },
  ];

  const recentSessions: ChatSession[] = [
    { id: 'sess-1', title: 'Resilient Idempotent Cloud Ingestion', timestamp: '12m ago', active: true },
    { id: 'sess-2', title: 'PostgreSQL Failover & Pooler Tuning', timestamp: '2h ago' },
    { id: 'sess-3', title: 'RFC-7233 Byte Range Upload Handler', timestamp: 'Yesterday' },
    { id: 'sess-4', title: 'Distributed Outbox Event Matrix', timestamp: '3d ago' },
  ];

  const filteredSessions = recentSessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Dimmed Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-label="Close navigation overlay"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 h-full w-72 bg-[#f3f4f3] border-r border-[#e2e2e2] z-40 flex flex-col justify-between select-none shadow-2xl lg:shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:-translate-x-full' : ''}`}
      >
        {/* Top Header & Search */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#e2e2e2]/60 bg-[#f3f4f3]">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                setActiveView('chat-studio');
                onCloseMobile?.();
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-[#312e81] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                <span className="material-symbols-outlined text-[20px] text-indigo-200">auto_awesome</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-lg text-[#1a146b] font-medium leading-none tracking-tight">LOGITIX</span>
                <span className="font-code text-[11px] text-[#474651] font-medium mt-0.5">Studio AI</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="font-code text-[11px] px-2 py-0.5 rounded bg-[#e8e8e7] text-[#474651] tracking-wider font-medium">
                v2.4 Pro
              </span>
              {/* Mobile Close Button */}
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-[#777682] hover:bg-[#e8e8e7] hover:text-[#1a1c1c] transition-colors"
                title="Close sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-2.5">
            <div className="relative flex items-center bg-white rounded-xl border border-[#e2e2e2] px-3 py-1.5 focus-within:border-[#312e81] transition-all">
              <span className="material-symbols-outlined text-[#777682] text-[18px] mr-2">search</span>
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent outline-none text-[#1a1c1c] placeholder:text-[#777682]"
              />
            </div>
          </div>

          {/* Scrollable Navigation & Recent Sessions Container */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {/* Quick Access: Recent Activity Side-Panel */}
            {onOpenRecentActivity && (
              <div className="px-3 pt-2 pb-1">
                <button
                  onClick={() => {
                    onOpenRecentActivity();
                    onCloseMobile?.();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-[#e8e8e7] border border-[#e2e2e2] hover:border-[#1a146b] text-xs font-semibold text-[#1a146b] shadow-2xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#1a146b]">history</span>
                    <span>Recent Activity</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {recentActivityCount !== undefined && recentActivityCount > 0 && (
                      <span className="min-w-4 h-4 px-1 rounded-full bg-[#1a146b] text-white text-[10px] font-code font-bold flex items-center justify-center">
                        {recentActivityCount}
                      </span>
                    )}
                    <span className="material-symbols-outlined text-[16px] text-[#777682] group-hover:translate-x-0.5 transition-transform">
                      chevron_right
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Primary Views Nav */}
            <div className="px-3 py-2 space-y-1">
              <div className="px-2 text-[10px] font-semibold text-[#777682] uppercase tracking-wider font-code">
                Workspaces
              </div>
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-[#1a146b] text-white shadow-xs'
                        : 'text-[#474651] hover:bg-[#e8e8e7] hover:text-[#1a1c1c]'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        isActive ? 'text-indigo-200' : 'text-[#777682]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-code font-bold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-indigo-300/30 text-indigo-100'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Recent Sessions List */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between px-2 pb-1.5">
                <span className="text-[10px] font-semibold text-[#777682] uppercase tracking-wider font-code">
                  Recent Threads
                </span>
                <span className="text-[10px] text-[#777682] font-code">{filteredSessions.length}</span>
              </div>

              <div className="space-y-1">
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setActiveView('chat-studio');
                      onCloseMobile?.();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs group transition-all flex flex-col gap-0.5 ${
                      session.active && activeView === 'chat-studio'
                        ? 'bg-white border border-[#e2e2e2] shadow-xs'
                        : 'hover:bg-[#e8e8e7]'
                    }`}
                  >
                    <span className="truncate font-medium text-[#1a1c1c] group-hover:text-[#1a146b]">
                      {session.title}
                    </span>
                    <span className="text-[10px] text-[#777682] font-code">{session.timestamp}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Export PDF Action */}
        {onOpenExportModal && (
          <div className="px-3 pb-2">
            <button
              onClick={() => {
                onOpenExportModal();
                onCloseMobile?.();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-[#e2e2e2] text-xs font-semibold text-[#1a1c1c] hover:border-[#1a146b] hover:text-[#1a146b] shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#b3261e]">picture_as_pdf</span>
                <span>Export Session / Code</span>
              </div>
              <span className="text-[10px] text-[#777682] font-code">PDF</span>
            </button>
          </div>
        )}

        {/* Footer / Account & Actions */}
        <div className="p-3 pb-safe border-t border-[#e2e2e2]/70 bg-[#f3f4f3] space-y-2">
          <div className="flex items-center justify-between px-2 pt-1 text-xs text-[#474651]">
            <div
              onClick={onOpenLogin}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              title={currentUser ? "Logged in: Click to manage account or switch" : "Click to Log In"}
            >
              <div className="w-7 h-7 rounded-full bg-[#1a146b] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {currentUser?.avatar || (currentUser?.name ? currentUser.name.charAt(0) : 'L')}
              </div>
              <div className="flex flex-col max-w-[120px]">
                <span className="font-semibold text-[#1a1c1c] leading-tight text-[11px] truncate">
                  {currentUser?.name || 'Sign In / Guest'}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium truncate">
                  {currentUser ? (currentUser.role || 'Super Admin') : 'Click to Log In'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenLogin}
                className="p-1.5 rounded-lg hover:bg-[#e8e8e7] text-[#777682] hover:text-[#1a146b] transition-colors cursor-pointer"
                title={currentUser ? "Switch Account / Re-login" : "Log In"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {currentUser ? 'switch_account' : 'login'}
                </span>
              </button>

              {onOpenKeyboardShortcuts && (
                <button
                  onClick={() => {
                    onOpenKeyboardShortcuts();
                    onCloseMobile?.();
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#e8e8e7] text-[#777682] hover:text-[#1a1c1c] transition-colors cursor-pointer"
                  title="Keyboard Shortcuts (Shift + /)"
                  aria-label="Keyboard Shortcuts"
                >
                  <span className="material-symbols-outlined text-[18px]">keyboard</span>
                </button>
              )}

              <button
                onClick={() => {
                  setActiveView('settings-security');
                  onCloseMobile?.();
                }}
                className="p-1.5 rounded-lg hover:bg-[#e8e8e7] text-[#777682] hover:text-[#1a1c1c] transition-colors cursor-pointer"
                title="Settings"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
