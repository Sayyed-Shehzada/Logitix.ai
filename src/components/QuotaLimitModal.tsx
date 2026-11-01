import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Clock, ShieldAlert, Sparkles, MessageSquare, Image as ImageIcon, HelpCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { QuotaStatus, formatResetTime } from '../core/quota.js';

interface QuotaLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotaStatus: QuotaStatus;
  limitType?: 'questions' | 'images' | 'chats' | 'info';
  customTitle?: string;
  customMessage?: string;
  darkMode?: boolean;
}

export const QuotaLimitModal: React.FC<QuotaLimitModalProps> = ({
  isOpen,
  onClose,
  quotaStatus,
  limitType = 'info',
  customTitle,
  customMessage,
  darkMode = true,
}) => {
  if (!isOpen) return null;

  const isPrivileged = quotaStatus.isPrivileged;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl overflow-hidden ${
            darkMode
              ? 'bg-slate-950 border-white/10 text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
          }`}
        >
          {/* Subtle decorative glow */}
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isPrivileged ? 'bg-emerald-500/10' : 'bg-amber-500/10'
          }`} />

          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-xl transition-colors cursor-pointer ${
              darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5 mb-5">
            <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
              isPrivileged
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : limitType === 'info'
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}>
              {isPrivileged ? (
                <Zap className="w-6 h-6 fill-emerald-400" />
              ) : limitType === 'questions' ? (
                <HelpCircle className="w-6 h-6" />
              ) : limitType === 'images' ? (
                <ImageIcon className="w-6 h-6" />
              ) : limitType === 'chats' ? (
                <MessageSquare className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {customTitle || (
                    isPrivileged
                      ? `${quotaStatus.roleTier} Priority Access`
                      : limitType === 'questions'
                      ? '24-Hour Question Limit Reached'
                      : limitType === 'images'
                      ? '24-Hour Image Limit Reached'
                      : limitType === 'chats'
                      ? 'Chat Limit Reached (20/20)'
                      : 'Workspace Member Access Tier'
                  )}
                </h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isPrivileged
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}>
                  {quotaStatus.roleTier}
                </span>
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {customMessage || (
                  isPrivileged
                    ? 'Your account has full executive privileges with fastest response priority, unlimited chat storage, and unlimited AI image generation.'
                    : 'Workspace Members enjoy standard access with daily 24-hour rate limits designed to ensure stability across shared resources.'
                )}
              </p>
            </div>
          </div>

          {/* Quota Overview Grid */}
          <div className="space-y-2.5 mb-5">
            {/* Chats Limit */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold">Active Chats</div>
                  <div className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isPrivileged ? 'Unlimited conversations' : 'Maximum 20 active conversations'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-mono font-bold ${
                  isPrivileged
                    ? 'text-emerald-400'
                    : quotaStatus.chatsRemaining === 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}>
                  {isPrivileged ? 'Unlimited' : `${quotaStatus.chatsCount} / 20`}
                </span>
              </div>
            </div>

            {/* Questions Limit (24h) */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-semibold">Questions (24h Rolling Window)</div>
                  <div className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isPrivileged ? 'Unlimited queries' : 'Maximum 50 queries every 24 hours'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-mono font-bold ${
                  isPrivileged
                    ? 'text-emerald-400'
                    : quotaStatus.questionsRemaining === 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}>
                  {isPrivileged ? 'Unlimited' : `${quotaStatus.questionsUsed24h} / 50`}
                </span>
                {!isPrivileged && quotaStatus.questionsResetInMs > 0 && (
                  <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1 justify-end mt-0.5">
                    <Clock className="w-2.5 h-2.5" /> Resets in {formatResetTime(quotaStatus.questionsResetInMs)}
                  </div>
                )}
              </div>
            </div>

            {/* Images Limit (24h) */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-semibold">AI Image Generation (24h Window)</div>
                  <div className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isPrivileged ? 'Unlimited image creation' : 'Maximum 7 images every 24 hours'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-mono font-bold ${
                  isPrivileged
                    ? 'text-emerald-400'
                    : quotaStatus.imagesRemaining === 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}>
                  {isPrivileged ? 'Unlimited' : `${quotaStatus.imagesUsed24h} / 7`}
                </span>
                {!isPrivileged && quotaStatus.imagesResetInMs > 0 && (
                  <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1 justify-end mt-0.5">
                    <Clock className="w-2.5 h-2.5" /> Resets in {formatResetTime(quotaStatus.imagesResetInMs)}
                  </div>
                )}
              </div>
            </div>

            {/* Speed Tier */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 ${isPrivileged ? 'text-emerald-400' : 'text-amber-400'}`} />
                <div>
                  <div className="text-xs font-semibold">Response Engine Speed</div>
                  <div className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isPrivileged ? 'Zero delay, highest priority compute' : 'Standard shared queue execution'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isPrivileged
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isPrivileged ? '⚡ Fastest' : 'Standard'}
                </span>
              </div>
            </div>
          </div>

          {/* Privilege Promotion Info */}
          {!isPrivileged ? (
            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              darkMode ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-purple-500/30 text-slate-300' : 'bg-purple-50 border-purple-200 text-slate-800'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Want Unlimited Access & Fastest Speed?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                The Workspace Owner (<span className="text-slate-200 font-mono">logitix.ai@gmail.com</span>) and Admins have authority to upgrade your account to <strong className="text-purple-300">Pro Member</strong> or <strong className="text-blue-300">Admin</strong> in Settings.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Privileged Account Verified: You enjoy permanent unlimited access across all models.</span>
            </div>
          )}

          {/* Action button */}
          <div className="mt-5 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
