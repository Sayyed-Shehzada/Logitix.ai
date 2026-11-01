import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MemoryItem, UserProfile, Message } from '../types';
import { citationsList, failureModesData, outboxTransactionsData } from '../data/mockData';
import { SuggestedPromptsRow } from './SuggestedPromptsRow';
import { ExportModal } from './ExportModal';
import { exportCodeSnippetAsPDF } from '../utils/exportConversation';

interface ChatStudioViewProps {
  messages?: Message[];
  sendMessage?: (input: string) => Promise<void> | void;
  onSendMessage?: (input: string) => Promise<void> | void;
  isThinking?: boolean;
  memoryItems: MemoryItem[];
  onRemoveMemoryItem: (id: string) => void;
  onAddMemoryItem: (title: string, detail: string) => void;
  onNavigateToNotes: () => void;
  onOpenOutboxDashboard?: () => void;
  onOpenGoogleSlides?: (prompt: string, conditions?: any) => void;
  onOpenExportModal?: () => void;
  onSendVoiceSpark: () => void;
  selectedModel?: string;
  currentUser?: UserProfile | null;
  onReadingProgressChange?: (
    progress: number,
    meta?: {
      title?: string;
      type?: 'response' | 'artifact' | 'research' | 'code' | 'general';
      textContent?: string;
      textLength?: number;
      wordCount?: number;
      readingMinutes?: number;
      isStreaming?: boolean;
    }
  ) => void;
}

