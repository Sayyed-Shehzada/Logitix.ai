import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Share2,
  BookOpen,
  Send,
  Zap,
  Layers,
  Plus,
  Compass,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  FileCode2,
  Trash2
} from 'lucide-react';
import { NoteItem } from '../types.js';

interface GraphNode {
  id: string;
  title: string;
  category: 'Ideas' | 'Code' | 'Research' | 'Security' | 'General';
  content: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  tags: string[];
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
  label?: string;
}

interface NeuralGraphViewProps {
  darkMode?: boolean;
  notes?: NoteItem[];
  onSelectNote?: (note: NoteItem) => void;
  onInjectToChat?: (text: string) => void;
}

const DEFAULT_NODES: GraphNode[] = [
  {
    id: 'node-1',
    title: 'LOGITIX Multi-AI Consensus',
    category: 'Code',
    content: 'Frontier model synthesis combining Manus AI, Claude 3.5 Sonnet, DeepSeek-R1, and Gemini 3.6 into a round-table debate engine.',
    x: 400,
    y: 250,
    vx: 0,
    vy: 0,
    radius: 28,
    tags: ['Consensus', 'Architecture', 'AI'],
  },
  {
    id: 'node-2',
    title: 'Zero-Knowledge Cryptographic Receipts',
    category: 'Security',
    content: 'Verifiable execution hashes proving non-repudiation, tamper-evident audit logs, and sandbox isolation.',
    x: 250,
    y: 180,
    vx: 0,
    vy: 0,
    radius: 22,
    tags: ['Security', 'ZK-Proofs', 'Audit'],
  },
  {
    id: 'node-3',
    title: 'Hardware IoT Digital Twin',
    category: 'Research',
    content: 'Interactive virtual breadboard simulator for ESP32 and Arduino with live OLED I2C, DHT22 sensors, and UART serial telemetry.',
    x: 550,
    y: 320,
    vx: 0,
    vy: 0,
    radius: 24,
    tags: ['IoT', 'ESP32', 'Sensors'],
  },
  {
    id: 'node-4',
    title: 'Time-Travel Branching Workspace',
    category: 'Ideas',
    content: 'Git-like thought forking allowing users to branch prompts, compare diffs side-by-side, and synthesize multiple timelines.',
    x: 320,
    y: 380,
    vx: 0,
    vy: 0,
    radius: 20,
    tags: ['Branching', 'Timelines', 'UX'],
  },
  {
    id: 'node-5',
    title: 'Lock-Free Ring-Buffer Cache',
    category: 'Code',
    content: 'Bounded ring-buffer memory queue of size 2^16 supporting 1.4M ops/sec with zero lock contention.',
    x: 200,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 18,
    tags: ['Rust', 'Performance', 'Cache'],
  },
  {
    id: 'node-6',
    title: 'Neural Knowledge Universe Physics',
    category: 'Research',
    content: 'Force-directed spring mechanics and semantic vector clustering linking all user notes and research documents.',
    x: 480,
    y: 140,
    vx: 0,
    vy: 0,
    radius: 22,
    tags: ['Physics', 'Graph', 'Semantic'],
  },
];

const DEFAULT_LINKS: GraphLink[] = [
  { source: 'node-1', target: 'node-2', strength: 0.8, label: 'Consensus Proof' },
  { source: 'node-1', target: 'node-4', strength: 0.7, label: 'Timeline Forks' },
  { source: 'node-1', target: 'node-3', strength: 0.6, label: 'Firmware AI' },
  { source: 'node-2', target: 'node-5', strength: 0.5, label: 'Tamper-Proof Logs' },
  { source: 'node-4', target: 'node-6', strength: 0.7, label: 'Semantic Trails' },
  { source: 'node-3', target: 'node-5', strength: 0.4, label: 'Fast Telemetry' },
];

