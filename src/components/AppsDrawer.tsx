import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  MessageSquare,
  Mic,
  FileText,
  Mail,
  Globe,
  GraduationCap,
  Bot,
  Sparkles,
  Layers,
  Cpu,
  GitBranch,
  Network,
  Settings,
  ArrowRight,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { ViewMode } from '../types.js';
import { LogitixLogo } from './LogitixLogo.js';

export interface AppItem {
  id: ViewMode;
  name: string;
  category: 'core' | 'ai' | 'productivity' | 'labs';
  categoryLabel: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  badge?: string;
  isPopular?: boolean;
}

interface AppsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  darkMode?: boolean;
}

export const APPS_CATALOG: AppItem[] = [
  // Primary AI Assistants
  {
    id: 'chat',
    name: 'AI Chat Assistant',
    category: 'core',
    categoryLabel: 'Core Assistant',
    description: 'Ask questions, write essays, solve code, and generate creative images with multi-AI intelligence.',
    icon: MessageSquare,
    color: 'from-blue-500 to-indigo-600',
    badge: 'Default',
    isPopular: true,
  },
  {
    id: 'voice_spark',
    name: 'Audio Spark',
    category: 'core',
    categoryLabel: 'Core Assistant',
    description: 'Real-time hands-free voice assistant. Talk and listen naturally out loud.',
    icon: Mic,
    color: 'from-emerald-500 to-teal-600',
    badge: 'Live Audio',
    isPopular: true,
  },
  {
    id: 'notepad',
    name: 'Smart Notepad',
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description: 'Quick notes, organized ideas, markdown scratchpad, and automatic cloud saves.',
    icon: FileText,
    color: 'from-amber-500 to-orange-600',
    isPopular: true,
  },
  {
    id: 'school_companion',
    name: 'School & Attendance',
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description: 'Track attendance, class groups, leave records, and student schedules in one place.',
    icon: GraduationCap,
    color: 'from-indigo-500 to-purple-600',
    badge: 'Essential',
  },
  {
    id: 'email',
    name: 'Executive Email',
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description: 'Compose, refine, and manage professional correspondence with AI assistance.',
    icon: Mail,
    color: 'from-rose-500 to-pink-600',
  },
  {
    id: 'browser',
    name: 'Web Browser',
    category: 'productivity',
    categoryLabel: 'Daily Productivity',
    description: 'Integrated web research browser with live sandbox preview.',
    icon: Globe,
    color: 'from-cyan-500 to-blue-600',
  },

  // Specialized AI Power Tools
  {
    id: 'manus_ai',
    name: 'Manus AI Engine',
    category: 'ai',
    categoryLabel: 'Advanced AI & Agents',
    description: 'Autonomous multi-step agent that plans, investigates, and executes complex research tasks.',
    icon: Bot,
    color: 'from-cyan-500 to-teal-500',
    badge: 'Autonomous',
    isPopular: true,
  },
  {
    id: 'google_ai_studio',
    name: 'Google AI Studio',
    category: 'ai',
    categoryLabel: 'Advanced AI & Agents',
    description: 'Developer prompt engineering, web app generator, and SDK code workspace.',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    badge: 'App Creator',
  },
  {
    id: 'consensus_matrix',
    name: 'Consensus Matrix',
    category: 'ai',
    categoryLabel: 'Advanced AI & Agents',
    description: 'Query Manus AI, Claude 3.5, DeepSeek-R1, and Gemini simultaneously and compare answers.',
    icon: Layers,
    color: 'from-violet-500 to-purple-700',
    badge: 'Multi-Model',
  },

  // Labs & Developer Tools
  {
    id: 'neural_graph',
    name: 'Neural Graph',
    category: 'labs',
    categoryLabel: 'Labs & Deep Tech',
    description: 'Interactive 2D/3D visual network mapping connections between your notes and ideas.',
    icon: Network,
    color: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'hardware_twin',
    name: 'Hardware Digital Twin',
    category: 'labs',
    categoryLabel: 'Labs & Deep Tech',
    description: 'Simulate microcontroller circuits, GPIO sensors, and generate firmware code.',
    icon: Cpu,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'branching_workspace',
    name: 'Branching Workspace',
    category: 'labs',
    categoryLabel: 'Labs & Deep Tech',
    description: 'Git-style tree branching to explore multiple creative hypotheses in parallel.',
    icon: GitBranch,
    color: 'from-fuchsia-500 to-rose-600',
  },
  {
    id: 'settings',
    name: 'Settings & Models',
    category: 'core',
    categoryLabel: 'System',
    description: 'Configure active AI models, appearance preferences, API credentials, and profile.',
    icon: Settings,
    color: 'from-slate-600 to-slate-700',
  },
];