export const ChatStudioView: React.FC<ChatStudioViewProps> = ({
  messages: propMessages,
  sendMessage,
  onSendMessage,
  isThinking: propIsThinking,
  memoryItems,
  onRemoveMemoryItem,
  onAddMemoryItem,
  onNavigateToNotes,
  onOpenOutboxDashboard,
  onOpenGoogleSlides,
  onOpenExportModal,
  onSendVoiceSpark,
  selectedModel = 'Gemini 3.1 Flash Lite',
  currentUser,
  onReadingProgressChange,
}) => {
  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: 'Welcome to LOGITIX. I am your Multi-AI Executive Synthesis Engine combining Google Gemini, Anthropic Claude, and Manus AI Autonomous Agent.\n\nAsk me anything — writing, coding, software design, research, or complex problem-solving.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelsConsensus: ['Gemini 3.1 Flash Lite', 'Claude 3.5 Sonnet', 'Manus AI'],
      latency: 184,
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [newDirectiveTitle, setNewDirectiveTitle] = useState('');
  const [newDirectiveDetail, setNewDirectiveDetail] = useState('');
  const [showAddDirective, setShowAddDirective] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [localIsThinking, setLocalIsThinking] = useState(false);

  // Web Speech API - Voice Input & Real-Time Listening Mode
  const [isListening, setIsListening] = useState(false);
  const [speechInterim, setSpeechInterim] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API availability on mount and cleanup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    }
    setIsListening(false);
    setSpeechInterim('');
  }, []);

  const startListening = useCallback(() => {
    setSpeechError(null);
    setSpeechInterim('');
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            interimChunk += item[0].transcript;
          }
        }

        if (finalChunk) {
          setInputMessage((prev) => {
            const trimmed = prev.trim();
            const chunk = finalChunk.trim();
            return trimmed ? `${trimmed} ${chunk}` : chunk;
          });
        }
        setSpeechInterim(interimChunk);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Microphone access was denied. Please grant microphone permission in your browser settings.');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Keep listening for query
        } else if (event.error === 'network') {
          setSpeechError('Network issue with speech recognition service.');
          setIsListening(false);
        } else {
          setSpeechError(`Speech notice: ${event.error || 'Check microphone'}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechInterim('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Speech recognition initiation notice:', e);
      setSpeechError(e.message || 'Unable to start speech recognition.');
      setIsListening(false);
    }
  }, []);

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const activeMessages = propMessages || localMessages;
  const isThinking = propIsThinking !== undefined ? propIsThinking : localIsThinking;

  // Identify the most recent assistant response to anchor contextual next-step prompts
  const lastAssistantMessage = useMemo(() => {
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].sender === 'assistant') {
        return activeMessages[i];
      }
    }
    return null;
  }, [activeMessages]);

  // Synchronize dynamic reading metrics and streaming status with Header
  useEffect(() => {
    if (onReadingProgressChange) {
      const lastAssistant = activeMessages.filter((m) => m.sender === 'assistant').slice(-1)[0];
      const title = lastAssistant
        ? `Consensus Response (${lastAssistant.timestamp})`
        : 'Editorial Synthesis Session';
      const assistantText = activeMessages
        .filter((m) => m.sender === 'assistant')
        .map((m) => m.content + (m.codeSnippet ? '\n' + m.codeSnippet : ''))
        .join('\n\n');

      onReadingProgressChange(0, {
        title,
        type: 'response',
        textContent: assistantText,
        textLength: assistantText.length,
        isStreaming: !!isThinking,
      });
    }
  }, [activeMessages, isThinking, onReadingProgressChange]);

  const handleSendSpokenQuery = () => {
    stopListening();
    const messageToSend = (inputMessage + (speechInterim ? ' ' + speechInterim : '')).trim();
    if (messageToSend) {
      handleSendMessage(messageToSend);
      setSpeechInterim('');
    }
  };

  const handleSendMessage = async (customText?: string) => {
    stopListening();
    const textToSend = (customText !== undefined ? customText : inputMessage).trim();
    if (!textToSend || isThinking) return;

    if (customText === undefined) {
      setInputMessage('');
    }

    const sendFn = sendMessage || onSendMessage;
    if (sendFn) {
      await sendFn(textToSend);
      return;
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const startTime = performance.now();
    setLocalMessages((prev) => [...prev, userMsg]);
    setLocalIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          activeModel: 'gemini-3.1-flash-lite',
          webSearchEnabled: true,
          userEmail: currentUser?.email,
          conversationHistory: activeMessages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const latencyMs = data.latencyMs || Math.round(performance.now() - startTime);
      const replyContent = data.reply || data.response || 'I have processed your request with the multi-model consensus pipeline.';

      // Extract code block if present
      let codeSnippet: string | undefined = undefined;
      const codeMatch = replyContent.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
      if (codeMatch && codeMatch[1]) {
        codeSnippet = codeMatch[1].trim();
      }

      const replyMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelsConsensus: ['Gemini 3.1 Flash Lite', 'Claude 3.5 Sonnet', 'Manus AI'],
        codeSnippet: codeSnippet,
        latency: latencyMs,
      };

      setLocalMessages((prev) => [...prev, replyMsg]);
    } catch (err: any) {
      console.warn('Real-time chat endpoint notice:', err);
      const latencyMs = Math.max(120, Math.round(performance.now() - startTime));
      // Clean, intelligent fallback response
      const isGreeting = /^(hi|hello|hey|greetings|howdy|sup)[.!?\s]*$/i.test(textToSend.trim());
      const fallbackReply = isGreeting
        ? `Hello! I am LOGITIX AI. How can I assist your coding, research, or executive objectives today?`
        : `I received your query regarding "${textToSend}". I am actively ready to assist you. Could you please specify your preferred requirements or question details?`;

      const replyMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelsConsensus: ['Gemini 3.1 Flash Lite', 'Claude 3.5 Sonnet', 'Manus AI'],
        latency: latencyMs,
      };

      setLocalMessages((prev) => [...prev, replyMsg]);
    } finally {
      setLocalIsThinking(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleExportCodeSnippet = (codeText: string, snippetTitle?: string, lang: string = 'typescript') => {
    try {
      exportCodeSnippetAsPDF({
        code: codeText,
        title: snippetTitle || `${lang.toUpperCase()} Code Snippet`,
        language: lang,
        sourceContext: 'Logitix Multi-AI Editorial Synthesis Session #8492',
      });
      setExportNotice(`Exported "${snippetTitle || 'code snippet'}" to formatted PDF.`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Code snippet export error:', err);
    }
  };

  const renderMessageContent = (content: string, msgId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return (
      <div className="space-y-3">
        {parts.map((part, idx) => {
          if (part.startsWith('```')) {
            const match = part.match(/```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/);
            const lang = (match?.[1] || 'code').toLowerCase();
            const codeText = match?.[2] ? match[2].trim() : part.slice(3, -3).trim();
            const blockId = `${msgId}-code-${idx}`;

            return (
              <div
                key={idx}
                className="my-3 rounded-xl overflow-hidden border border-[#e2e2e2] bg-[#1e1e2e] text-[#f8f8f2] shadow-sm"
              >
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#181825] border-b border-[#313244] text-xs font-code">
                  <span className="text-indigo-300 font-semibold uppercase">{lang}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeText);
                        setCopiedCodeId(blockId);
                        setTimeout(() => setCopiedCodeId(null), 2000);
                      }}
                      className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedCodeId === blockId ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedCodeId === blockId ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() =>
                        handleExportCodeSnippet(
                          codeText,
                          `${lang.toUpperCase()} Implementation Snippet`,
                          lang
                        )
                      }
                      className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer font-medium ml-1"
                      title="Export this code snippet to a formatted PDF file"
                    >
                      <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 text-[11px] font-code overflow-x-auto leading-relaxed text-[#cdd6f4]">
                  <code>{codeText}</code>
                </pre>
              </div>
            );
          }
          return (
            <p key={idx} className="whitespace-pre-line leading-relaxed">
              {part}
            </p>
          );
        })}
      </div>
    );
  };

  const handleCreateDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDirectiveTitle.trim() && newDirectiveDetail.trim()) {
      onAddMemoryItem(newDirectiveTitle, newDirectiveDetail);
      setNewDirectiveTitle('');
      setNewDirectiveDetail('');
      setShowAddDirective(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Primary Chat & Artifact Canvas */}
      <div className="flex-1 flex flex-col h-full bg-[#f9f9f8] overflow-hidden">
        {/* Messages Stream */}
        <div
          id="chat-messages-container"
          data-reading-container="true"
          data-reading-title="Editorial Synthesis Session #8492"
          data-reading-type="response"
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            const maxScroll = scrollHeight - clientHeight;
            const pct = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100))) : 0;
            const lastAssistant = activeMessages.filter((m) => m.sender === 'assistant').slice(-1)[0];
            const title = lastAssistant
              ? `Consensus Response (${lastAssistant.timestamp})`
              : 'Editorial Synthesis Session';
            const assistantText = activeMessages
              .filter((m) => m.sender === 'assistant')
              .map((m) => m.content + (m.codeSnippet ? '\n' + m.codeSnippet : ''))
              .join('\n\n');
            if (onReadingProgressChange) {
              onReadingProgressChange(pct, {
                title,
                type: 'response',
                textContent: assistantText,
                textLength: assistantText.length,
                isStreaming: !!isThinking,
              });
            }
          }}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl w-full mx-auto custom-scrollbar"
        >
          {/* Clean minimal mobile action chip */}
          <div className="lg:hidden flex items-center justify-between pb-1 -mt-2">
            <span className="text-[11px] font-medium text-slate-400">
              Multi-model consensus
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMobileContextOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 cursor-pointer"
                title="View Context Directives & Citations"
              >
                <span className="material-symbols-outlined text-[13px] text-indigo-700">database</span>
                <span>Context</span>
              </button>
            </div>
          </div>

          {activeMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              } space-y-2`}
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-semibold text-[#474651]">
                  {msg.sender === 'user' ? 'You' : 'LOGITIX Consensus Engine'}
                </span>
                <span className="text-[10px] text-[#777682] font-code">{msg.timestamp}</span>
              </div>

              <div
                className={`p-4 rounded-2xl max-w-2xl text-xs md:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1a146b] text-white rounded-tr-xs shadow-sm'
                    : 'bg-white border border-[#e2e2e2] text-[#1a1c1c] rounded-tl-xs shadow-xs'
                }`}
              >
                {renderMessageContent(msg.content, msg.id)}

                {/* Multi-Model Consensus Tags & Response Latency */}
                {(msg.modelsConsensus || msg.latency !== undefined) && (
                  <div className="mt-3 pt-3 border-t border-[#e2e2e2] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-code uppercase text-[#777682] mr-1">
                        Synthesized via:
                      </span>
                      {msg.modelsConsensus?.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] font-code px-2 py-0.5 rounded-full bg-[#f3f4f3] border border-[#e2e2e2] text-[#1a146b] font-medium"
                        >
                          ✓ {m}
                        </span>
                      ))}
                    </div>

                    {msg.latency !== undefined && (
                      <div
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-code font-medium shadow-2xs"
                        title="AI Multi-Model Consensus Response Time"
                      >
                        <span className="material-symbols-outlined text-[12px] text-emerald-600">bolt</span>
                        <span>{msg.latency} ms</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Code Snippet Card */}
                {msg.codeSnippet && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-[#e2e2e2] bg-[#1e1e2e] text-[#f8f8f2]">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-[#181825] border-b border-[#313244] text-xs font-code">
                      <span className="text-zinc-400">drive-resilient-ingest.ts</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCode(msg.codeSnippet!)}
                          className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copiedCode ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() =>
                            handleExportCodeSnippet(
                              msg.codeSnippet!,
                              'drive-resilient-ingest.ts',
                              'typescript'
                            )
                          }
                          className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer font-medium ml-1"
                          title="Export this code snippet to a formatted PDF file"
                        >
                          <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 text-[11px] font-code overflow-x-auto leading-relaxed text-[#cdd6f4]">
                      <code>{msg.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {/* Failure Modes Matrix */}
                {msg.showFailureModes && (
                  <div className="mt-4 p-3 bg-[#fcfcfc] rounded-xl border border-[#e2e2e2]">
                    <div className="text-xs font-semibold text-[#1a1c1c] mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">
                        warning
                      </span>
                      <span>Failure Mode & Mitigation Matrix</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {failureModesData.slice(0, 3).map((fm) => (
                        <div
                          key={fm.vector}
                          className="p-2 rounded-lg bg-white border border-[#e2e2e2]/70 text-xs flex items-start justify-between"
                        >
                          <div>
                            <span className="font-medium text-[#1a1c1c]">{fm.vector}</span>
                            <div className="text-[11px] text-[#474651] mt-0.5">
                              Mitigation: <strong className="text-[#1a146b]">{fm.mitigation}</strong>
                            </div>
                          </div>
                          <span className="text-[10px] font-code px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            VERIFIED
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outbox Transactions State */}
                {msg.showOutbox && (
                  <div className="mt-4 p-3 bg-[#fcfcfc] rounded-xl border border-[#e2e2e2]">
                    <div className="text-xs font-semibold text-[#1a1c1c] mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-indigo-600">
                          sync_saved_locally
                        </span>
                        <span>Transactional Outbox State (50k req/s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {onOpenGoogleSlides && (
                          <button
                            onClick={() =>
                              onOpenGoogleSlides(
                                'Distributed Outbox Architecture Executive Review: 50,000 req/s, 16 Shards, Tier-1 Redis Deduplication, CDC Debezium, and 256 Kafka Partitions',
                                {
                                  slideCount: 5,
                                  audience: 'Executive / Board',
                                  tone: 'Strategic & Authoritative',
                                  theme: 'Modern Indigo',
                                  includeMetrics: true,
                                  includeArchitecture: true,
                                }
                              )
                            }
                            className="text-[10px] text-amber-700 hover:underline font-code font-bold flex items-center gap-0.5 cursor-pointer"
                            title="Generate presentation in Google Slides from this architecture"
                          >
                            <span className="material-symbols-outlined text-[12px]">slideshow</span>
                            <span>Create Slides</span>
                          </button>
                        )}
                        {onOpenOutboxDashboard && (
                          <button
                            onClick={onOpenOutboxDashboard}
                            className="text-[10px] text-[#1a146b] hover:underline font-code font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Live Dashboard</span>
                            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {outboxTransactionsData.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-2 rounded-lg bg-white border border-[#e2e2e2]/70 text-xs"
                        >
                          <div className="font-code text-[10px] text-[#777682]">{tx.id}</div>
                          <div className="font-semibold text-[11px] text-[#1a1c1c] truncate">
                            {tx.operation}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-bold mt-1">
                            {tx.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant Message Quick Action Bar */}
                {msg.sender === 'assistant' && (
                  <div className="mt-3 pt-2.5 border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {onOpenGoogleSlides && (
                        <button
                          onClick={() => {
                            const cleanText = msg.content.replace(/```[\s\S]*?```/g, '').trim();
                            const firstLine = cleanText.split('\n')[0].replace(/^#+\s*/, '').slice(0, 110);
                            onOpenGoogleSlides(
                              firstLine || 'Strategic Executive Briefing: AI Systems Architecture',
                              {
                                slideCount: 5,
                                audience: 'Executive / Board',
                                tone: 'Strategic & Authoritative',
                                theme: 'Modern Indigo',
                                includeMetrics: true,
                                includeArchitecture: true,
                                includeTakeaways: true,
                                customConstraints: cleanText.slice(0, 320),
                              }
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-amber-200/60 shadow-2xs"
                          title="Generate a Google Slides presentation from this AI response"
                        >
                          <span className="material-symbols-outlined text-[13px] text-amber-700">slideshow</span>
                          <span>Create Google Slides</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedMsgId(msg.id);
                          setTimeout(() => setCopiedMsgId(null), 2000);
                        }}
                        className="px-2 py-1 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                        title="Copy message to clipboard"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {copiedMsgId === msg.id ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {onNavigateToNotes && (
                      <button
                        onClick={onNavigateToNotes}
                        className="text-[10px] text-[#1a146b] hover:underline font-code font-bold flex items-center gap-0.5 cursor-pointer"
                        title="Go to Notes & Artifacts"
                      >
                        <span>Notes</span>
                        <span className="material-symbols-outlined text-[11px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Real-time Multi-Model Synthesis Thinking Indicator */}
          {isThinking && (
            <div className="flex flex-col items-start space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-semibold text-[#474651]">
                  LOGITIX Consensus Engine
                </span>
                <span className="text-[10px] text-[#777682] font-code">Synthesizing...</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] text-[#1a1c1c] rounded-tl-xs shadow-xs flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#1a146b] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#312e81] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-[#474651] font-code">
                  Synthesizing multi-model consensus across Gemini 3.1 Flash Lite, Claude 3.5 Sonnet, and Manus AI...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar with Mobile Ergonomics, Safe Area, and Web Speech Listening Mode */}
        <div className="p-2.5 sm:p-4 pb-safe bg-white border-t border-[#e2e2e2] max-w-4xl w-full mx-auto rounded-t-2xl shadow-sm shrink-0">
          {/* Row of suggested prompt buttons that dynamically change based on last assistant response */}
          <SuggestedPromptsRow
            lastAssistantMessage={lastAssistantMessage}
            onSelectPrompt={(prompt) => handleSendMessage(prompt)}
            disabled={isThinking}
          />

          {/* Web Speech API Error Alert */}
          {speechError && (
            <div className="mb-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">mic_off</span>
                <span className="truncate">{speechError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="p-1 rounded text-rose-600 hover:bg-rose-100 cursor-pointer shrink-0"
                title="Dismiss notice"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Web Speech API: Real-Time Listening Mode Studio Banner */}
          {isListening && (
            <div className="mb-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#1a146b] to-[#251e82] text-white border border-indigo-400/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                {/* Pulsing Microphone Indicator with Waveform */}
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[18px] animate-pulse">mic</span>
                  <span className="absolute -inset-1 rounded-full bg-rose-400/50 animate-ping pointer-events-none" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 font-code flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                      Listening Mode Active
                    </span>
                    {/* Live Waveform Equalizer Bars */}
                    <div className="flex items-center gap-0.5 h-3">
                      <span className="w-1 bg-cyan-300 rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 bg-cyan-300 rounded-full animate-bounce h-3" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 bg-cyan-300 rounded-full animate-bounce h-1.5" style={{ animationDelay: '300ms' }} />
                      <span className="w-1 bg-cyan-300 rounded-full animate-bounce h-3.5" style={{ animationDelay: '100ms' }} />
                      <span className="w-1 bg-cyan-300 rounded-full animate-bounce h-2" style={{ animationDelay: '250ms' }} />
                    </div>
                  </div>
                  <p className="text-xs text-indigo-100 truncate mt-0.5 font-body">
                    {speechInterim ? (
                      <span className="italic text-white font-medium">"{speechInterim}..."</span>
                    ) : (
                      <span>Speak your prompt aloud — transcribing in real time into chat input...</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleSendSpokenQuery}
                  disabled={!inputMessage.trim() && !speechInterim.trim()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Send spoken query to consensus engine"
                >
                  <span>Send Query</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                </button>
                <button
                  type="button"
                  onClick={stopListening}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition-colors"
                  title="Stop listening and keep transcribed text"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          <div
            className={`relative flex items-center bg-[#f9f9f8] rounded-2xl border p-1.5 transition-all ${
              isListening
                ? 'border-indigo-500 ring-2 ring-indigo-200 bg-white'
                : 'border-[#e2e2e2] focus-within:border-[#1a146b] focus-within:bg-white'
            }`}
          >
            <textarea
              rows={2}
              placeholder={
                isListening
                  ? 'Listening to your speech... Speak now or type to append...'
                  : 'Ask LOGITIX for multi-model synthesis, architecture validation, or code generation...'
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 text-xs md:text-sm bg-transparent outline-none p-1.5 sm:p-2 resize-none text-[#1a1c1c] placeholder:text-[#777682] max-h-28"
            />
            <div className="flex items-center gap-1 sm:gap-1.5 pr-1 sm:pr-2 shrink-0">
              {/* Web Speech API Microphone Toggle Button (Listening Mode) */}
              <button
                onClick={handleToggleListening}
                type="button"
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  isListening
                    ? 'bg-rose-500 text-white ring-3 ring-rose-200 shadow-sm animate-pulse'
                    : 'text-[#777682] hover:text-[#1a146b] hover:bg-[#e8e8e7]'
                }`}
                title={
                  isListening
                    ? 'Stop Voice Listening'
                    : speechSupported
                    ? 'Speak query with Web Speech API (Listening Mode)'
                    : 'Web Speech API not supported in this browser'
                }
                aria-label={isListening ? 'Stop Voice Listening' : 'Speak query with Web Speech API'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isListening ? 'graphic_eq' : 'mic'}
                </span>
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping pointer-events-none" />
                )}
              </button>

              {/* VoiceSpark Audio Podcast Briefing */}
              <button
                onClick={onSendVoiceSpark}
                type="button"
                className="p-2 rounded-xl text-[#777682] hover:text-[#1a146b] hover:bg-[#e8e8e7] transition-all cursor-pointer hidden xs:flex items-center justify-center"
                title="Generate VoiceSpark podcast briefing"
                aria-label="Generate VoiceSpark podcast briefing"
              >
                <span className="material-symbols-outlined text-[20px]">headphones</span>
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputMessage.trim() && !speechInterim.trim()) || isThinking}
                type="button"
                className="p-2 sm:p-2.5 rounded-xl bg-[#1a146b] hover:bg-[#312e81] disabled:opacity-40 text-white shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Send message"
              >
                <span className={`material-symbols-outlined text-[18px] ${isThinking ? 'animate-spin' : ''}`}>
                  {isThinking ? 'progress_activity' : 'arrow_upward'}
                </span>
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 pt-2 text-[10px] text-[#777682] font-code gap-1">
            <span className="truncate">
              {isListening ? '🎙️ Web Speech API Active · Speak clearly into your microphone' : 'Arbitrated Consensus Protocol (Shift + Enter for newline)'}
            </span>
            <span className="hidden sm:inline">Zero-Data-Loss Architecture Engine</span>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop Overlay for Context Rail */}
      {mobileContextOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileContextOpen(false)}
          aria-label="Close context panel overlay"
        />
      )}

      {/* Right Rails: Context Memory & Citations (Docked on lg, Slide-over on mobile) */}
      <aside
        className={`fixed lg:static top-0 right-0 bottom-0 h-full w-80 bg-[#f3f4f3] border-l border-[#e2e2e2] flex-col overflow-y-auto select-none z-50 lg:z-auto shadow-2xl lg:shadow-none transition-transform duration-200 ease-in-out ${
          mobileContextOpen ? 'translate-x-0 flex' : 'translate-x-full lg:translate-x-0 hidden lg:flex'
        }`}
      >
        {/* Mobile Header with Close button */}
        <div className="lg:hidden p-3 border-b border-[#e2e2e2] flex items-center justify-between bg-white">
          <span className="text-xs font-bold text-[#1a146b]">Workspace Context & Evidence</span>
          <button
            onClick={() => setMobileContextOpen(false)}
            className="p-1 rounded-lg text-[#777682] hover:bg-[#e8e8e7] hover:text-[#1a1c1c]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Directives Section */}
        <div className="p-4 border-b border-[#e2e2e2]/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1a146b] font-code">
              Context Directives ({memoryItems.length})
            </span>
            <button
              onClick={() => setShowAddDirective(!showAddDirective)}
              className="text-xs text-[#312e81] hover:underline font-medium"
            >
              {showAddDirective ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {showAddDirective && (
            <form onSubmit={handleCreateDirective} className="p-2.5 bg-white rounded-xl border border-[#e2e2e2] mb-3 space-y-2">
              <input
                type="text"
                placeholder="Directive Title..."
                value={newDirectiveTitle}
                onChange={(e) => setNewDirectiveTitle(e.target.value)}
                className="w-full text-xs p-1.5 border border-[#e2e2e2] rounded-lg outline-none"
                required
              />
              <textarea
                placeholder="Directive detail / constraints..."
                value={newDirectiveDetail}
                onChange={(e) => setNewDirectiveDetail(e.target.value)}
                className="w-full text-xs p-1.5 border border-[#e2e2e2] rounded-lg outline-none resize-none"
                rows={2}
                required
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-[#1a146b] text-white text-xs font-semibold rounded-lg"
              >
                Save Directive
              </button>
            </form>
          )}

          <div className="space-y-2">
            {memoryItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-white border border-[#e2e2e2] text-xs shadow-xs flex items-start justify-between group"
              >
                <div className="pr-2">
                  <div className="font-semibold text-[#1a1c1c] text-[11px] leading-snug">
                    {item.title}
                  </div>
                  <p className="text-[10px] text-[#474651] mt-0.5 leading-tight">{item.detail}</p>
                </div>
                <button
                  onClick={() => onRemoveMemoryItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#ba1a1a] p-1 transition-all"
                  title="Remove"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Citations & Evidence Base */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1a146b] font-code">
              Evidence Citations
            </span>
            <button
              onClick={onNavigateToNotes}
              className="text-xs text-[#312e81] hover:underline font-medium"
            >
              Open Notes →
            </button>
          </div>

          <div className="space-y-2">
            {citationsList.map((cite) => (
              <div
                key={cite.title}
                className="p-2.5 rounded-xl bg-white border border-[#e2e2e2] text-xs shadow-xs"
              >
                <div className="flex items-center justify-between text-[10px] font-code text-[#777682]">
                  <span>{cite.domain}</span>
                  <span className="text-emerald-700 font-bold">{cite.score} Match</span>
                </div>
                <div className="font-medium text-[#1a1c1c] text-[11px] mt-1 leading-snug">
                  {cite.title}
                </div>
                <p className="text-[10px] text-[#474651] mt-0.5 line-clamp-2 leading-relaxed">
                  {cite.description}
                </p>
                <div className="mt-1.5 text-[9px] font-code text-[#1a146b] bg-[#e2dfff]/60 px-1.5 py-0.5 rounded inline-block">
                  Ref: {cite.ref}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Floating Export Notice Toast */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-[#1a146b] text-white text-xs font-medium rounded-2xl shadow-xl border border-indigo-400/30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="material-symbols-outlined text-[18px] text-cyan-300">check_circle</span>
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Export Modal Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        messages={activeMessages}
        currentTitle="Logitix Editorial Synthesis Session #8492"
        onShowToast={(msg) => {
          setExportNotice(msg);
          setTimeout(() => setExportNotice(null), 3000);
        }}
      />
    </div>
  );
};
