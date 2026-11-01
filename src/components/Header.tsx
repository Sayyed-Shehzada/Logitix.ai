import React, { useState, useEffect } from 'react';
import { availableEngines } from '../data/mockData';
import { UserProfile } from '../types';
import { maskEmailForPrivacy } from './LoginScreen';

interface HeaderProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onNewSession: () => void;
  onOpenExportModal?: () => void;
  onToggleMobileSidebar?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  currentUser?: UserProfile | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  readingProgress?: number;
  readingTitle?: string;
  readingType?: 'response' | 'artifact' | 'research' | 'code' | 'general';
  textContent?: string;
  textLength?: number;
  wordCount?: number;
  readingMinutes?: number;
  onScrollToTop?: () => void;
  isStreaming?: boolean;
  isGenerating?: boolean;
  onOpenRecentActivity?: () => void;
  recentActivityCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedModel,
  setSelectedModel,
  onNewSession,
  onOpenExportModal,
  onToggleMobileSidebar,
  sidebarCollapsed = false,
  onToggleSidebarCollapse,
  currentUser,
  onOpenLogin,
  onLogout,
  readingProgress,
  isStreaming = false,
  isGenerating = false,
  onOpenRecentActivity,
  recentActivityCount,
}) => {
  const activeStreaming = isStreaming || isGenerating;
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fallback internal scroll observer for hairline progress line
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.getAttribute) return;

      const isReadingTarget =
        target.hasAttribute('data-reading-container') ||
        target.id === 'chat-messages-container' ||
        target.id === 'artifact-content-container' ||
        target.id === 'research-search-container' ||
        target.id === 'manus-deliverables-container';

      if (isReadingTarget) {
        const { scrollTop, scrollHeight, clientHeight } = target;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 0) {
          const pct = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
          setInternalProgress(pct);
        } else {
          setInternalProgress(0);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const effectiveProgress = readingProgress !== undefined ? readingProgress : internalProgress;
  const currentEngine = availableEngines.find((e) => e.name === selectedModel) || availableEngines[0];

  return (
    <header className="relative w-full h-14 shrink-0 bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] z-30 flex items-center justify-between px-2.5 sm:px-4 md:px-6 select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Left side: Navigation toggles, App Brand & Model selector */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          onClick={onToggleSidebarCollapse}
          className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {sidebarCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1a146b] to-[#312e81] flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0">
            <span className="material-symbols-outlined text-[18px] text-cyan-200">auto_awesome</span>
          </div>
          <span className="font-headline font-bold text-base text-[#1a146b] tracking-tight leading-none hidden xs:inline">
            LOGITIX
          </span>
        </div>

        {/* Model Switcher Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 shadow-2xs text-xs font-semibold text-slate-800 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: currentEngine.color || '#312e81' }}
            />
            <span className="truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[160px] md:max-w-none">
              {currentEngine.name}
            </span>
            <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">
              keyboard_arrow_down
            </span>
          </button>

          {modelDropdownOpen && (
            <>
              {/* Invisible overlay backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setModelDropdownOpen(false)}
              />

              <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50">
                <div className="px-3 py-1.5 text-[10px] font-code font-bold uppercase text-slate-400 border-b border-slate-100">
                  Synthesis Engines
                </div>
                <div className="mt-1 space-y-1 max-h-80 overflow-y-auto">
                  {availableEngines.map((engine) => (
                    <button
                      key={engine.id}
                      onClick={() => {
                        setSelectedModel(engine.name);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                        selectedModel === engine.name
                          ? 'bg-indigo-50/80 text-indigo-950 font-semibold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: engine.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">{engine.name}</span>
                          <span className="font-code text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">
                            {engine.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">
                          {engine.role}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side: Clean Icon-Only Action Buttons (NO Text Clutter on Any Device) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* New Session Button */}
        <button
          onClick={onNewSession}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-indigo-700 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="New Session"
          aria-label="New Session"
        >
          <span className="material-symbols-outlined text-[19px]">add</span>
        </button>

        {/* Export PDF Button (Shown on desktop & tablet) */}
        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="hidden md:flex w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-rose-600 shadow-2xs transition-all cursor-pointer items-center justify-center shrink-0"
            title="Export to formatted PDF"
            aria-label="Export PDF"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          </button>
        )}

        {/* Recent Activity Button */}
        {onOpenRecentActivity && (
          <button
            onClick={onOpenRecentActivity}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-indigo-950 shadow-2xs transition-all cursor-pointer relative flex items-center justify-center shrink-0"
            title="Recent Activity"
            aria-label="Open Recent Activity"
          >
            <span className="material-symbols-outlined text-[19px]">history</span>
            {recentActivityCount !== undefined && recentActivityCount > 0 && (
              <span className="min-w-[15px] h-[15px] px-1 rounded-full bg-[#1a146b] text-white text-[9px] font-bold flex items-center justify-center font-code leading-none absolute -top-1 -right-1">
                {recentActivityCount}
              </span>
            )}
          </button>
        )}

        {/* User Account / Login Button (Clean, Icon-Only) */}
        {currentUser ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="h-9 px-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
              title="Account Menu"
              aria-label="Account Menu"
            >
              <div className="w-7 h-7 rounded-full bg-[#1a146b] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                {currentUser.avatar || (currentUser.name ? currentUser.name.charAt(0) : 'U')}
              </div>
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                {userMenuOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 mt-1 w-64 max-w-[calc(100vw-24px)] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.name || 'User Profile'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-code">
                      {maskEmailForPrivacy(currentUser.email) || 'user@logitix.ai'}
                    </div>
                    <div className="inline-block mt-1 text-[10px] font-semibold text-[#1a146b] bg-indigo-50 px-2 py-0.5 rounded-full">
                      {currentUser.role || 'Member'}
                    </div>
                  </div>

                  {onOpenLogin && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenLogin();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-800 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer font-medium"
                    >
                      <span className="material-symbols-outlined text-[16px] text-indigo-700">switch_account</span>
                      <span>Switch Account / Re-login</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer font-medium"
                    >
                      <span className="material-symbols-outlined text-[16px] text-rose-500">logout</span>
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="w-9 h-9 rounded-xl bg-[#1a146b] hover:bg-[#312e81] text-white shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Sign In to LOGITIX"
            aria-label="Sign In"
          >
            <span className="material-symbols-outlined text-[18px] text-indigo-200">login</span>
          </button>
        )}
      </div>

      {/* Hairline Reading Progress Bar at Bottom Edge (Silent, Clean, No Text Clutter) */}
      {effectiveProgress > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={effectiveProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
        >
          <div
            className={`h-full transition-[width] duration-150 ease-out ${
              effectiveProgress >= 98
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-[#1a146b] via-indigo-600 to-cyan-500'
            }`}
            style={{ width: `${effectiveProgress}%` }}
          />
        </div>
      )}

      {/* Subtle streaming pulse along bottom hairline if streaming without scroll progress */}
      {activeStreaming && effectiveProgress === 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden bg-slate-100 pointer-events-none" aria-hidden="true">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-600 to-transparent animate-shimmer" />
        </div>
      )}
    </header>
  );
};