export const AppsDrawer: React.FC<AppsDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  darkMode = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'core' | 'productivity' | 'ai' | 'labs'>('all');

  const categories: { id: 'all' | 'core' | 'productivity' | 'ai' | 'labs'; label: string }[] = [
    { id: 'all', label: 'All Tools' },
    { id: 'core', label: 'Core Assistant' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'ai', label: 'Advanced AI' },
    { id: 'labs', label: 'Labs' },
  ];

  const filteredApps = APPS_CATALOG.filter((app) => {
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase()) ||
      app.categoryLabel.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden z-10 ${
              darkMode
                ? 'bg-slate-950/95 border-white/10 text-white shadow-purple-950/40'
                : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            {/* Header with Search & Close */}
            <div className={`p-4 sm:p-6 border-b shrink-0 flex flex-col gap-3 ${
              darkMode ? 'border-white/10 bg-slate-900/50' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                    <LogitixLogo size={24} darkMode={true} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                      LOGITIX Apps & Tools
                      <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {APPS_CATALOG.length} Tools
                      </span>
                    </h2>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Select any specialized tool to switch your workspace instantly.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    darkMode
                      ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Close Tools Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search apps by name, purpose, or topic..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`w-full h-10 pl-10 pr-4 rounded-xl border text-xs leading-normal focus:outline-none transition-colors ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 shadow-xs'
                    }`}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar shrink-0 text-xs">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                            : darkMode
                            ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Grid of Apps */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {filteredApps.length === 0 ? (
                <div className="py-12 text-center">
                  <Search className="w-10 h-10 mx-auto mb-2 text-slate-500/40" />
                  <p className="text-sm font-semibold">No tools match your search</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Try searching for terms like "audio", "notes", "attendance", or "code"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredApps.map((app) => {
                    const Icon = app.icon;
                    const isCurrent = activeView === app.id;

                    return (
                      <div
                        key={app.id}
                        onClick={() => {
                          onSelectView(app.id);
                          onClose();
                        }}
                        className={`p-4 rounded-2xl border transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
                          isCurrent
                            ? darkMode
                              ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                              : 'bg-blue-50/80 border-blue-400 shadow-md shadow-blue-500/10'
                            : darkMode
                            ? 'bg-white/5 border-white/5 hover:border-blue-500/40 hover:bg-white/10 hover:shadow-lg'
                            : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${app.color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex items-center gap-1">
                              {app.badge && (
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                  darkMode
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                    : 'bg-purple-100 text-purple-800 border-purple-200'
                                }`}>
                                  {app.badge}
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 className={`text-sm font-bold tracking-tight mb-1 group-hover:text-blue-500 transition-colors ${
                            darkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {app.name}
                          </h3>

                          <p className={`text-xs leading-relaxed line-clamp-2 mb-3 ${
                            darkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {app.description}
                          </p>
                        </div>

                        <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-semibold ${
                          darkMode ? 'border-white/5 text-slate-400 group-hover:text-blue-400' : 'border-slate-100 text-slate-500 group-hover:text-blue-600'
                        }`}>
                          <span>{app.categoryLabel}</span>
                          <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Open <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Tip */}
            <div className={`px-6 py-3 border-t text-xs flex items-center justify-between ${
              darkMode ? 'border-white/10 bg-slate-900/40 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Tip: You can switch back to the AI Assistant anytime by clicking <strong>Chat</strong> in the sidebar.</span>
              </div>
              <button
                onClick={onClose}
                className="text-xs font-semibold hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
