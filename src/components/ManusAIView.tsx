import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  Terminal,
  Globe,
  Code2,
  FileText,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Zap,
  Layers,
  ShieldCheck,
  Cpu,
  Compass,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { ManusExecutionResult, ManusActionStep, ManusArtifact } from '../core/manus_engine.js';

interface ManusAIViewProps {
  darkMode?: boolean;
  onSaveToNotes?: (title: string, content: string, tags: string[]) => void;
  onInjectToChat?: (text: string) => void;
  onRecordActivity?: (operation: any) => void;
}

const PRESET_MANUS_MISSIONS = [
  {
    title: '360° AI Agent Architectures 2026',
    goal: 'Conduct a comprehensive 360° competitive analysis and architectural breakdown of autonomous AI agents in 2026 (Manus AI, Google AI Studio, AutoGPT, Claude Computer Use). Compare planning loops, browser sandboxes, and verification layers.',
    mode: 'autonomous_full' as const,
  },
  {
    title: 'Cloud Native Microservices Blueprint',
    goal: 'Design a production-ready, fault-tolerant cloud-native microservices architecture on Kubernetes with Kafka message bus, Redis cache clustering, PostgreSQL replication, and Terraform IaC scripts.',
    mode: 'code_architecture' as const,
  },
  {
    title: 'Global Tech Expedition Itinerary & Budget',
    goal: 'Plan a detailed 14-day global AI technology exploration itinerary across Silicon Valley, Tokyo, and Zurich. Include budget breakdown, key labs, research institutions, transit options, and day-by-day agendas.',
    mode: 'deep_document' as const,
  },
  {
    title: 'Deep Market Valuation & Unit Economics',
    goal: 'Conduct a deep financial and unit economics analysis of frontier LLM API pricing models vs open-weight self-hosted inference. Calculate GPU amortized cost, break-even thresholds, and 5-year ROI forecasts.',
    mode: 'fast_research' as const,
  },
];

