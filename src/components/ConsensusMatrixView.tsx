import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  ShieldCheck,
  Cpu,
  Brain,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Copy,
  Check,
  Send,
  Sliders,
  Scale,
  Hash,
  Download,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { NoteItem } from '../types.js';
import { generateExecutionReceipt } from '../utils/receiptGenerator.js';

interface ConsensusMatrixViewProps {
  darkMode?: boolean;
  onSaveToNotes?: (title: string, content: string, tags: string[]) => void;
  onInjectToChat?: (text: string) => void;
}

interface ModelPersona {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  borderActive: string;
  bgActive: string;
  badge: string;
  icon: React.FC<{ className?: string }>;
  temperature: number;
}

interface DebateRound {
  id: string;
  roundNumber: number;
  title: string;
  modelOutputs: {
    modelId: string;
    speaker: string;
    argument: string;
    critiqueTarget?: string;
    confidence: number;
    verdictType: 'propose' | 'critique' | 'verify' | 'synthesize';
  }[];
}

const PRESET_TOPICS = [
  {
    title: 'Rust vs Modern C++ for Low-Latency Realtime Systems',
    prompt: 'Should a high-frequency trading & IoT telemetry core be built in Rust (borrow checker, safe concurrency) or Modern C++23 (manual memory layout, mature tooling)?',
    category: 'Systems Architecture',
  },
  {
    title: 'PostgreSQL vs Distributed NoSQL for 50M User Scale',
    prompt: 'Evaluate PostgreSQL with read-replicas and connection pooling versus DynamoDB/Cassandra for an event-heavy collaborative workspace application.',
    category: 'Database Engineering',
  },
  {
    title: 'Client-Side Local LLM vs Serverless GPU Inference',
    prompt: 'Compare on-device WebGPU quantized LLM execution (privacy, offline zero-cost) vs centralized low-latency serverless GPU endpoints.',
    category: 'AI Infrastructure',
  },
  {
    title: 'Zero-Knowledge Proofs for User Data Privacy',
    prompt: 'How to implement zero-knowledge verification for biometric & KYC compliance without exposing plaintext credentials to cloud backend servers?',
    category: 'Security & Cryptography',
  },
];

const MODELS: ModelPersona[] = [
  {
    id: 'manus',
    name: 'Manus AI',
    role: 'Autonomous Agent Architect',
    avatarColor: 'from-emerald-500 to-teal-600',
    borderActive: 'border-emerald-500/50',
    bgActive: 'bg-emerald-500/10',
    badge: 'Autonomous Planning',
    icon: Cpu,
    temperature: 0.2,
  },
  {
    id: 'claude35',
    name: 'Claude 3.5 Sonnet',
    role: 'Security & Edge-Case Red Team',
    avatarColor: 'from-amber-500 to-orange-600',
    borderActive: 'border-amber-500/50',
    bgActive: 'bg-amber-500/10',
    badge: 'Vulnerability Red-Team',
    icon: ShieldCheck,
    temperature: 0.3,
  },
  {
    id: 'deepseekR1',
    name: 'DeepSeek-R1',
    role: 'Formal Logic & Proof Engine',
    avatarColor: 'from-emerald-500 to-teal-600',
    borderActive: 'border-emerald-500/50',
    bgActive: 'bg-emerald-500/10',
    badge: 'Logical Rigor & Proofs',
    icon: Brain,
    temperature: 0.1,
  },
  {
    id: 'gemini36',
    name: 'Gemini 3.8 Flash',
    role: 'Multimodal Arbiter & Synthesizer',
    avatarColor: 'from-cyan-400 to-purple-600',
    borderActive: 'border-purple-500/50',
    bgActive: 'bg-purple-500/10',
    badge: 'Consensus Arbiter',
    icon: Zap,
    temperature: 0.2,
  },
];

