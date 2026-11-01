import React from 'react';
import {
  MessageSquare,
  Sparkles,
  Mic,
  LayoutGrid,
  Globe,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { LogitixLogo } from './LogitixLogo.js';

interface WelcomeScreenProps {
  userName: string;
  onSelectPrompt: (promptText: string) => void;
  onOpenAppsDrawer?: () => void;
  onSelectAudioSpark?: () => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  darkMode?: boolean;
  isExpanded?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  userName,
  onSelectPrompt,
  onOpenAppsDrawer,
  onSelectAudioSpark,
  webSearchEnabled,
  setWebSearchEnabled,
  darkMode = false,
  isExpanded = false,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  const starterCards = [
    {
      id: 'chat',
      title: 'Chat & Ask Anything',
      category: 'Multi-AI Intelligence',
      desc: 'Ask complex questions, draft emails, write code, or get strategic advice.',
      icon: MessageSquare,
      color: 'from-blue-500 to-indigo-600',
      badge: 'Manus AI & Claude',
      onClick: () => onSelectPrompt('Hello Logitix! How can you help me today?'),
    },
    {
      id: 'image',
      title: 'Generate an Image',
      category: 'Creative Studio',
      desc: 'Create photorealistic visuals, futuristic concept art, or logos on demand.',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
      badge: 'Imagen 3 AI',
      onClick: () => onSelectPrompt('Create an image of a futuristic neon cybernetic workstation on a glass high-rise balcony at twilight with soft ambient lighting'),
    },
    {
      id: 'voice',
      title: 'Voice Spark (Speech)',
      category: 'Hands-Free Conversation',
      desc: 'Talk and listen naturally out loud in real time with continuous voice interaction.',
      icon: Mic,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Live Audio',
      onClick: () => {
        if (onSelectAudioSpark) {
          onSelectAudioSpark();
        } else {
          onSelectPrompt('Let us talk via Voice Spark');
        }
      },
    },
    {
      id: 'apps',
      title: 'Explore All 12+ Tools',
      category: 'Executive Suite',
      desc: 'Open School Attendance, Smart Notepad, Autonomous Manus AI, and Labs.',
      icon: LayoutGrid,
      color: 'from-amber-500 to-orange-600',
      badge: 'Apps Drawer',
      onClick: () => {
        if (onOpenAppsDrawer) {
          onOpenAppsDrawer();
        } else {
          onSelectPrompt('Show me what tools are available in Logitix');
        }
      },
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar w-full select-none flex flex-col">
      <div
        className={`m-auto p-4 sm:p-6 text-center w-full transition-all duration-300 flex flex-col items-center justify-center ${
          isExpanded ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        {/* Animated Center Logo */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-3 sm:mb-4 mt-1"
        >
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-emerald-600/20 rounded-full blur-2xl opacity-75 animate-pulse" />
            <LogitixLogo size={68} showText={true} darkMode={darkMode} />
          </div>
        </motion.div>

        {/* Clear Purpose Banner & Heading */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-2 mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-blue-500/20 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className={darkMode ? 'text-blue-300' : 'text-blue-700'}>
              Your Personal AI Executive Assistant
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
              Multi-Model AI
            </span>
          </div>

          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {getGreeting()}, {userName}
          </h2>

          <p className={`text-xs sm:text-sm max-w-xl mx-auto leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            What would you like to accomplish? Chat with AI, create visuals, or launch an integrated app below.
          </p>
        </motion.div>

        {/* 4 Clear Action Cards Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full mb-6 sm:mb-7"
        >
          {starterCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={card.onClick}
                className={`p-4 rounded-2xl text-left transition-all duration-300 group cursor-pointer border relative overflow-hidden flex flex-col justify-between ${
                  darkMode
                    ? 'glass-card-dark hover:border-blue-500/50 hover:bg-white/10 hover:shadow-xl hover:shadow-blue-500/10 text-slate-200'
                    : 'glass-card-light hover:border-blue-400 hover:bg-white hover:shadow-md text-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                      {card.category}
                    </span>
                    <div className={`p-1.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-xs group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className={`text-sm sm:text-base font-bold tracking-tight mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {card.title}
                  </div>

                  <div className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-600 group-hover:text-slate-800'}`}>
                    {card.desc}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[11px] font-semibold text-blue-500 dark:text-blue-400">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {card.badge}
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Start <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </motion.div>

        {/* Bottom Controls & Explainer Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 w-full"
        >
          {/* Web Search Toggle Pill */}
          <button
            onClick={() => setWebSearchEnabled((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 transition-all shadow-xs backdrop-blur-xl cursor-pointer ${
              webSearchEnabled
                ? darkMode
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-200 hover:bg-purple-500/30'
                  : 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100'
                : darkMode
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-300'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${webSearchEnabled ? 'text-purple-400' : 'text-slate-500'}`} />
            <span>Web Search Grounding</span>
            <span
              className={`w-2 h-2 rounded-full ${
                webSearchEnabled ? 'bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
              }`}
            />
          </button>

          {/* Quick Apps Drawer Trigger */}
          {onOpenAppsDrawer && (
            <button
              onClick={onOpenAppsDrawer}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
              <span>Browse All Tools (12)</span>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};
