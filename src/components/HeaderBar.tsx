import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, MoreVertical, X, Sparkles, Cpu, Check, ChevronDown, Settings, RefreshCw, Layers, Menu, LogOut, ExternalLink, ArrowRight, ShieldCheck, Zap, LayoutGrid, ArrowLeft } from 'lucide-react';
import { LogitixLogo } from './LogitixLogo.js';
import { ViewMode } from '../types.js';

interface HeaderBarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeView: string;
  setActiveView?: (view: ViewMode) => void;
  onNewChat?: () => void;
  onToggleMobileSidebar?: () => void;
  onOpenAppsDrawer?: () => void;
  onLogout?: () => void;
  isReady?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  darkMode,
  setDarkMode,
  activeView,
  setActiveView,
  onNewChat,
  onToggleMobileSidebar,
  onOpenAppsDrawer,
  onLogout,
  isReady = true,
}) => {
  const [showAiModal, setShowAiModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Active Multi-AI Fusion Models Architecture (Consensus Pipeline)
  const fusionModels = [
    {
      id: 'manus-ai',
      name: 'Manus AI',
      provider: 'Manus',
      role: 'Autonomous planning & execution engine',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      dotColor: 'bg-emerald-400',
    },
    {
      id: 'claude35',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      role: 'Nuanced technical code & refined prose',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      dotColor: 'bg-amber-400',
    },
    {
      id: 'deepseekR1',
      name: 'DeepSeek-R1',
      provider: 'DeepSeek',
      role: 'Deep step-by-step reasoning & math proof',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      dotColor: 'bg-blue-400',
    },
    {
      id: 'gemini36',
      name: 'Gemini 3.7 Flash',
      provider: 'Google',
      role: 'Ultra-fast search grounding & multimodal arbiter',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      dotColor: 'bg-purple-400',
    },
    {
      id: 'manusAi',
      name: 'Manus AI',
      provider: 'Autonomous Agent',
      role: 'Autonomous workflow, planning & multi-step execution',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      dotColor: 'bg-cyan-400',
      actionView: 'manus_ai' as ViewMode,
    },
    {
      id: 'aiStudio',
      name: 'Google AI Studio',
      provider: 'App & Web Creator',
      role: 'Developer playground, system instructions & SDK generation',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      dotColor: 'bg-rose-400',
      actionView: 'google_ai_studio' as ViewMode,
    },
  ];

  const getViewLabel = (view: ViewMode) => {
    const viewLabels: Record<string, string> = {
      chat: 'Chat',
      manus_ai: 'Manus AI Engine',
      google_ai_studio: 'Google AI Studio',
      school_companion: 'School & Attendance',
      voice_spark: 'Audio Spark',
      notepad: 'Notepad',
      email: 'Email',
      browser: 'Browser',
      settings: 'Settings',
      google_search: 'Google Search',
      google_chat: 'Google Chat',
      neural_graph: 'Neural Graph',
      consensus_matrix: 'Consensus Matrix',
      hardware_twin: 'Hardware Twin',
      branching_workspace: 'Branching Workspace',
    };
    return viewLabels[view] || view;
  };

  return (
    <>
      <motion.header
        initial={{ y: -56, opacity: 0 }}
        animate={{
          y: isReady !== false ? 0 : -56,
          opacity: isReady !== false ? 1 : 0,
        }}
        transition={{
          duration: 0.7,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`h-14 px-2 sm:px-6 border-b transition-colors duration-300 backdrop-blur-md flex items-center justify-between select-none z-20 relative gap-2 ${
          darkMode ? 'border-white/5 bg-black/20 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-shrink">
          {/* Mobile Hamburger Drawer Menu Button */}
          <button
            onClick={onToggleMobileSidebar}
            className={`md:hidden p-1.5 rounded-xl border transition-colors cursor-pointer flex-shrink-0 ${
              darkMode
                ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Open Mobile Navigation"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex-shrink-0">
            <LogitixLogo size={26} darkMode={darkMode} className="sm:hidden" />
            <LogitixLogo size={32} darkMode={darkMode} className="hidden sm:flex" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <div className="flex flex-col min-w-0 leading-none">
              <div className="flex items-center gap-1 min-w-0">
                <span className={`text-[11px] sm:text-sm font-black tracking-wider sm:tracking-[0.22em] font-sans uppercase whitespace-nowrap ${
                  darkMode
                    ? 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-purple-300 drop-shadow-[0_0_10px_rgba(0,212,255,0.4)]'
                    : 'bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 font-black'
                }`}>
                  LOGITIX AI
                </span>
                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-medium tracking-normal normal-case hidden md:inline truncate`}>
                  / {getViewLabel(activeView as ViewMode)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Return to Chat button when in other views */}
          {activeView !== 'chat' && setActiveView && (
            <button
              onClick={() => setActiveView('chat')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                darkMode
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
                  : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 shadow-2xs'
              }`}
              title="Return to Main AI Chat"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Chat</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 relative">
          {/* Apps & Tools Drawer Launcher Button */}
          {onOpenAppsDrawer && (
            <button
              onClick={onOpenAppsDrawer}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-2xs'
              }`}
              title="Open Apps & Tools Drawer (12+ Tools)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Apps & Tools</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800 font-bold'
              }`}>
                12+
              </span>
            </button>
          )}

          {/* LOGITIX Multi-AI Fusion Status Button */}
          <button
            onClick={() => setShowAiModal(!showAiModal)}
            className={`flex items-center gap-1 sm:gap-2 text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-all shadow-xs cursor-pointer group flex-shrink-0 ${
              darkMode
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-200 hover:bg-purple-500/25 shadow-purple-500/10'
                : 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100 shadow-purple-200/50'
            }`}
            title="View Multi-AI Fusion Status & Architecture"
          >
            <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 animate-pulse group-hover:rotate-12 transition-transform ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className="hidden sm:inline whitespace-nowrap">LOGITIX Multi-AI Fusion</span>
            
            {/* Desktop badge */}
            <span className={`hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold border whitespace-nowrap ${
              darkMode ? 'bg-purple-500/30 text-purple-200 border-purple-400/20' : 'bg-purple-200 text-purple-900 border-purple-300'
            }`}>
              Active ({fusionModels.length} Engines)
            </span>

            {/* Mobile compact badge */}
            <span className={`sm:hidden text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold border whitespace-nowrap ${
              darkMode ? 'bg-purple-500/30 text-purple-200 border-purple-400/20' : 'bg-purple-200 text-purple-900 border-purple-300'
            }`}>
              6 AI
            </span>

            <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${showAiModal ? 'rotate-180' : ''} ${darkMode ? 'text-purple-300' : 'text-purple-700'}`} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 rounded-lg transition-colors border cursor-pointer flex-shrink-0 ${
              darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
            }`}
            title={darkMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-purple-600" />}
          </button>

          {/* More Options Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`p-1.5 rounded-lg transition-colors border border-transparent hover:border-white/10 cursor-pointer flex-shrink-0 ${
              showMoreMenu ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu for More Options */}
          {showMoreMenu && (
            <div className="absolute right-0 top-11 w-56 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5 border-b border-white/5 mb-1">
                Quick Controls
              </div>

              {onOpenAppsDrawer && (
                <button
                  onClick={() => {
                    onOpenAppsDrawer();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                  <span>Browse All Apps & Tools</span>
                </button>
              )}

              {setActiveView && (
                <button
                  onClick={() => {
                    setActiveView('settings');
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI Engine Settings</span>
                </button>
              )}

              {onNewChat && (
                <button
                  onClick={() => {
                    onNewChat();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Start Fresh Chat</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowAiModal(true);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Multi-AI Model Status</span>
              </button>

              {onLogout && (
                <button
                  onClick={() => {
                    onLogout();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Switch Account / Sign Out</span>
                </button>
              )}

              <div className="border-t border-white/5 my-1" />

              <div className="px-3 py-1.5 text-[10px] text-slate-400 flex items-center justify-between">
                <span>LOGITIX Core Version</span>
                <span className="font-mono text-purple-300 font-medium">v3.8 Multi</span>
              </div>
            </div>
          )}
        </div>
      </motion.header>

      {/* Multi-AI Fusion Architecture & Status Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    LOGITIX Multi-AI Fusion Engine
                  </h3>
                  <p className="text-xs text-slate-400">
                    Combining insights across leading frontier AI models in real time.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Multi-AI Pipeline Architecture List */}
            <div className="space-y-2.5 mb-6 max-h-[60vh] overflow-y-auto pr-1">
              {fusionModels.map((model) => (
                <div
                  key={model.id}
                  className="p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${model.dotColor} shadow-[0_0_8px_rgba(255,255,255,0.4)] flex-shrink-0 animate-pulse`} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{model.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${model.badgeColor}`}>
                          {model.provider}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{model.role}</div>
                    </div>
                  </div>

                  {model.actionView && setActiveView && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAiModal(false);
                        setActiveView(model.actionView!);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0 ml-2"
                      title={`Open Dedicated ${model.name} Workspace`}
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Status */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Consensus Engine: <strong className="text-purple-300">All 6 Frontier Engines Active</strong></span>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

