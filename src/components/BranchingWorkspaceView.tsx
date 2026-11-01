import React, { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Sparkles,
  Plus,
  Play,
  RotateCcw,
  Split,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  BookOpen,
  Copy,
  Layers,
  FileCode2,
  Trash2
} from 'lucide-react';
import { generateExecutionReceipt } from '../utils/receiptGenerator.js';

interface BranchNode {
  id: string;
  parentId?: string;
  branchName: string;
  title: string;
  timestamp: string;
  prompt: string;
  model: string;
  content: string;
  metrics: { latency: string; tokens: number; rating: string };
  tags: string[];
}

interface BranchingWorkspaceViewProps {
  darkMode?: boolean;
  onInjectToChat?: (text: string) => void;
  onSaveToNotes?: (title: string, content: string, tags: string[]) => void;
}

const INITIAL_NODES: BranchNode[] = [
  {
    id: 'node-root',
    branchName: 'main',
    title: 'Root Hypothesis: Scalable In-Memory Cache Engine',
    timestamp: 'Today, 10:14 AM',
    prompt: 'Design a high-throughput key-value store with sub-millisecond p99 latency in TypeScript & Rust.',
    model: 'LOGITIX Multi-AI Consensus',
    content: `# Core Engine Specification
We need an ultra-low latency key-value storage engine supporting atomic CAS, TTL expiration, and write-ahead logging.`,
    metrics: { latency: '180ms', tokens: 420, rating: 'Verified' },
    tags: ['Architecture', 'Root'],
  },
  {
    id: 'node-branch-perf',
    parentId: 'node-root',
    branchName: 'branch-perf (Zero-Copy Ring-Buffers)',
    title: 'Branch Alpha: Lock-Free Atomic Ring-Buffers',
    timestamp: 'Today, 10:18 AM',
    prompt: 'Optimize for raw throughput using lock-free ring-buffers and SIMD vector hashing.',
    model: 'DeepSeek-R1 + Manus AI',
    content: `// Branch Alpha Implementation (High-Throughput)
pub struct ShardedCache {
    shards: [RwLock<HashMap<u64, Value>>; 64],
    atomic_counter: AtomicUsize,
}
// Benchmark: 1.4M Ops/sec with zero lock contention.`,
    metrics: { latency: '142ms', tokens: 680, rating: '1.4M QPS' },
    tags: ['Performance', 'Lock-Free'],
  },
  {
    id: 'node-branch-sec',
    parentId: 'node-root',
    branchName: 'branch-sec (Zero-Trust Cryptographic Proofs)',
    title: 'Branch Beta: Zero-Trust Auditing & AES-GCM Encrypted Shards',
    timestamp: 'Today, 10:22 AM',
    prompt: 'Fork from Root: Add tamper-evident Merkle tree logging and per-record encryption.',
    model: 'Claude 3.5 Sonnet',
    content: `// Branch Beta Implementation (Zero-Trust Security)
pub struct EncryptedStore {
    merkle_tree: MerkleTree<Sha256>,
    master_key: [u8; 32],
}
// Feature: Every cache eviction produces a verifiable cryptographic receipt.`,
    metrics: { latency: '210ms', tokens: 740, rating: 'Tamper-Proof' },
    tags: ['Security', 'Zero-Trust'],
  },
  {
    id: 'node-merged',
    parentId: 'node-branch-perf',
    branchName: 'merged-synthesis',
    title: 'Merged Synthesis: High-Throughput Encrypted Cache',
    timestamp: 'Today, 10:28 AM',
    prompt: 'Merge Branch Alpha (Lock-Free) with Branch Beta (Zero-Trust Encryption).',
    model: 'Gemini 3.6 Flash Arbiter',
    content: `# Unified Production Release
Combines lock-free 64-shard atomic routing with hardware-accelerated AES-NI encryption and async batch Merkle proofs. Zero compromise on throughput (1.2M QPS) while providing full cryptographic audit trails.`,
    metrics: { latency: '160ms', tokens: 910, rating: 'Production Ready' },
    tags: ['Merged', 'Consensus'],
  },
];