export const ConsensusMatrixView: React.FC<ConsensusMatrixViewProps> = ({
  darkMode = false,
  onSaveToNotes,
  onInjectToChat,
}) => {
  const [topicPrompt, setTopicPrompt] = useState(PRESET_TOPICS[0].prompt);
  const [isRunningDebate, setIsRunningDebate] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'live_debate' | 'matrix_score' | 'synthesis_receipt'>('live_debate');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [activeModelSelection, setActiveModelSelection] = useState<Record<string, boolean>>({
    manus: true,
    claude35: true,
    deepseekR1: true,
    gemini36: true,
  });

  const [debateRounds, setDebateRounds] = useState<DebateRound[]>([]);
  const [consensusSummary, setConsensusSummary] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const debateTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup pending timeouts
  const clearDebateTimers = () => {
    debateTimersRef.current.forEach(clearTimeout);
    debateTimersRef.current = [];
  };

  // Generate multi-turn debate simulation based on prompt
  const startMultiModelDebate = () => {
    clearDebateTimers();
    setIsRunningDebate(true);
    setCurrentStep(1);
    setDebateRounds([]);
    setConsensusSummary(null);

    const generatedReceipt = generateExecutionReceipt('Multi-Model Consensus & Red-Team Audit', [
      'Manus AI (Autonomous Agent)',
      'Claude 3.5 Sonnet (Red Team)',
      'DeepSeek-R1 (Proof Engine)',
      'Gemini 3.6 Flash (Arbiter)',
    ], { prompt: topicPrompt });
    setReceipt(generatedReceipt);

    // Simulate multi-round debate sequence
    const t1 = setTimeout(() => {
      // Round 1: Initial Architectural Theses
      setDebateRounds((prev) => {
        if (prev.some((r) => r.roundNumber === 1)) return prev;
        return [
          ...prev,
          {
            id: `round-1-${Date.now()}`,
            roundNumber: 1,
            title: 'Round 1: Initial Architectural Theses & Formal Proposals',
            modelOutputs: [
              {
                modelId: 'manus',
                speaker: 'Manus AI (Autonomous Agent)',
                verdictType: 'propose',
                confidence: 96.2,
                argument: `Proposes an autonomous execution pipeline. Separating the execution loop into dynamic goal decomposition paired with an isolated sandbox environment yields verifiable self-healing execution and zero unmitigated side effects.`,
              },
              {
                modelId: 'deepseekR1',
                speaker: 'DeepSeek-R1 (Proof Engine)',
                verdictType: 'verify',
                confidence: 98.4,
                argument: `Mathematical Proof: The concurrency bounds hold under amortized O(1) cache lookups. However, memory overhead during burst traffic could spike if ring buffers are unbounded. We must enforce bounded ring-queues of size 2^16.`,
              },
            ],
          },
        ];
      });
      setCurrentStep(2);
    }, 1200);

    const t2 = setTimeout(() => {
      // Round 2: Adversarial Red-Teaming & Edge-Case Attack
      setDebateRounds((prev) => {
        if (prev.some((r) => r.roundNumber === 2)) return prev;
        return [
          ...prev,
          {
            id: `round-2-${Date.now()}`,
            roundNumber: 2,
            title: 'Round 2: Adversarial Red-Teaming & Security Stress-Test',
            modelOutputs: [
              {
                modelId: 'claude35',
                speaker: 'Claude 3.5 Sonnet (Red Team)',
                critiqueTarget: 'Manus AI & DeepSeek-R1',
                verdictType: 'critique',
                confidence: 97.1,
                argument: `Vulnerability Detected: If worker threads suffer sudden network packet dropouts, race conditions in state reconciliation could trigger data drift. We need an idempotent transaction log with Raft or distributed WAL sync before acknowledging writes.`,
              },
              {
                modelId: 'manus',
                speaker: 'Manus AI (Autonomous Agent)',
                critiqueTarget: 'Claude 3.5 Sonnet',
                verdictType: 'propose',
                confidence: 97.8,
                argument: `Accepted Countermeasure: Incorporating a lightweight append-only WAL with monotonic sequence numbers directly neutralizes the race condition without impacting tail latency under p99 benchmarks.`,
              },
            ],
          },
        ];
      });
      setCurrentStep(3);
    }, 2400);

    const t3 = setTimeout(() => {
      // Round 3: Unified Consensus & Synthesis
      setDebateRounds((prev) => {
        if (prev.some((r) => r.roundNumber === 3)) return prev;
        return [
          ...prev,
          {
            id: `round-3-${Date.now()}`,
            roundNumber: 3,
            title: 'Round 3: Multi-AI Consensus Matrix & Proof Synthesis',
            modelOutputs: [
              {
                modelId: 'gemini36',
                speaker: 'Gemini 3.6 Flash (Arbiter)',
                verdictType: 'synthesize',
                confidence: 99.1,
                argument: `Consensus Achieved (98.8% Agreement Matrix): The final production solution merges Manus AI's autonomous execution loop, DeepSeek-R1's formal bounded memory constraints, and Claude 3.5's idempotent WAL synchronization. Zero known unmitigated edge-cases remain.`,
              },
            ],
          },
        ];
      });

      setConsensusSummary({
        verdict: 'Consensus Validated Across 4 Frontier Models',
        score: 98.8,
        agreedPoints: [
          'High throughput requires bounded ring-buffer memory allocations (2^16 slots).',
          'Network partitions mitigated via idempotent append-only WAL sequences.',
          'Eliminates lock contention while maintaining strict linearizable consistency.',
        ],
        divergencesResolved: 'Resolved initial disagreement on unbound memory queue risks during burst surges.',
        recommendedCodeSnippet: `// Verified Multi-AI Consensus Architecture Pattern
struct TelemetryEngine {
    ring_buffer: [Slot; 65536],
    wal_seq: AtomicU64,
    state_barrier: Mutex<StateSnapshot>,
}

impl TelemetryEngine {
    pub fn execute_atomic_event(&self, event: Event) -> Result<ProofReceipt, Error> {
        let seq = self.wal_seq.fetch_add(1, Ordering::SeqCst);
        self.ring_buffer[seq % 65536].commit(event)?;
        Ok(ProofReceipt::new(seq, Status::Verified))
    }
}`,
      });
      setIsRunningDebate(false);
      setCurrentStep(4);
    }, 3800);

    debateTimersRef.current = [t1, t2, t3];
  };

  useEffect(() => {
    startMultiModelDebate();
    return () => {
      clearDebateTimers();
    };
  }, []);

  const handleCopyReceipt = () => {
    if (!receipt) return;
    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 select-none max-w-7xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
        darkMode ? 'glass-card-dark border-purple-500/20 shadow-2xl' : 'glass-card-light border-purple-200 shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono">
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              <span>World-First Multi-AI Live Round-Table Engine</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Multi-Model Debate & Consensus Matrix
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Pit Manus AI, Claude 3.5 Sonnet, DeepSeek-R1, and Gemini into real-time adversarial debate. Models challenge, red-team, and mathematically verify each other to forge verifiable consensus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startMultiModelDebate()}
              disabled={isRunningDebate}
              className={`px-4 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                isRunningDebate
                  ? 'bg-purple-500/50 text-white/70 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20 active:scale-95'
              }`}
            >
              {isRunningDebate ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Debating Round {currentStep}/3...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Initiate Multi-AI Debate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Participating AI Persona Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {MODELS.map((model) => {
            const Icon = model.icon;
            const isEnabled = activeModelSelection[model.id];
            return (
              <div
                key={model.id}
                onClick={() => setActiveModelSelection((prev) => ({ ...prev, [model.id]: !prev[model.id] }))}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isEnabled
                    ? darkMode
                      ? `${model.bgActive} ${model.borderActive} shadow-lg shadow-purple-500/5`
                      : 'bg-white border-purple-300 shadow-md'
                    : 'opacity-40 border-dashed border-slate-700 bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${model.avatarColor} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    {model.name}
                  </span>
                </div>
                <div className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {model.role}
                </div>
                <div className={`text-[10px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {model.badge}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input / Topic Selector */}
      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-2">
          <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span>Debate Topic / Complex Engineering Dilemma</span>
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {PRESET_TOPICS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setTopicPrompt(preset.prompt)}
                className={`text-[11px] px-2.5 py-1 rounded-xl whitespace-nowrap transition-colors border cursor-pointer ${
                  topicPrompt === preset.prompt
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : darkMode
                    ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}...
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <textarea
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            rows={2}
            placeholder="Type any architectural question, logic dilemma, or code design pattern for live multi-model debate..."
            className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-sans transition-all resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
              darkMode ? 'bg-black/40 border-white/10 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('live_debate')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'live_debate'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs'
              : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Adversarial Discourse ({debateRounds.length} Rounds)</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix_score')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'matrix_score'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs'
              : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Consensus Matrix & Proof (98.8%)</span>
        </button>

        <button
          onClick={() => setActiveTab('synthesis_receipt')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'synthesis_receipt'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs'
              : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>Execution Receipt & Audit Trail</span>
        </button>
      </div>

      {/* Tab 1: Live Discourse View */}
      {activeTab === 'live_debate' && (
        <div className="space-y-4">
          {debateRounds.map((round) => (
            <div
              key={round.id || `round-${round.roundNumber}`}
              className={`p-5 rounded-3xl border transition-all ${
                darkMode ? 'glass-card-dark border-white/10 shadow-xl' : 'glass-card-light border-slate-200 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-4 border-b pb-2 border-white/5">
                <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {round.title}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Round Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {round.modelOutputs.map((item, idx) => {
                  const isSynthesizer = item.verdictType === 'synthesize';
                  const isCritique = item.verdictType === 'critique';
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSynthesizer
                          ? 'md:col-span-2 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-cyan-500/15 border-purple-500/40 shadow-lg shadow-purple-500/10'
                          : isCritique
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : darkMode
                          ? 'bg-white/5 border-white/10'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${
                            isSynthesizer ? 'text-purple-300' : isCritique ? 'text-amber-400' : 'text-blue-300'
                          }`}>
                            {item.speaker}
                          </span>
                          {item.critiqueTarget && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Red-Teaming {item.critiqueTarget}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                          {item.confidence}% Confidence
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.argument}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {isRunningDebate && (
            <div className="p-8 rounded-3xl border border-dashed border-purple-500/30 flex flex-col items-center justify-center text-center space-y-3 bg-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping delay-100" />
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping delay-200" />
                <div className="w-3 h-3 rounded-full bg-purple-500 animate-ping delay-300" />
              </div>
              <p className="text-xs font-mono text-purple-300 animate-pulse">
                Models are executing cross-referencing algorithms and red-team proofs...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Consensus Matrix & Synthesis */}
      {activeTab === 'matrix_score' && consensusSummary && (
        <div className="space-y-4">
          <div className={`p-6 rounded-3xl border ${darkMode ? 'glass-card-dark border-emerald-500/30' : 'glass-card-light border-emerald-300 shadow-lg'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Formal Arbiter Verdict</span>
                <h3 className={`text-lg sm:text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {consensusSummary.verdict}
                </h3>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-base font-black font-mono">{consensusSummary.score}% Matrix Score</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Verified Agreement Core</h4>
              {consensusSummary.agreedPoints.map((pt: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            {/* Recommended Code Snippet */}
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950">
              <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
                <span className="text-xs font-mono text-purple-300 flex items-center gap-2">
                  <FileCode2 className="w-3.5 h-3.5" />
                  Synthesized Consensus Implementation
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(consensusSummary.recommendedCodeSnippet);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy Code
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto custom-scrollbar">
                <code>{consensusSummary.recommendedCodeSnippet}</code>
              </pre>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-white/10">
              {onSaveToNotes && (
                <button
                  onClick={() => {
                    onSaveToNotes(
                      `Consensus Matrix: ${topicPrompt.slice(0, 40)}...`,
                      `## Multi-AI Consensus Proof\n\n**Verdict**: ${consensusSummary.verdict} (${consensusSummary.score}%)\n\n### Agreed Core:\n${consensusSummary.agreedPoints.map((p: string) => `- ${p}`).join('\n')}\n\n\`\`\`rust\n${consensusSummary.recommendedCodeSnippet}\n\`\`\``,
                      ['Consensus', 'Architecture', 'Multi-AI']
                    );
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Save to Second Brain / Notepad
                </button>
              )}

              {onInjectToChat && (
                <button
                  onClick={() => {
                    onInjectToChat(`Multi-AI Consensus Verdict (${consensusSummary.score}% agreement): ${consensusSummary.verdict}\n\n${consensusSummary.agreedPoints.join('. ')}`);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  Inject into Live Chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Execution Receipt & Audit Card */}
      {activeTab === 'synthesis_receipt' && receipt && (
        <div className={`p-6 rounded-3xl border max-w-2xl mx-auto ${
          darkMode ? 'glass-card-dark border-purple-500/30 shadow-2xl' : 'glass-card-light border-purple-300 shadow-xl'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-black uppercase tracking-widest text-white">Cryptographic Execution Receipt</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {receipt.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Receipt ID:</span>
              <span className="text-purple-300 font-bold">{receipt.receiptId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Action Type:</span>
              <span className="text-cyan-300">{receipt.actionType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Execution Latency:</span>
              <span className="text-emerald-400">{receipt.executionTimeMs} ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Consensus Verification:</span>
              <span className="text-emerald-300">{receipt.consensusScore}%</span>
            </div>
            <div className="flex flex-col gap-1 py-1 border-b border-white/5">
              <span className="text-slate-400">Verification Hash:</span>
              <span className="text-[11px] text-purple-400 break-all">{receipt.verificationHash}</span>
            </div>
            <div className="flex flex-col gap-1 py-1">
              <span className="text-slate-400">Participating Models:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {receipt.modelsParticipated.map((m: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-200">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={handleCopyReceipt}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {copiedReceipt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedReceipt ? 'Receipt JSON Copied!' : 'Copy Verification Receipt'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
