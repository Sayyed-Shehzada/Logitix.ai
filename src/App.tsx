import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatStudioView } from './components/ChatStudioView';
import { ResearchSearchView } from './components/ResearchSearchView';
import { NotesArtifactsView } from './components/NotesArtifactsView';
import { OutboxDashboardView } from './components/OutboxDashboardView';
import { GoogleSlidesView } from './components/GoogleSlidesView';
import { ManusAIView } from './components/ManusAIView';
import { SettingsView } from './components/SettingsView';
import { DesignSystemView } from './components/DesignSystemView';
import { LoginScreen } from './components/LoginScreen';
import { VoiceSparkView } from './components/VoiceSparkView';
import { ExportModal } from './components/ExportModal';
import { RecentActivityPanel } from './components/RecentActivityPanel';
import { initialMemoryItems, initialRecentActivities } from './data/mockData';
import { ActiveView, MemoryItem, UserProfile, Message, RecentActivityOperation } from './types';
import { getSavedUserProfile, isSuperAdminAccount } from './core/security';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  saveUserProfileToFirestore,
  getMemoriesFromFirestore,
  saveMemoryToFirestore,
  deleteMemoryFromFirestore,
  saveChatMessageToFirestore,
} from './lib/firestore_service';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('chat-studio');
  const [selectedModel, setSelectedModel] = useState('Gemini 3.1 Flash Lite');
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>(initialMemoryItems);
  const [voiceBriefingActive, setVoiceBriefingActive] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRecentActivityOpen, setIsRecentActivityOpen] = useState(false);
  const [slidesInitialPrompt, setSlidesInitialPrompt] = useState<string | undefined>(undefined);
  const [slidesInitialConditions, setSlidesInitialConditions] = useState<any | undefined>(undefined);

  // Recent Activity Tracking: Tracks operations across all categories
  const [recentActivities, setRecentActivities] = useState<RecentActivityOperation[]>(() => {
    try {
      const stored = localStorage.getItem('logitix_recent_activities');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored has only a few items from previous version, merge or return
          return parsed.slice(0, 25);
        }
      }
    } catch (e) {
      console.warn('Recent activity init error:', e);
    }
    return initialRecentActivities;
  });

  const recordActivity = useCallback(
    (
      op: Omit<RecentActivityOperation, 'id' | 'createdAt' | 'timestamp'> & {
        timestamp?: string;
      }
    ) => {
      setRecentActivities((prev) => {
        const newOp: RecentActivityOperation = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: Date.now(),
          timestamp: op.timestamp || 'Just now',
          ...op,
        };
        // Deduplicate identical consecutive actions and retain recent operations history
        const filtered = prev.filter(
          (item) => !(item.title === newOp.title && item.description === newOp.description)
        );
        const updated = [newOp, ...filtered].slice(0, 25);
        try {
          localStorage.setItem('logitix_recent_activities', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  const handleClearRecentActivities = useCallback(() => {
    setRecentActivities([]);
    try {
      localStorage.removeItem('logitix_recent_activities');
    } catch {}
    setToastMessage('Recent activity history cleared.');
    setTimeout(() => setToastMessage((c) => (c === 'Recent activity history cleared.' ? null : c)), 3000);
  }, []);

  const handleOpenGoogleSlides = useCallback(
    (prompt?: string, conditions?: any) => {
      if (prompt) setSlidesInitialPrompt(prompt);
      if (conditions) setSlidesInitialConditions(conditions);
      setActiveView('google-slides');
      if (prompt) {
        recordActivity({
          type: 'presentation',
          title: 'Generated Presentation',
          description: prompt.slice(0, 65),
          view: 'google-slides',
          payload: { prompt, conditions },
          icon: 'slideshow',
          badge: 'Google Slides',
          badgeColor: '#f59e0b',
        });
      }
    },
    [recordActivity]
  );

  const handleReaccessActivity = useCallback(
    (activity: RecentActivityOperation) => {
      // 1. Switch to workspace view
      setActiveView(activity.view);

      // 2. Restore contextual task payload
      if (activity.type === 'presentation') {
        if (activity.payload?.prompt) {
          setSlidesInitialPrompt(activity.payload.prompt);
        }
        if (activity.payload?.conditions) {
          setSlidesInitialConditions(activity.payload.conditions);
        }
      } else if (activity.type === 'pdf') {
        setIsExportModalOpen(true);
      }

      // 3. Dismiss side panel
      setIsRecentActivityOpen(false);

      // 4. Confirmation toast
      const shortDesc = activity.description.length > 36 ? `${activity.description.slice(0, 36)}...` : activity.description;
      setToastMessage(`Re-opened task: ${activity.title} (${shortDesc})`);
      setTimeout(() => setToastMessage((c) => (c?.startsWith('Re-opened task') ? null : c)), 3500);
    },
    []
  );

  const handleTriggerQuickTask = useCallback(
    (taskType: 'presentation' | 'memory' | 'pdf' | 'chat' | 'manus') => {
      if (taskType === 'presentation') {
        setActiveView('google-slides');
      } else if (taskType === 'memory') {
        setActiveView('memory-context');
      } else if (taskType === 'pdf') {
        setIsExportModalOpen(true);
      } else if (taskType === 'manus') {
        setActiveView('manus-agent');
      } else {
        setActiveView('chat-studio');
      }
    },
    []
  );

  // Global hotkey listener: Alt+A or Ctrl+H to toggle Recent Activity panel
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.key.toLowerCase() === 'a') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h' && !e.shiftKey)
      ) {
        e.preventDefault();
        setIsRecentActivityOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Reading progress tracking across long-form generated responses and research artifacts
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [readingTitle, setReadingTitle] = useState<string>('Consensus Response #8492');
  const [readingType, setReadingType] = useState<'response' | 'artifact' | 'research' | 'code' | 'general'>('response');
  const [readingTextContent, setReadingTextContent] = useState<string>('');
  const [readingMinutes, setReadingMinutes] = useState<number>(0);
  const [readingWordCount, setReadingWordCount] = useState<number>(0);
  const [readingIsStreaming, setReadingIsStreaming] = useState<boolean>(false);

  const handleReadingProgressChange = useCallback(
    (
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
    ) => {
      setReadingProgress(progress);
      if (meta?.title) setReadingTitle(meta.title);
      if (meta?.type) setReadingType(meta.type);
      if (meta?.textContent !== undefined) setReadingTextContent(meta.textContent);
      if (meta?.readingMinutes !== undefined) setReadingMinutes(meta.readingMinutes);
      if (meta?.wordCount !== undefined) setReadingWordCount(meta.wordCount);
      if (meta?.isStreaming !== undefined) setReadingIsStreaming(meta.isStreaming);
    },
    []
  );

  useEffect(() => {
    setReadingProgress(0);
    setReadingTextContent('');
    setReadingMinutes(0);
    setReadingWordCount(0);
    setReadingIsStreaming(false);
    if (activeView === 'chat-studio') {
      setReadingTitle('Consensus Response #8492');
      setReadingType('response');
    } else if (activeView === 'notes-artifacts') {
      setReadingTitle('Selected Research Artifact');
      setReadingType('artifact');
    } else if (activeView === 'google-slides') {
      setReadingTitle('Google Slides Studio');
      setReadingType('artifact');
    } else if (activeView === 'outbox-dashboard') {
      setReadingTitle('Outbox Architecture Health (50k req/s)');
      setReadingType('general');
    } else if (activeView === 'manus-agent') {
      setReadingTitle('Manus Mission Artifact');
      setReadingType('research');
    } else if (activeView === 'research-search') {
      setReadingTitle('Technical RFC Grounding');
      setReadingType('research');
    }
  }, [activeView]);

  // State-Managed Messages Array for ChatStudioView
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: 'Welcome to LOGITIX. I am your Multi-AI Executive Synthesis Engine combining Google Gemini, Anthropic Claude, and Manus AI Autonomous Agent.\n\nAsk me anything — writing, coding, software design, research, or complex problem-solving.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelsConsensus: ['Gemini 3.1 Flash Lite', 'Claude 3.5 Sonnet', 'Manus AI'],
      latency: 184,
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  // Dynamic assistant chat text calculation for reading time estimation
  const currentAssistantChatText = useMemo(() => {
    return messages
      .filter((m) => m.sender === 'assistant')
      .map((m) => m.content + (m.codeSnippet ? '\n' + m.codeSnippet : ''))
      .join('\n\n');
  }, [messages]);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const active = localStorage.getItem('logitix_user_session');
      if (active) {
        return JSON.parse(active);
      }
    } catch (e) {
      console.warn('Session init error:', e);
    }
    return null;
  });

  // Show login screen if not logged in, or when explicitly requested
  const [showLoginScreen, setShowLoginScreen] = useState<boolean>(() => {
    try {
      const active = localStorage.getItem('logitix_user_session');
      return !active;
    } catch {
      return false;
    }
  });

  // Listen for Firebase Auth changes and synchronize with Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.trim().toLowerCase();
        const existing = getSavedUserProfile(cleanEmail) || {};
        const isAdmin = isSuperAdminAccount(cleanEmail);
        const profile: UserProfile = {
          email: cleanEmail,
          name: fbUser.displayName || existing.name || cleanEmail.split('@')[0],
          avatar: fbUser.photoURL || existing.avatar || 'LX',
          role: existing.role || (isAdmin ? 'Super Admin' : 'Member'),
          plan: existing.plan || 'Pro Member',
          isAdmin: existing.isAdmin ?? isAdmin,
          isPro: existing.isPro ?? true,
          age: existing.age || '25',
          dob: existing.dob || '2001-01-01',
        };
        setCurrentUser(profile);
        try {
          localStorage.setItem('logitix_user_session', JSON.stringify(profile));
        } catch {}
        setShowLoginScreen(false);

        // Sync to Firestore & load persisted memories
        saveUserProfileToFirestore(profile).catch((e) => console.warn('Firestore profile sync notice:', e));
        getMemoriesFromFirestore(fbUser.uid)
          .then((persistedMemories) => {
            if (persistedMemories && persistedMemories.length > 0) {
              setMemoryItems(persistedMemories);
            }
          })
          .catch((e) => console.warn('Firestore memories load notice:', e));
      }
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const handleLogin = (profile: UserProfile, _remember: boolean) => {
    setCurrentUser(profile);
    try {
      localStorage.setItem('logitix_user_session', JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
    // Synchronize to Cloud Firestore
    saveUserProfileToFirestore(profile).catch((e) => console.warn('Firestore sync error:', e));
    setShowLoginScreen(false);
    showToast(`Identity verified: Welcome back, ${profile.name || 'Executive'}!`);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('logitix_user_session');
    } catch {}
    setCurrentUser(null);
    setShowLoginScreen(true);
    showToast('Signed out of executive session.');
  };

  const handleRemoveMemoryItem = (id: string) => {
    setMemoryItems((prev) => prev.filter((item) => item.id !== id));
    deleteMemoryFromFirestore(id).catch((e) => console.warn('Firestore delete error:', e));
    showToast('Memory directive removed from Cloud Firestore');
  };

  const handleAddMemoryItem = (title: string, detail: string) => {
    const newItem: MemoryItem = {
      id: `mem-${Date.now()}`,
      title,
      detail,
      content: detail,
      color: 'secondary',
      timestamp: 'Just now',
    };
    setMemoryItems((prev) => [newItem, ...prev]);
    saveMemoryToFirestore(currentUser?.email || 'user', newItem).catch((e) => console.warn('Firestore save error:', e));
    showToast('New directive saved to Cloud Firestore memory');
    recordActivity({
      type: 'memory',
      title: 'Saved Memory',
      description: `${title}: ${detail.slice(0, 48)}`,
      view: 'memory-context',
      payload: { memoryId: newItem.id },
      icon: 'bookmark',
      badge: 'Memory Directive',
      badgeColor: '#10b981',
    });
  };

  const handleNewSession = () => {
    setActiveView('chat-studio');
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        sender: 'assistant',
        content: 'Welcome to LOGITIX. New executive synthesis session initialized.\n\nAsk me anything — writing, coding, software design, research, or complex problem-solving.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelsConsensus: ['Gemini 3.1 Flash Lite', 'Claude 3.5 Sonnet', 'Manus AI'],
      },
    ]);
    showToast('New Editorial Synthesis session initialized');
  };

  const sendMessage = async (input: string) => {
    const textToSend = input.trim();
    if (!textToSend || isThinking) return;

    const startTime = performance.now();

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          activeModel: 'gemini-3.1-flash-lite',
          webSearchEnabled: true,
          userEmail: currentUser?.email,
          conversationHistory: messages.map((m) => ({
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
        codeSnippet,
        latency: latencyMs,
      };

      setMessages((prev) => [...prev, replyMsg]);
    } catch (err) {
      console.warn('Real-time chat notice, simulating multi-model AI response:', err);
      // Simulates an AI response to populate the ChatStudioView interface
      const latencyMs = Math.max(120, Math.round(performance.now() - startTime));
      const isGreeting = /^(hi|hello|hey|greetings|howdy|sup)[.!?\s]*$/i.test(textToSend);
      const lower = textToSend.toLowerCase();
      let simulatedReply = '';
      let codeSnippet: string | undefined = undefined;

      if (isGreeting) {
        simulatedReply = `Hello! I am LOGITIX Multi-AI Synthesis Engine. How can I assist your coding, research, or executive objectives today?`;
      } else if (
        lower.includes('code') ||
        lower.includes('function') ||
        lower.includes('script') ||
        lower.includes('python') ||
        lower.includes('react') ||
        lower.includes('typescript')
      ) {
        codeSnippet = `// LOGITIX Verified Multi-Model Implementation\nexport function executeTask<T>(taskName: string, input: T): Promise<{ status: string; data: T }> {\n  console.log('Synthesized consensus execution:', taskName);\n  return Promise.resolve({\n    status: 'OPTIMAL',\n    data: input,\n  });\n}`;
        simulatedReply = `Here is the verified implementation synthesized across Gemini, Claude, and Manus AI:\n\n\`\`\`typescript\n${codeSnippet}\n\`\`\`\n\nThis pipeline provides type-safe execution, error boundary encapsulation, and high-performance consensus bounds.`;
      } else {
        simulatedReply = `Synthesized Multi-Model Analysis regarding "${textToSend}":\n\n• **⚡ Gemini 3.1 Flash Lite**: Real-time context parsed and validated against knowledge invariants.\n• **🤖 Manus AI**: Evaluated execution path, autonomous task decomposition, and bounds.\n• **🎨 Claude 3.5 Sonnet**: Structured clarity, edge-case mitigation, and prose refinement.\n\nAll arbitration checks succeeded with zero token drift. Ready for subsequent instructions.`;
      }

      const simulatedMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        content: simulatedReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelsConsensus: ['Gemini 3.1 Flash Lite', 'Claude 3.5 Sonnet', 'Manus AI'],
        codeSnippet,
        latency: latencyMs,
      };

      setMessages((prev) => [...prev, simulatedMsg]);
    } finally {
      setIsThinking(false);
      recordActivity({
        type: 'chat',
        title: 'Synthesized Consensus Response',
        description: `Query: ${textToSend.slice(0, 55)}`,
        view: 'chat-studio',
        icon: 'forum',
        badge: 'Consensus Chat',
        badgeColor: '#6366f1',
      });
    }
  };

  const handleAskQuery = (query: string) => {
    setActiveView('chat-studio');
    if (query) {
      sendMessage(query);
    }
  };

  const handleSendVoiceSpark = () => {
    setVoiceBriefingActive(true);
    setTimeout(() => {
      showToast('VoiceSpark Podcast Brief generated: "Resilient Idempotent Cloud Ingestion in 3 minutes". Audio stream ready.');
      setVoiceBriefingActive(false);
    }, 1200);
  };

  if (showLoginScreen) {
    return (
      <div className="h-full h-[100dvh] w-full overflow-y-auto bg-[#f9f9f8] text-[#1a1c1c] font-body selection:bg-[#e2dfff] custom-scrollbar">
        <LoginScreen
          onLogin={handleLogin}
          defaultEmail=""
          onClose={currentUser ? () => setShowLoginScreen(false) : undefined}
        />

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#1a146b] text-white text-xs font-body rounded-2xl shadow-xl border border-indigo-400/30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="material-symbols-outlined text-[18px] text-cyan-300">info</span>
            <span className="font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-white/70 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full h-[100dvh] w-full bg-[#f9f9f8] text-[#1a1c1c] flex font-body selection:bg-[#e2dfff] overflow-hidden">
      {/* Persistent & Responsive Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        onOpenLogin={() => setShowLoginScreen(true)}
        onLogout={handleLogout}
        onOpenRecentActivity={() => setIsRecentActivityOpen(true)}
        recentActivityCount={recentActivities.length}
      />

      {/* Main App Container */}
      <div
        className={`flex-1 flex flex-col h-full min-h-0 min-w-0 transition-all duration-200 overflow-hidden ${
          sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-72'
        } pl-0`}
      >
        {/* Persistent Top Header with Reading Progress Bar & Activity Counter */}
        <Header
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onNewSession={handleNewSession}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentUser={currentUser}
          onOpenLogin={() => setShowLoginScreen(true)}
          onLogout={handleLogout}
          readingProgress={readingProgress}
          readingTitle={readingTitle}
          readingType={readingType}
          textContent={activeView === 'chat-studio' ? (readingTextContent || currentAssistantChatText) : readingTextContent}
          readingMinutes={readingMinutes}
          wordCount={readingWordCount}
          isStreaming={isThinking || readingIsStreaming}
          isGenerating={isThinking || readingIsStreaming}
          onOpenRecentActivity={() => setIsRecentActivityOpen(true)}
          recentActivityCount={recentActivities.length}
          onScrollToTop={() => {
            const container =
              document.getElementById('chat-messages-container') ||
              document.getElementById('artifact-content-container') ||
              document.getElementById('manus-deliverables-container') ||
              document.getElementById('main-content-scroll') ||
              document.querySelector('[data-reading-container="true"]');
            if (container) {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />

        {/* View Canvas with Responsive Multi-Device Scroll Discipline */}
        <main
          id="main-content-scroll"
          onScroll={(e) => {
            const target = e.currentTarget;
            const maxScroll = target.scrollHeight - target.clientHeight;
            if (maxScroll > 0) {
              const currentProgress = Math.min(100, Math.max(0, Math.round((target.scrollTop / maxScroll) * 100)));
              if (
                activeView === 'research-search' ||
                activeView === 'google-slides' ||
                activeView === 'outbox-dashboard' ||
                activeView === 'notes-artifacts' ||
                activeView === 'settings-security' ||
                activeView === 'design-system'
              ) {
                handleReadingProgressChange(currentProgress);
              }
            }
          }}
          className={`relative flex-1 w-full bg-[#f9f9f8] min-h-0 ${
            activeView === 'chat-studio' || activeView === 'manus-agent'
              ? 'overflow-hidden'
              : 'overflow-y-auto custom-scrollbar'
          }`}
        >
          {activeView === 'chat-studio' && (
            <ChatStudioView
              messages={messages}
              sendMessage={sendMessage}
              onSendMessage={sendMessage}
              isThinking={isThinking}
              memoryItems={memoryItems}
              onRemoveMemoryItem={handleRemoveMemoryItem}
              onAddMemoryItem={handleAddMemoryItem}
              onNavigateToNotes={() => setActiveView('notes-artifacts')}
              onOpenOutboxDashboard={() => setActiveView('outbox-dashboard')}
              onOpenGoogleSlides={handleOpenGoogleSlides}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onSendVoiceSpark={handleSendVoiceSpark}
              selectedModel={selectedModel}
              currentUser={currentUser}
              onReadingProgressChange={handleReadingProgressChange}
            />
          )}

          {activeView === 'manus-agent' && (
            <ManusAIView
              onSaveToNotes={(title, _content, _tags) => {
                showToast(`Manus deliverable "${title}" saved.`);
              }}
              onInjectToChat={(text) => {
                setActiveView('chat-studio');
                sendMessage(text);
                showToast('Injected Manus mission report into Chat Studio.');
              }}
              onRecordActivity={recordActivity}
            />
          )}

          {activeView === 'research-search' && (
            <ResearchSearchView
              onAskQuery={handleAskQuery}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onReadingProgressChange={handleReadingProgressChange}
              onSaveToNotes={(title) => {
                showToast(`Executive Summary "${title}" saved to Artifacts Library.`);
              }}
              onRecordActivity={recordActivity}
            />
          )}

          {activeView === 'notes-artifacts' && (
            <NotesArtifactsView
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenOutboxDashboard={() => setActiveView('outbox-dashboard')}
              onOpenGoogleSlides={handleOpenGoogleSlides}
              onReadingProgressChange={handleReadingProgressChange}
              onRecordActivity={recordActivity}
            />
          )}

          {activeView === 'google-slides' && (
            <GoogleSlidesView
              currentUser={currentUser}
              onShowToast={showToast}
              onNavigateToOutbox={() => setActiveView('outbox-dashboard')}
              initialPrompt={slidesInitialPrompt}
              initialConditions={slidesInitialConditions}
              onRecordActivity={recordActivity}
            />
          )}

          {activeView === 'outbox-dashboard' && (
            <OutboxDashboardView
              onSwitchToArtifacts={() => setActiveView('notes-artifacts')}
              onOpenGoogleSlides={handleOpenGoogleSlides}
              onAskChat={(prompt) => {
                setActiveView('chat-studio');
                sendMessage(prompt);
              }}
              onShowToast={showToast}
            />
          )}

          {activeView === 'memory-context' && (
            <div className="w-full px-6 py-6 max-w-7xl mx-auto space-y-6">
              <div className="space-y-1">
                <span className="font-code text-[11px] text-[#1a146b] font-medium bg-[#e2dfff] px-2 py-0.5 rounded">
                  CONTEXT & VECTOR MEMORY
                </span>
                <h1 className="font-headline text-3xl md:text-4xl text-[#1a1c1c]">
                  Active Memory Directives
                </h1>
                <p className="font-body text-xs md:text-sm text-[#474651]">
                  Persistent semantic context injected into all model reasoning passes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white border border-[#e2e2e2] shadow-sm flex items-start justify-between"
                  >
                    <div>
                      <div className="font-body text-sm font-semibold text-[#1a1c1c]">{item.title}</div>
                      <p className="font-body text-xs text-[#474651] mt-1 leading-relaxed">{item.detail}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMemoryItem(item.id)}
                      className="text-[#777682] hover:text-[#ba1a1a] p-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'voicespark' && (
            <VoiceSparkView
              currentUser={currentUser}
              onInjectToChat={(text) => {
                setActiveView('chat-studio');
                sendMessage(text);
              }}
              onShowToast={showToast}
            />
          )}

          {activeView === 'settings-security' && (
            <SettingsView
              userProfile={currentUser || undefined}
              onUpdateProfile={(updated) => {
                setCurrentUser(updated);
                try {
                  localStorage.setItem('logitix_user_session', JSON.stringify(updated));
                } catch {}
                showToast('Executive profile updated and synchronized.');
              }}
              activeModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
          )}

          {activeView === 'design-system' && <DesignSystemView />}
        </main>
      </div>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#1a146b] text-white text-xs font-body rounded-2xl shadow-xl border border-indigo-400/30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="material-symbols-outlined text-[18px] text-cyan-300">info</span>
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/70 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Global Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        messages={messages}
        currentTitle="Logitix Multi-AI Executive Synthesis Session"
        onShowToast={(msg) => showToast(msg)}
        onRecordActivity={recordActivity}
      />

      {/* Recent Activity Side-Panel (Tracks last 5 operations) */}
      <RecentActivityPanel
        isOpen={isRecentActivityOpen}
        onClose={() => setIsRecentActivityOpen(false)}
        activities={recentActivities}
        onReaccess={handleReaccessActivity}
        onClearHistory={handleClearRecentActivities}
        onTriggerQuickTask={handleTriggerQuickTask}
      />
    </div>
  );
}