export const BranchingWorkspaceView: React.FC<BranchingWorkspaceViewProps> = ({
  darkMode = false,
  onInjectToChat,
  onSaveToNotes,
}) => {
  const [nodes, setNodes] = useState<BranchNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(INITIAL_NODES[0].id);
  const [compareNodeId, setCompareNodeId] = useState<string>(INITIAL_NODES[1].id);
  const [isDiffMode, setIsDiffMode] = useState<boolean>(false);
  const [newForkPrompt, setNewForkPrompt] = useState('');
  const [newForkName, setNewForkName] = useState('');
  const [showForkModal, setShowForkModal] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const compareNode = nodes.find((n) => n.id === compareNodeId) || nodes[1];

  const handleCreateFork = () => {
    if (!newForkPrompt.trim()) return;
    const forkId = `node-fork-${Date.now()}`;
    const newNode: BranchNode = {
      id: forkId,
      parentId: selectedNodeId,
      branchName: newForkName.trim() || `branch-${nodes.length + 1}`,
      title: `Fork from ${selectedNode.branchName}: ${newForkPrompt.slice(0, 30)}...`,
      timestamp: 'Just now',
      prompt: newForkPrompt,
      model: 'LOGITIX Multi-AI Engine',
      content: `# Explored Timeline: ${newForkPrompt}\n\nGenerated parallel reasoning trajectory from parent node [${selectedNode.title}].\n\nOptimized solution parameters for specified hypothesis.`,
      metrics: { latency: '195ms', tokens: 530, rating: 'Experimental' },
      tags: ['Forked', 'Active'],
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(forkId);
    setNewForkPrompt('');
    setNewForkName('');
    setShowForkModal(false);
  };

  const handleMergeBranches = () => {
    const mergeId = `node-merge-${Date.now()}`;
    const mergedNode: BranchNode = {
      id: mergeId,
      parentId: selectedNodeId,
      branchName: `merge-${selectedNode.branchName.split(' ')[0]}-${compareNode.branchName.split(' ')[0]}`,
      title: `Merged Synthesis: ${selectedNode.branchName} + ${compareNode.branchName}`,
      timestamp: 'Just now',
      prompt: `Synthesize best aspects of [${selectedNode.branchName}] and [${compareNode.branchName}]`,
      model: 'Gemini 3.6 Flash Arbiter',
      content: `# Synthesized Solution\n\nUnified insights from:\n- ${selectedNode.title}\n- ${compareNode.title}\n\n## Resolution:\nConsolidated high-performance execution patterns while preserving security constraints.`,
      metrics: { latency: '155ms', tokens: 820, rating: 'Merged Consensus' },
      tags: ['Merged', 'Consensus'],
    };

    setNodes((prev) => [...prev, mergedNode]);
    setSelectedNodeId(mergeId);
    setIsDiffMode(false);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 select-none max-w-7xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
        darkMode ? 'glass-card-dark border-emerald-500/20 shadow-2xl' : 'glass-card-light border-emerald-200 shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              <span>Time-Travel Branching Workspace (Git for Thoughts)</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Non-Linear Thought Forking & Timeline Explorer
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Never get stuck in rigid linear chats. Fork any response or code block into parallel timelines (Branch Alpha vs Beta), compare differences side-by-side, and merge the best insights into unified consensus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForkModal(true)}
              className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Fork New Timeline</span>
            </button>

            <button
              onClick={() => setIsDiffMode(!isDiffMode)}
              className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs border flex items-center gap-2 transition-all cursor-pointer ${
                isDiffMode
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
              }`}
            >
              <Split className="w-4 h-4" />
              <span>{isDiffMode ? 'Exit Diff View' : 'Compare Branches (Diff)'}</span>
            </button>
          </div>
        </div>

        {/* Visual Interactive Timeline Tree */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-3">
            Active Thought Tree Nodes:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isCompared = isDiffMode && compareNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    if (isDiffMode && node.id !== selectedNodeId) {
                      setCompareNodeId(node.id);
                    } else {
                      setSelectedNodeId(node.id);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : isCompared
                      ? 'bg-purple-500/15 border-purple-500/50 shadow-lg shadow-purple-500/10'
                      : darkMode
                      ? 'bg-white/5 border-white/10 hover:border-white/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      node.branchName.includes('merged')
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {node.branchName.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{node.metrics.rating}</span>
                  </div>
                  <div className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {node.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-1">{node.prompt}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!isDiffMode ? (
        /* Single Node Detail Inspector */
        <div className={`p-6 rounded-3xl border space-y-4 ${
          darkMode ? 'glass-card-dark border-white/10 shadow-xl' : 'glass-card-light border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4 border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedNode.branchName}
                </span>
                <span className="text-xs text-slate-400 font-mono">{selectedNode.timestamp}</span>
              </div>
              <h2 className={`text-lg sm:text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {selectedNode.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-cyan-300">
                Model: {selectedNode.model}
              </span>
            </div>
          </div>

          {/* Node Prompt */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Branch Hypothesis / Instruction</span>
            <p className="text-xs text-slate-200 font-mono">{selectedNode.prompt}</p>
          </div>

          {/* Node Generated Content / Code */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 text-xs font-mono text-cyan-300 overflow-x-auto custom-scrollbar leading-relaxed">
            <pre className="whitespace-pre-wrap">{selectedNode.content}</pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
            {onInjectToChat && (
              <button
                onClick={() => onInjectToChat(selectedNode.content)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Node to Chat</span>
              </button>
            )}

            {onSaveToNotes && (
              <button
                onClick={() => {
                  onSaveToNotes(selectedNode.title, selectedNode.content, selectedNode.tags);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 flex items-center gap-2 cursor-pointer transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Save to Second Brain</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Split Diff Viewer Mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-400 font-mono">Branch A: {selectedNode.branchName}</span>
              <span className="text-slate-400">vs</span>
              <span className="text-purple-400 font-mono">Branch B: {compareNode.branchName}</span>
            </div>

            <button
              onClick={handleMergeBranches}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merge & Synthesize Branches</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Branch A */}
            <div className="p-5 rounded-3xl bg-slate-950 border border-emerald-500/30 space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-emerald-400">{selectedNode.title}</span>
                <span className="text-[10px] font-mono text-slate-400">{selectedNode.metrics.rating}</span>
              </div>
              <pre className="text-xs font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed h-72 overflow-y-auto custom-scrollbar">
                {selectedNode.content}
              </pre>
            </div>

            {/* Branch B */}
            <div className="p-5 rounded-3xl bg-slate-950 border border-purple-500/30 space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-purple-400">{compareNode.title}</span>
                <span className="text-[10px] font-mono text-slate-400">{compareNode.metrics.rating}</span>
              </div>
              <pre className="text-xs font-mono text-purple-200 whitespace-pre-wrap leading-relaxed h-72 overflow-y-auto custom-scrollbar">
                {compareNode.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Fork Modal */}
      {showForkModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className={`w-full max-w-lg p-6 rounded-3xl border space-y-4 ${
            darkMode ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Fork New Timeline from [{selectedNode.branchName}]</h3>
              </div>
              <button onClick={() => setShowForkModal(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Branch Name</label>
                <input
                  type="text"
                  value={newForkName}
                  onChange={(e) => setNewForkName(e.target.value)}
                  placeholder="e.g. branch-simd-optimization"
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Hypothesis / Divergent Prompt</label>
                <textarea
                  value={newForkPrompt}
                  onChange={(e) => setNewForkPrompt(e.target.value)}
                  rows={3}
                  placeholder="What alternative approach or constraints do you want to explore in this timeline?"
                  className={`w-full p-2.5 rounded-xl border text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none ${
                    darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowForkModal(false)}
                className="px-4 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFork}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Fork Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