export const ManusAIView: React.FC<ManusAIViewProps> = ({
  darkMode = false,
  onSaveToNotes,
  onInjectToChat,
  onRecordActivity,
}) => {
  const [goalInput, setGoalInput] = useState<string>(
    'Conduct a comprehensive 360° competitive analysis and architectural breakdown of autonomous AI agents in 2026 (Manus AI, Google AI Studio, AutoGPT, Claude Computer Use). Compare planning loops, browser sandboxes, and verification layers.'
  );
  const [selectedMode, setSelectedMode] = useState<
    'autonomous_full' | 'fast_research' | 'code_architecture' | 'deep_document'
  >('autonomous_full');

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(0);
  const [activeDeliverableTab, setActiveDeliverableTab] = useState<'report' | 'artifacts' | 'terminal' | 'citations'>('report');
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState<number>(0);

  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [copiedArtifact, setCopiedArtifact] = useState<boolean>(false);

  const [executionData, setExecutionData] = useState<ManusExecutionResult | null>({
    taskId: 'manus-demo-2026',
    goal: 'Conduct a comprehensive 360° competitive analysis and architectural breakdown of autonomous AI agents in 2026 (Manus AI, Google AI Studio, AutoGPT, Claude Computer Use).',
    mode: 'autonomous_full',
    status: 'completed',
    totalDurationMs: 3420,
    stepsCount: 5,
    confidenceScore: 99.2,
    plan: [
      'Decompose autonomous agent taxonomy into 4 architectural pillars',
      'Crawl and verify live specifications across frontier agent ecosystems',
      'Execute algorithmic simulation comparing latency, token consumption, and success rates',
      'Cross-validate multi-agent consensus and error-recovery mechanisms',
      'Compile final deliverable report, architecture blueprint, and deployment roadmap',
    ],
    actionSteps: [
      {
        stepNumber: 1,
        title: 'Autonomous Goal Decomposition & Dependency Graph',
        category: 'planning',
        action: 'manus_planner.decompose_objective()',
        thoughtTrace: 'Analyzed user objective. Identified key evaluation criteria: Autonomous reasoning loops, browser sandbox execution, code runtime sandboxing, and output verification.',
        outputSummary: 'Constructed 5-stage acyclic execution graph with 12 sub-tasks.',
        status: 'completed',
        executionTimeMs: 410,
        terminalLog: '[Manus Core] Goal graph initialized: 5 phases, 12 sub-nodes.\n[Sandbox] Allocated isolated execution context ID #9382.',
      },
      {
        stepNumber: 2,
        title: 'Live Web Exploration & Multi-Source Grounding',
        category: 'browser',
        action: 'manus_browser.navigate_and_extract()',
        thoughtTrace: 'Navigated official developer documentation, research whitepapers, and real-time indices for Manus AI, Google AI Studio, and frontier agent frameworks.',
        outputSummary: 'Parsed 14 verified documentation nodes and benchmark data.',
        status: 'completed',
        executionTimeMs: 1240,
        terminalLog: '[Browser Engine] GET https://manus.im -> 200 OK\n[Browser Engine] GET https://ai.google.dev -> 200 OK\n[DOM Parser] Extracted 14 verified technical specification cards.',
      },
      {
        stepNumber: 3,
        title: 'Sandbox Code Execution & Computational Modeling',
        category: 'code',
        action: 'manus_sandbox.exec_python_runtime()',
        thoughtTrace: 'Executed Python statistical script in isolated sandbox container to benchmark token efficiency, latency trade-offs, and tool execution reliability.',
        outputSummary: 'Calculated quantitative performance matrices with 0 execution faults.',
        status: 'completed',
        executionTimeMs: 820,
        terminalLog: '$ python3 -m manus.benchmarks --models "manus-v2,gemini-3.7,claude-3.7"\nExecution succeeded. Generated /workspace/data/agent_metrics.json (exit 0).',
      },
      {
        stepNumber: 4,
        title: 'Cross-Model Logic Verification & Safety Audit',
        category: 'verification',
        action: 'manus_verifier.cross_check_consensus()',
        thoughtTrace: 'Audited synthesized conclusions against live citations and empirical benchmarks to eliminate hallucination risk.',
        outputSummary: 'Factual consistency score: 99.2%. Zero safety anomalies detected.',
        status: 'completed',
        executionTimeMs: 460,
        terminalLog: '[Audit Engine] Verified 18 claims against source citations.\n[Safety Check] Strict guardrails validated.',
      },
      {
        stepNumber: 5,
        title: 'Final Deliverables & Production Blueprint Assembly',
        category: 'synthesis',
        action: 'manus_compiler.generate_artifacts()',
        thoughtTrace: 'Compiled full Markdown executive deliverable, system architecture code, and actionable deployment recommendations.',
        outputSummary: 'Generated 2 production artifacts and comprehensive report.',
        status: 'completed',
        executionTimeMs: 490,
        terminalLog: '[Compiler] Wrote 2 artifacts to /workspace/deliverables/:\n- agent_landscape_report.md (14.2 KB)\n- autonomous_agent_orchestrator.ts (6.8 KB)',
      },
    ],
    executiveSummary: 'Manus AI has completed the comprehensive 360° architectural investigation of autonomous AI agent ecosystems in 2026. The analysis reveals that hybrid multi-loop architectures combining planning, real-time search grounding, and isolated sandbox execution achieve a 3.8x higher task completion rate compared to single-turn models.',
    deliverableMarkdown: `### 🤖 Autonomous AI Agent Landscape & Architecture Blueprint (2026)

**Prepared by:** Manus AI Autonomous Agent  
**Status:** Completed & Formally Verified  
**Confidence Index:** 99.2%  

---

### 1. Executive Overview & Core Findings
In 2026, the artificial intelligence paradigm has shifted decisively from passive conversational chat interfaces to **general-purpose autonomous agents**. These systems autonomously plan multi-step missions, operate virtual browsers, execute code inside sandboxed runtimes, self-correct errors, and package structured deliverables.

#### Comparative Matrix of Frontier Agent Frameworks:
| Capability Dimension | Manus AI Autonomous Agent | Google AI Studio & Gemini | Claude Computer Use |
| :--- | :--- | :--- | :--- |
| **Primary Strength** | Asynchronous End-to-End Task Execution | Frontier Multimodal Reasoning & Grounding | OS GUI Level Control & Keystrokes |
| **Planning Paradigm** | Dynamic Directed Acyclic Graph (DAG) | Multi-Turn Reasoning + Thinking Tokens | Visual Screenshot Action Loops |
| **Sandbox Execution** | Isolated Linux Container + Python Runtime | Server-Side Execution Tools | Virtual Desktop Display Server |
| **Search Grounding** | Multi-Source Real-Time Crawler | Google Live Web Index Integration | Web Search Function Call |
| **Deliverables Format** | Full Reports, Code, Datasets, Slides | Text, JSON, TypeScript Code, Images | Raw System Commands & Diffs |

---

### 2. The 5-Pillar Autonomous Agent Engine Architecture
1. **Dynamic Task Decomposer:** Translates open-ended human prompts into structured milestone graphs with prerequisite dependencies.
2. **Contextual Sandbox Browser:** Navigates live web pages, renders DOM trees, handles cookie banners, and extracts structured text.
3. **Computational Execution Engine:** Runs Python/TypeScript scripts to transform raw data, calculate metrics, and test code snippets.
4. **Autonomous Self-Auditor:** Evaluates intermediate tool outputs against target constraints, rolling back or adjusting if outputs diverge.
5. **Artifact Compiler:** Formats final results into downloadable, presentation-ready assets.

---

### 3. Key Recommendations for Production Deployment
- **Isolate Sandbox Runtimes:** Always execute agent-generated scripts in hardened ephemeral containers.
- **Implement Human-in-the-Loop Thresholds:** Require confirmation for high-stakes actions (financial transactions, email dispatch).
- **Persist Step Telemetry:** Log thought traces and terminal outputs for post-execution auditing.`,
    artifacts: [
      {
        id: 'art-1',
        title: 'Autonomous Agent Landscape Report',
        type: 'report',
        filename: 'agent_landscape_report.md',
        content: `# Autonomous AI Agent Landscape 2026\n\nComprehensive analysis of Manus AI, Google AI Studio, and frontier agent systems.\n\nGenerated by Manus AI Autonomous Engine.`,
      },
      {
        id: 'art-2',
        title: 'Autonomous Agent Orchestrator',
        type: 'code',
        filename: 'autonomous_agent_orchestrator.ts',
        language: 'typescript',
        content: `// Manus AI Autonomous Agent Orchestration Pipeline
export interface AgentTask {
  id: string;
  goal: string;
  steps: Array<{ step: number; action: string; status: string }>;
}

export async function executeAutonomousPipeline(goal: string): Promise<AgentTask> {
  console.log('[Manus Agent] Planning goal:', goal);
  // Autonomous loop execution
  return {
    id: 'task-' + Date.now(),
    goal,
    steps: [
      { step: 1, action: 'Decompose Goal', status: 'completed' },
      { step: 2, action: 'Web Crawl & Ground', status: 'completed' },
      { step: 3, action: 'Sandbox Code Run', status: 'completed' },
      { step: 4, action: 'Compile Deliverable', status: 'completed' }
    ]
  };
}`,
      },
    ],
    citations: [
      {
        title: 'Manus AI Official Platform & Documentation',
        url: 'https://manus.im',
        snippet: 'Frontier general-purpose autonomous AI agent capable of multi-step research, browsing, and code execution.',
      },
      {
        title: 'Google AI Studio & Gemini 3 Developer Guide',
        url: 'https://aistudio.google.com',
        snippet: 'Google developer platform for prototyping multimodal Gemini models with real-time search grounding.',
      },
    ],
    keyRecommendations: [
      'Deploy containerized sandboxes for isolated code execution and web browsing.',
      'Integrate Manus autonomous agent workflows into daily research and architectural planning.',
      'Export verified deliverables directly into LOGITIX Notepad and Google Drive.',
    ],
  });

  const handleRunManusMission = async () => {
    if (!goalInput.trim() || isExecuting) return;
    setIsExecuting(true);

    try {
      const res = await fetch('/api/manus/execute-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goalInput.trim(),
          mode: selectedMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data: ManusExecutionResult = await res.json();
      setExecutionData(data);
      setExpandedStepIndex(0);
      setActiveDeliverableTab('report');
      setSelectedArtifactIndex(0);
      if (onRecordActivity) {
        onRecordActivity({
          type: 'manus',
          title: 'Executed Autonomous Mission',
          description: goalInput.trim().slice(0, 70),
          view: 'manus-agent',
          payload: { goal: goalInput.trim() },
          icon: 'smart_toy',
          badge: 'Manus Agent',
          badgeColor: '#ea580c',
        });
      }
    } catch (err: any) {
      console.error('Manus Task Execution Error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'report' | 'artifact') => {
    navigator.clipboard.writeText(text);
    if (type === 'report') {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } else {
      setCopiedArtifact(true);
      setTimeout(() => setCopiedArtifact(false), 2000);
    }
  };

  const downloadDeliverable = () => {
    if (!executionData) return;
    const blob = new Blob([executionData.deliverableMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manus_deliverable_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col overflow-hidden bg-[#0d1117] text-slate-100 select-none">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-400/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Manus AI
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                  Autonomous General-Purpose Agent
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous multi-step mission planning, sandbox browser exploration, code execution, and deliverable synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] font-mono text-orange-300">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-spin" />
            <span>Agent OS Active</span>
          </div>

          <button
            onClick={() => {
              setGoalInput('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={downloadDeliverable}
            disabled={!executionData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Manus Workspace Split Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
        {/* Left Side: Mission Launchpad & Execution Traces */}
        <div className="lg:col-span-5 border-r border-white/10 bg-slate-950/40 backdrop-blur-md p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Mission Input Launcher */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-orange-400" />
                <span>Mission Objective</span>
              </label>
              <span className="text-[10px] font-mono text-orange-400">Autonomous</span>
            </div>

            <textarea
              rows={3}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Describe any complex goal, market research, architecture blueprint, or multi-step investigation..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-orange-500 custom-scrollbar leading-relaxed"
            />

            {/* Mode Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Execution Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'autonomous_full', label: '⚡ Full Pipeline' },
                  { id: 'fast_research', label: '🔍 Fast Research' },
                  { id: 'code_architecture', label: '💻 Code & Architecture' },
                  { id: 'deep_document', label: '📄 Deep Document' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMode(m.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left ${
                      selectedMode === m.id
                        ? 'bg-orange-500/25 border border-orange-400 text-orange-200 font-semibold'
                        : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunManusMission}
              disabled={isExecuting || !goalInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-semibold text-xs shadow-lg shadow-orange-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Manus Agent Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch Autonomous Agent</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Mission Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Preset Mission Blueprints</span>
            </label>
            <div className="space-y-1.5">
              {PRESET_MANUS_MISSIONS.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setGoalInput(m.goal);
                    setSelectedMode(m.mode);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-orange-500/15 border border-white/5 hover:border-orange-500/30 text-xs text-slate-300 transition-all group flex items-center justify-between"
                >
                  <span className="font-medium group-hover:text-orange-200 truncate">{m.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Step-by-Step Thought & Action Traces */}
          {executionData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Agent Execution Traces</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {executionData.totalDurationMs}ms • {executionData.confidenceScore}% Confidence
                </span>
              </div>

              <div className="space-y-2">
                {executionData.actionSteps.map((step, idx) => {
                  const isExpanded = expandedStepIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setExpandedStepIndex(isExpanded ? null : idx)}
                        className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold">
                            {step.stepNumber}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-200">{step.title}</div>
                            <div className="text-[10px] font-mono text-orange-300/80">{step.action}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">{step.executionTimeMs}ms</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-3.5 pt-0 space-y-2.5 text-xs border-t border-white/5 bg-black/20">
                          <div>
                            <span className="text-[10px] uppercase font-mono font-bold text-orange-400 block mb-1">
                              Agent Thought Monologue:
                            </span>
                            <p className="text-[11px] text-slate-300 leading-relaxed italic bg-white/5 p-2 rounded-lg border border-white/5">
                              "{step.thoughtTrace}"
                            </p>
                          </div>

                          {step.terminalLog && (
                            <div>
                              <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 block mb-1">
                                Sandbox Terminal Log:
                              </span>
                              <pre className="p-2 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-cyan-300 overflow-x-auto custom-scrollbar">
                                <code>{step.terminalLog}</code>
                              </pre>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{step.outputSummary}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Deliverables, Artifacts & Executive Report */}
        <div className="lg:col-span-7 flex flex-col justify-between min-h-[500px] lg:min-h-0 overflow-hidden bg-slate-950/20">
          {/* Deliverables Header Tabs */}
          <div className="px-4 sm:px-5 py-3 border-b border-white/10 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
              <button
                onClick={() => setActiveDeliverableTab('report')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeDeliverableTab === 'report'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive Deliverable</span>
              </button>

              <button
                onClick={() => setActiveDeliverableTab('artifacts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeDeliverableTab === 'artifacts'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Artifacts ({executionData?.artifacts?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDeliverableTab('citations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeDeliverableTab === 'citations'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Grounding Sources</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {activeDeliverableTab === 'report' && executionData && (
                <button
                  onClick={() => copyToClipboard(executionData.deliverableMarkdown, 'report')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-colors"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'Copied' : 'Copy'}</span>
                </button>
              )}

              {onSaveToNotes && executionData && (
                <button
                  onClick={() => onSaveToNotes(`Manus Deliverable: ${executionData.goal.substring(0, 30)}...`, executionData.deliverableMarkdown, ['manus', 'deliverable'])}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Save to Notes</span>
                </button>
              )}

              {onInjectToChat && executionData && (
                <button
                  onClick={() => onInjectToChat(`[Manus AI Autonomous Deliverable]:\n\n${executionData.deliverableMarkdown}`)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  <span>Send to Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Deliverable Content View */}
          <div
            id="manus-deliverables-container"
            data-reading-container="true"
            data-reading-title="Manus Autonomous Deliverable"
            data-reading-type="research"
            className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar"
          >
            {activeDeliverableTab === 'report' && executionData && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-orange-200 uppercase tracking-wide">
                      Manus Autonomous Summary
                    </div>
                    <p className="text-xs text-orange-100/90 mt-1 leading-relaxed">
                      {executionData.executiveSummary}
                    </p>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans selection:bg-orange-500/30">
                  {executionData.deliverableMarkdown}
                </div>

                {/* Key Strategic Recommendations */}
                {executionData.keyRecommendations && (
                  <div className="mt-6 p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Actionable Next Steps</span>
                    </div>
                    <ul className="space-y-1.5">
                      {executionData.keyRecommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-orange-400 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeDeliverableTab === 'artifacts' && executionData && (
              <div className="space-y-4">
                {/* Artifact File Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {executionData.artifacts.map((art, idx) => (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArtifactIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                        selectedArtifactIndex === idx
                          ? 'bg-orange-500/20 border border-orange-400 text-orange-200 font-semibold'
                          : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{art.filename}</span>
                    </button>
                  ))}
                </div>

                {/* Active Artifact Preview */}
                {executionData.artifacts[selectedArtifactIndex] && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {executionData.artifacts[selectedArtifactIndex].title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {executionData.artifacts[selectedArtifactIndex].filename}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              executionData.artifacts[selectedArtifactIndex].content,
                              'artifact'
                            )
                          }
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200"
                        >
                          {copiedArtifact ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedArtifact ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar leading-relaxed">
                      <code>{executionData.artifacts[selectedArtifactIndex].content}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeDeliverableTab === 'citations' && executionData && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  Verified External Sources & Web References
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {executionData.citations.map((c, idx) => (
                    <a
                      key={idx}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-xl bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 transition-all block group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-orange-300 group-hover:text-orange-200 truncate">
                          {c.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-orange-300 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{c.snippet}</p>
                      <div className="text-[10px] font-mono text-slate-500 mt-2 truncate">{c.url}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
