import React, { useState, useRef, useEffect } from 'react';
import { User, Copy, Check, Sparkles, Send, FileText, ChevronDown, ChevronRight, Zap, CheckCircle2, Cpu, Download, FileCode, ShieldCheck, Hash, Maximize2, Minimize2, X, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from '../types.js';
import { LogitixLogo } from './LogitixLogo.js';
import { useMarkdownWorker } from '../hooks/useMarkdownWorker.js';
import { ParsedBlock } from '../workers/markdownWorker.js';
import { exportAsMarkdown, exportAsPDF, exportCodeSnippetAsPDF } from '../utils/exportConversation.js';
import { format12HourTime } from '../utils/formatTime.js';
import { detectAppOrWebsiteCreationIntent } from '../utils/creatorIntent.js';
import { GoogleAIStudioCreatorCard } from './GoogleAIStudioCreatorCard.js';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendEmailConfirm?: (draft: any) => void;
  onOpenFullStudio?: (initialPrompt: string) => void;
  conversationTitle?: string;
  darkMode?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendEmailConfirm,
  onOpenFullStudio,
  conversationTitle = 'Logitix AI Conversation',
  darkMode = false,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const { parsedBlocksMap, parseMarkdown, isWorkerActive } = useMarkdownWorker();

  const answerRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const lastAssistantMsg = [...messages].reverse().find((m) => m.sender === 'assistant');

  // Trigger web worker markdown parsing whenever messages arrive or update
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.content) {
        parseMarkdown(msg.id, msg.content);
      }
    });
  }, [messages, parseMarkdown]);

  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [messages.length, isLoading, lastAssistantMsg?.id, lastAssistantMsg?.content]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePlan = (msgId: string) => {
    setExpandedPlans((prev) => ({ ...prev, [msgId]: !(prev[msgId] ?? false) }));
  };

  const handleExportMarkdown = () => {
    exportAsMarkdown(messages, conversationTitle);
    setShowExportMenu(false);
    setExportSuccessMsg('Exported as Markdown (.md)');
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  const handleExportPDF = () => {
    exportAsPDF(messages, conversationTitle);
    setShowExportMenu(false);
    setExportSuccessMsg('Exported as PDF Document (.pdf)');
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  return (
    <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar z-10 mx-auto w-full transition-all duration-300 ${
      isExpanded ? 'max-w-5xl' : 'max-w-3xl'
    }`}>
      {/* Top Header Control Bar: Web Worker Status & Export Action */}
      <div className={`flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono px-3 py-1.5 rounded-xl border backdrop-blur-md ${
        darkMode ? 'text-slate-400 bg-white/5 border-white/5' : 'text-slate-600 bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-1.5">
          <Cpu className={`w-3.5 h-3.5 ${isWorkerActive ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>Markdown Engine:</span>
          <span className={isWorkerActive ? 'text-emerald-500 font-semibold' : 'text-slate-400'}>
            {isWorkerActive ? 'Offloaded to Web Worker' : 'Main Thread'}
          </span>
        </div>

        <div className="flex items-center gap-2 relative" ref={exportMenuRef}>
          {exportSuccessMsg && (
            <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Check className="w-3 h-3" /> {exportSuccessMsg}
            </span>
          )}

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all shadow-sm ${
                isExpanded
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30'
                  : darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title={isExpanded ? 'Collapse Chat Width' : 'Expand Chat Width'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          )}

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Chat</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Export Options Dropdown Menu */}
          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute right-0 top-8 w-48 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1.5 z-50 backdrop-blur-2xl space-y-1"
              >
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-white/5 mb-1">
                  Save Conversation
                </div>
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white flex items-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <div className="flex flex-col">
                    <span className="font-semibold">Export as PDF</span>
                    <span className="text-[9px] text-slate-400">Styled printable document (.pdf)</span>
                  </div>
                </button>

                <button
                  onClick={handleExportMarkdown}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white flex items-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <div className="flex flex-col">
                    <span className="font-semibold">Export as Markdown</span>
                    <span className="text-[9px] text-slate-400">Raw markdown file (.md)</span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {messages.map((msg, index) => {
        const isUser = msg.sender === 'user';
        const isTargetAnswer = !isUser && msg.id === lastAssistantMsg?.id;
        const isPlanOpen = expandedPlans[msg.id] ?? false;
        const workerParsedBlocks = parsedBlocksMap[msg.id];

        // Check if this is an assistant response to an App or Website creation user request
        let creationIntentForThisAssistantMsg = null;
        if (!isUser) {
          // Look backwards to find the immediate user prompt that triggered this response
          const previousUserMsg = [...messages.slice(0, index)].reverse().find((m) => m.sender === 'user');
          if (previousUserMsg) {
            const detected = detectAppOrWebsiteCreationIntent(previousUserMsg.content);
            if (detected.isAppOrWebsiteCreation) {
              creationIntentForThisAssistantMsg = {
                intent: detected,
                prompt: previousUserMsg.content,
              };
            }
          }
        }

        return (
          <motion.div
            key={msg.id}
            ref={isTargetAnswer ? answerRef : null}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {/* Assistant Avatar with Logitix Logo */}
            {!isUser && (
              <div className="flex-shrink-0 mt-0.5">
                <LogitixLogo size={34} darkMode={darkMode} />
              </div>
            )}

            <div className={`flex flex-col max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
              {/* Sender Name & Timestamp & Speed Tier */}
              <div className={`flex items-center gap-2 text-[11px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{isUser ? 'You' : 'Logitix Agent'}</span>
                <span>•</span>
                <span>{format12HourTime(msg.timestamp)}</span>
                {!isUser && msg.speedTier === 'fastest' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-semibold">
                    <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" /> Fastest Speed
                  </span>
                )}
                {!isUser && msg.speedTier === 'slow' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-md font-medium">
                    Standard Speed
                  </span>
                )}
              </div>

              {/* Agent Reasoning Steps */}
              {!isUser && msg.plan && msg.plan.length > 0 && (
                <div className={`w-full rounded-xl border overflow-hidden text-xs transition-all ${
                  darkMode ? 'bg-black/30 border-white/5 backdrop-blur-xl' : 'bg-slate-100 border-slate-200 shadow-xs'
                }`}>
                  <button
                    onClick={() => togglePlan(msg.id)}
                    className={`w-full px-3 py-1.5 flex items-center justify-between font-mono text-[11px] transition-colors cursor-pointer ${
                      darkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200' : 'bg-slate-200/50 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-3 h-3 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span>Thought for {msg.plan.length} steps</span>
                    </div>
                    {isPlanOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <AnimatePresence>
                    {isPlanOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`p-3 space-y-1.5 border-t font-mono text-[11px] ${
                          darkMode ? 'border-white/5 text-slate-300 bg-black/40' : 'border-slate-200 text-slate-800 bg-slate-50'
                        }`}
                      >
                        {msg.plan.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>• {step}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Tool Execution Badges */}
              {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.toolCalls.map((tc, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-xs ${
                        darkMode ? 'bg-white/5 border-white/10 text-slate-200 backdrop-blur-xl' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{tc.toolName}</span>
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>({tc.action})</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Message Content Bubble */}
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed select-text cursor-text ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-none shadow-md shadow-purple-500/20'
                    : darkMode
                      ? 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none shadow-xl backdrop-blur-2xl'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Worker Processed Markdown Rendering */}
                <RenderFormattedContent
                  content={msg.content}
                  msgId={msg.id}
                  parsedBlocks={workerParsedBlocks}
                  onCopy={handleCopyCode}
                  copiedId={copiedId}
                  darkMode={darkMode}
                  onPreview={setPreviewPhotoUrl}
                />

                {/* Google AI Studio App & Website Creation Studio Panel (Only when user requested to create an app or website) */}
                {!isUser && creationIntentForThisAssistantMsg && (
                  <GoogleAIStudioCreatorCard
                    intent={creationIntentForThisAssistantMsg.intent}
                    originalUserPrompt={creationIntentForThisAssistantMsg.prompt}
                    darkMode={darkMode}
                    onOpenFullStudio={onOpenFullStudio}
                  />
                )}

                {/* Email Draft Preview card if created by tool */}
                {msg.toolCalls?.some((t) => t.toolName === 'email_tool') && (
                  <div className="mt-4 p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-xs text-slate-200 font-semibold border-b border-white/10 pb-2">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" /> Email Draft Created
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Ready to Send
                      </span>
                    </div>
                    <div className="text-xs space-y-1 font-mono text-slate-300">
                      <div><span className="text-slate-500">To:</span> Dr. Robert Vance &lt;robert.vance@university.edu&gt;</div>
                      <div><span className="text-slate-500">Subject:</span> CS490 Project Submission Update</div>
                    </div>
                    <button
                      onClick={() => onSendEmailConfirm?.({ to: 'robert.vance@university.edu', subject: 'CS490 Project Submission Update' })}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-xs flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all shadow-md shadow-purple-500/20 border border-white/10"
                    >
                      <Send className="w-3.5 h-3.5" /> Confirm & Send Email Now
                    </button>
                  </div>
                )}
              </div>

              {/* Verified Execution Receipt Card */}
              {!isUser && msg.executionReceipt && (
                <div className="w-full mt-1">
                  <div className={`rounded-xl border overflow-hidden text-xs transition-all ${
                    darkMode ? 'bg-purple-500/5 border-purple-500/20 backdrop-blur-xl' : 'bg-purple-50 border-purple-200'
                  }`}>
                    <button
                      onClick={() => setExpandedReceipts((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                      className="w-full px-3 py-1.5 flex items-center justify-between font-mono text-[11px] text-purple-300 hover:text-purple-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-semibold">Cryptographic Receipt: {msg.executionReceipt.receiptId}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {msg.executionReceipt.consensusScore}% Consensus
                        </span>
                      </div>
                      {expandedReceipts[msg.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    {expandedReceipts[msg.id] && (
                      <div className={`p-3 space-y-1.5 border-t font-mono text-[11px] ${
                        darkMode ? 'border-purple-500/10 text-slate-300 bg-black/40' : 'border-purple-200 text-slate-700 bg-white'
                      }`}>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Action:</span>
                          <span className="text-cyan-300">{msg.executionReceipt.actionType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Latency:</span>
                          <span className="text-emerald-400">{msg.executionReceipt.executionTimeMs}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Verification Hash:</span>
                          <span className="text-[10px] text-purple-400 break-all">{msg.executionReceipt.verificationHash}</span>
                        </div>
                        <div className="pt-1">
                          <span className="text-slate-400 block mb-1">Models Participated:</span>
                          <div className="flex flex-wrap gap-1">
                            {msg.executionReceipt.modelsParticipated.map((m, idx) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-200">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2.5 mt-2">
                  {msg.attachments.map((att, idx) => {
                    const isImg = !!att.url && (att.isPhoto || att.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name));
                    if (isImg && att.url) {
                      return (
                        <div
                          key={idx}
                          onClick={() => setPreviewPhotoUrl(att.url || null)}
                          className="group relative rounded-xl overflow-hidden border border-white/15 bg-black/40 shadow-md max-w-[240px] cursor-pointer hover:border-blue-400/50 transition-all"
                        >
                          <img
                            src={att.url}
                            alt={att.name}
                            referrerPolicy="no-referrer"
                            className="max-h-48 w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-102"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-left flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Camera className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span className="text-[10px] text-white font-mono truncate">{att.name}</span>
                            </div>
                            {att.size && (
                              <span className="text-[9px] text-slate-300 font-mono ml-1 flex-shrink-0">{att.size}</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>{att.name}</span>
                        {att.size && <span className="text-[10px] text-slate-500 font-mono">({att.size})</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 flex-shrink-0 mt-0.5 border border-white/10 font-bold text-xs">
                MA
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Thinking Indicator */}
      {isLoading && (
        <div ref={!lastAssistantMsg ? answerRef : null} className="flex items-center gap-3">
          <LogitixLogo size={34} darkMode={darkMode} className="animate-pulse" />
          <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-slate-300 flex items-center gap-2 font-mono backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>Logitix is reasoning & generating response...</span>
          </div>
        </div>
      )}

      {/* Photo Preview Lightbox Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-950 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
              <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Photo View
              </span>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black">
              <img
                src={previewPhotoUrl}
                alt="Enlarged photo"
                referrerPolicy="no-referrer"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Visual Component for Direct In-Chat Image Rendering
function ChatRenderedImage({
  src,
  alt,
  onPreview,
  darkMode = false,
}: {
  src: string;
  alt?: string;
  onPreview?: (url: string) => void;
  darkMode?: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      const link = document.createElement('a');
      link.href = src;
      const cleanName = (alt || 'generated-image')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40);
      link.download = `${cleanName || 'generated-image'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloading(false), 1500);
    } catch {
      setDownloading(false);
    }
  };

  return (
    <div className={`my-3.5 rounded-2xl overflow-hidden border transition-all max-w-xl shadow-lg ${
      darkMode ? 'border-white/15 bg-black/40 shadow-black/50' : 'border-slate-200 bg-slate-50 shadow-slate-200/50'
    }`}>
      {/* Clickable Image Canvas */}
      <div
        className="relative group cursor-pointer overflow-hidden bg-black/10 flex items-center justify-center min-h-[160px] max-h-[460px]"
        onClick={() => onPreview?.(src)}
        title="Click to expand view"
      >
        <img
          src={src}
          alt={alt || 'Generated Artwork'}
          referrerPolicy="no-referrer"
          className="w-full h-auto max-h-[460px] object-contain transition-transform duration-300 group-hover:scale-[1.015]"
          loading="lazy"
        />

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-3.5 pointer-events-none">
          <span className="text-xs text-white font-medium truncate max-w-[70%]">
            {alt || 'Generated Visual Asset'}
          </span>
          <span className="text-[11px] text-sky-200 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 font-mono">
            Click to expand
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 border-t text-xs ${
        darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <Camera className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span className="truncate text-[11px] font-mono font-medium text-slate-300">
            {alt || 'Visual Output'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              darkMode
                ? 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
            title="Download Image"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{downloading ? 'Saved' : 'Download'}</span>
          </button>
          <button
            onClick={() => onPreview?.(src)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              darkMode
                ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border-sky-500/30'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
            }`}
            title="Open enlarged view"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Expand</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Clean inline link & formatting renderer
function renderInlineFormatting(text: string) {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  if (!linkRegex.test(text)) {
    return text;
  }

  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g);
  return (
    <>
      {parts.map((part, idx) => {
        const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        if (match) {
          return (
            <a
              key={idx}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2 break-all"
            >
              {match[1]}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}

// Helper to render text and convert markdown or raw image strings into actual visual cards
function renderTextWithImages(
  text: string,
  onPreview?: (url: string) => void,
  darkMode = false,
  keyPrefix = 'txt'
) {
  if (!text) return null;

  // Markdown image pattern: ![alt](url)
  const mdImageRegex = /(!\[[^\]]*\]\([^)]+\))/g;
  // Raw base64 data image URL: data:image/...
  const rawDataUrlRegex = /(data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]{60,})/g;

  if (mdImageRegex.test(text)) {
    const parts = text.split(mdImageRegex);
    return (
      <div className="space-y-1">
        {parts.map((part, idx) => {
          const match = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
          if (match) {
            const alt = match[1] || 'Generated Image';
            const src = match[2].trim();
            return (
              <ChatRenderedImage
                key={`${keyPrefix}-img-${idx}`}
                src={src}
                alt={alt}
                onPreview={onPreview}
                darkMode={darkMode}
              />
            );
          }
          if (!part.trim()) return null;
          return (
            <div key={`${keyPrefix}-p-${idx}`} className="whitespace-pre-wrap">
              {renderInlineFormatting(part)}
            </div>
          );
        })}
      </div>
    );
  }

  if (rawDataUrlRegex.test(text)) {
    const parts = text.split(rawDataUrlRegex);
    return (
      <div className="space-y-1">
        {parts.map((part, idx) => {
          if (part.startsWith('data:image/')) {
            return (
              <ChatRenderedImage
                key={`${keyPrefix}-rawimg-${idx}`}
                src={part}
                alt="Generated Image"
                onPreview={onPreview}
                darkMode={darkMode}
              />
            );
          }
          if (!part.trim()) return null;
          return (
            <div key={`${keyPrefix}-p-${idx}`} className="whitespace-pre-wrap">
              {renderInlineFormatting(part)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap">
      {renderInlineFormatting(text)}
    </div>
  );
}

// Helper component for worker-assisted markdown rendering
function RenderFormattedContent({
  content,
  msgId,
  parsedBlocks,
  onCopy,
  copiedId,
  darkMode = false,
  onPreview,
}: {
  content: string;
  msgId: string;
  parsedBlocks?: ParsedBlock[];
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  darkMode?: boolean;
  onPreview?: (url: string) => void;
}) {
  // If worker parsed blocks are available, render them cleanly off the main thread
  if (parsedBlocks && parsedBlocks.length > 0) {
    return (
      <div className="space-y-3 select-text cursor-text">
        {parsedBlocks.map((block) => {
          if (block.type === 'image') {
            return (
              <ChatRenderedImage
                key={block.id}
                src={block.imageUrl || block.content}
                alt={block.altText || 'Generated Image'}
                onPreview={onPreview}
                darkMode={darkMode}
              />
            );
          }

          if (block.type === 'code') {
            const blockId = `${msgId}-${block.id}`;
            return (
              <div key={block.id} className={`my-3 rounded-xl border overflow-hidden backdrop-blur-xl ${
                darkMode ? 'border-white/10 bg-black/40' : 'border-slate-300 bg-slate-900 shadow-sm'
              }`}>
                <div className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-mono ${
                  darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}>
                  <span className="text-blue-400 font-semibold">{block.language || 'code'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCopy(block.content, blockId)}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === blockId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        exportCodeSnippetAsPDF({
                          code: block.content,
                          title: `${(block.language || 'code').toUpperCase()} Snippet`,
                          language: block.language || 'code',
                          sourceContext: 'Logitix Chat Workspace',
                        });
                      }}
                      className="flex items-center gap-1 hover:text-cyan-300 text-slate-300 transition-colors cursor-pointer ml-1"
                      title="Export code snippet to formatted PDF file"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed custom-scrollbar">
                  <code>{block.content}</code>
                </pre>
              </div>
            );
          }

          if (block.type === 'heading') {
            return (
              <div key={block.id} className={`font-bold font-sans text-base md:text-lg border-b pb-1 mt-3 mb-1 ${
                darkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'
              }`}>
                {block.content}
              </div>
            );
          }

          if (block.type === 'quote') {
            return (
              <div key={block.id} className={`border-l-2 border-purple-500 pl-3 italic my-2 py-1 rounded-r-lg ${
                darkMode ? 'text-slate-300 bg-purple-500/5' : 'text-slate-700 bg-purple-50'
              }`}>
                {block.content}
              </div>
            );
          }

          if (block.type === 'list' && block.items) {
            return (
              <ul key={block.id} className={`list-disc list-inside space-y-1 pl-2 ${
                darkMode ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {block.items.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <div key={block.id}>
              {renderTextWithImages(block.content, onPreview, darkMode, block.id)}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to synchronous splitting if worker processing is pending or fallback
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 select-text cursor-text">
      {parts.map((part, idx) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
          const lang = match?.[1] || 'python';
          const codeText = match?.[2] || part.slice(3, -3);
          const blockId = `${msgId}-${idx}`;

          return (
            <div key={idx} className={`my-3 rounded-xl border overflow-hidden backdrop-blur-xl ${
              darkMode ? 'border-white/10 bg-black/40' : 'border-slate-300 bg-slate-900 shadow-sm'
            }`}>
              <div className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-mono ${
                darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                <span className="text-blue-400 font-semibold">{lang}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCopy(codeText, blockId)}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedId === blockId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      exportCodeSnippetAsPDF({
                        code: codeText,
                        title: `${lang.toUpperCase()} Snippet`,
                        language: lang,
                        sourceContext: 'Logitix Chat Workspace',
                      });
                    }}
                    className="flex items-center gap-1 hover:text-cyan-300 text-slate-300 transition-colors cursor-pointer ml-1"
                    title="Export code snippet to formatted PDF file"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
              <pre className="p-3 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed custom-scrollbar">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }

        return (
          <div key={idx}>
            {renderTextWithImages(part, onPreview, darkMode, `${msgId}-${idx}`)}
          </div>
        );
      })}
    </div>
  );
}