export const NeuralGraphView: React.FC<NeuralGraphViewProps> = ({
  darkMode = false,
  notes = [],
  onSelectNote,
  onInjectToChat,
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>(DEFAULT_NODES);
  const [links, setLinks] = useState<GraphLink[]>(DEFAULT_LINKS);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(DEFAULT_NODES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [unseenConnection, setUnseenConnection] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingNodeRef = useRef<GraphNode | null>(null);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Merge real user notes into graph if available
  useEffect(() => {
    if (notes && notes.length > 0) {
      const convertedNotes: GraphNode[] = notes.map((n, i) => ({
        id: `note-${n.id}`,
        title: n.title,
        category: (n.category as any) || 'General',
        content: n.content,
        x: 300 + (Math.sin(i) * 150),
        y: 250 + (Math.cos(i) * 150),
        vx: 0,
        vy: 0,
        radius: 20,
        tags: n.tags || ['Note'],
      }));

      // Combine unique
      setNodes((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnes = convertedNotes.filter((c) => !existingIds.has(c.id));
        return [...prev, ...newOnes];
      });
    }
  }, [notes]);

  // Physics animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save context for pan/zoom
      ctx.save();
      ctx.translate(offsetRef.current.x, offsetRef.current.y);
      ctx.scale(zoomLevel, zoomLevel);

      // Draw Links with glowing gradients
      links.forEach((link) => {
        const sourceNode = nodes.find((n) => n.id === link.source);
        const targetNode = nodes.find((n) => n.id === link.target);
        if (!sourceNode || !targetNode) return;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = darkMode ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw animated synapse pulses along line
        const time = Date.now() * 0.001;
        const pulsePos = (time * link.strength) % 1;
        const px = sourceNode.x + (targetNode.x - sourceNode.x) * pulsePos;
        const py = sourceNode.y + (targetNode.y - sourceNode.y) * pulsePos;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = darkMode ? '#38bdf8' : '#0284c7';
        ctx.fill();
      });

      // Simple repulsion + spring physics
      nodes.forEach((node, i) => {
        if (node === draggingNodeRef.current) return;

        // Gravity towards center
        const cx = canvas.width / (2 * zoomLevel);
        const cy = canvas.height / (2 * zoomLevel);
        node.vx += (cx - node.x) * 0.0003;
        node.vy += (cy - node.y) * 0.0003;

        // Repulsion from other nodes
        nodes.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 120) {
            const force = (120 - dist) * 0.002;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        });

        // Damping
        node.vx *= 0.92;
        node.vy *= 0.92;

        node.x += node.vx;
        node.y += node.vy;
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const isSelected = selectedNode?.id === node.id;
        const isMatch =
          (!searchQuery || node.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
          (selectedCategory === 'All' || node.category === selectedCategory);

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        // Category Color
        let color = '#a855f7'; // Ideas
        if (node.category === 'Code') color = '#00f2fe';
        if (node.category === 'Security') color = '#f59e0b';
        if (node.category === 'Research') color = '#10b981';

        ctx.fillStyle = isMatch ? color : darkMode ? '#334155' : '#cbd5e1';
        ctx.shadowColor = isSelected ? color : 'transparent';
        ctx.shadowBlur = isSelected ? 20 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Border ring
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.strokeStyle = isSelected ? '#ffffff' : darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
        ctx.stroke();

        // Node Title Label
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = darkMode ? '#f8fafc' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(node.title.slice(0, 18), node.x, node.y + node.radius + 14);
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [nodes, links, selectedNode, searchQuery, selectedCategory, zoomLevel, darkMode]);

  // Canvas Mouse Interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offsetRef.current.x) / zoomLevel;
    const mouseY = (e.clientY - rect.top - offsetRef.current.y) / zoomLevel;

    // Find clicked node
    const clicked = nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (clicked) {
      draggingNodeRef.current = clicked;
      setSelectedNode(clicked);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingNodeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    draggingNodeRef.current.x = (e.clientX - rect.left - offsetRef.current.x) / zoomLevel;
    draggingNodeRef.current.y = (e.clientY - rect.top - offsetRef.current.y) / zoomLevel;
  };

  const handleMouseUp = () => {
    draggingNodeRef.current = null;
  };

  const handleFindUnseenConnections = () => {
    setIsDiscovering(true);
    setUnseenConnection(null);

    setTimeout(() => {
      setUnseenConnection(
        `⚡ Unseen Semantic Bridge Discovered:
The 'Lock-Free Ring-Buffer Cache' and 'Hardware IoT Digital Twin' share a direct synergy! Telemetry from the ESP32 DHT22 sensor can stream directly into the 1.4M QPS bounded ring-buffer queue, enabling real-time industrial anomaly detection with verified cryptographic audit receipts.`
      );
      // Auto create link
      setLinks((prev) => [
        ...prev,
        { source: 'node-3', target: 'node-5', strength: 0.9, label: 'AI Telemetry Pipeline' },
      ]);
      setIsDiscovering(false);
    }, 1400);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 select-none max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
        darkMode ? 'glass-card-dark border-purple-500/20 shadow-2xl' : 'glass-card-light border-purple-200 shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>3D Living Knowledge Graph & Neural Second Brain</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Living Knowledge Universe & Semantic Synapse
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              All your notes, code concepts, hardware schematics, and timeline forks live as dynamic interconnected nodes. Discover hidden cross-domain insights with the AI Synapse engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFindUnseenConnections}
              disabled={isDiscovering}
              className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
              <span>{isDiscovering ? 'Discovering Connections...' : 'Find Unseen Connections'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {(['All', 'Code', 'Ideas', 'Research', 'Security'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                    : darkMode
                    ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge nodes..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Unseen Connection Alert Banner if discovered */}
      {unseenConnection && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-cyan-500/15 to-emerald-500/15 border border-purple-500/40 shadow-xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
              {unseenConnection}
            </p>
          </div>
          <button
            onClick={() => setUnseenConnection(null)}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Canvas + Node Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className={`lg:col-span-2 p-2 rounded-3xl border relative min-h-[480px] overflow-hidden flex flex-col ${
          darkMode ? 'bg-slate-950/90 border-purple-500/20 shadow-2xl' : 'bg-slate-900 border-slate-700 shadow-xl'
        }`}>
          {/* Background Stars / Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#a855f715_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Canvas Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
              className="p-2 rounded-xl bg-black/50 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
              className="p-2 rounded-xl bg-black/50 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={720}
            height={480}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-[480px] cursor-grab active:cursor-grabbing z-0"
          />
        </div>

        {/* Node Detail Inspector Panel */}
        <div className={`p-5 rounded-3xl border space-y-4 flex flex-col justify-between ${
          darkMode ? 'glass-card-dark border-white/10' : 'glass-card-light border-slate-200'
        }`}>
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-white/10">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {selectedNode.category}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Node ID: {selectedNode.id}</span>
              </div>

              <div>
                <h3 className={`text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedNode.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-2 font-sans">
                  {selectedNode.content}
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Semantic Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-cyan-300 font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Click any node in the knowledge universe to inspect properties.
            </div>
          )}

          {/* Action Buttons */}
          {selectedNode && (
            <div className="space-y-2 pt-4 border-t border-white/10">
              {onInjectToChat && (
                <button
                  onClick={() => onInjectToChat(`Referencing Second Brain Node [${selectedNode.title}]: ${selectedNode.content}`)}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Node to Chat</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
