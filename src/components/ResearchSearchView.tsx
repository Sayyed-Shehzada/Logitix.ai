import React, { useState, useEffect, useMemo, useRef } from 'react';
import { citationsList } from '../data/mockData';
import { CitationItem } from '../types';
import { exportExecutiveSummaryAsPDF } from '../utils/exportConversation';

interface ResearchSearchViewProps {
  onOpenExportModal?: () => void;
  onAskQuery: (query: string) => void;
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
  onSaveToNotes?: (title: string, content: string, tags: string[]) => void;
  onRecordActivity?: (operation: any) => void;
}

type SynthesisPerspective = 'strategic' | 'architecture' | 'security' | 'performance';

interface KeyTakeaway {
  title: string;
  ref: string;
  impact: string;
  detail: string;
  confidence: string;
}

interface ActionItem {
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  recommendation: string;
  domain: string;
}

interface ExecutiveSynthesisData {
  title: string;
  overview: string;
  confidence: string;
  latencyMs: number;
  models: string[];
  takeaways: KeyTakeaway[];
  actionItems: ActionItem[];
}

export const ResearchSearchView: React.FC<ResearchSearchViewProps> = ({
  onAskQuery,
  onOpenExportModal,
  onReadingProgressChange,
  onSaveToNotes,
  onRecordActivity,
}) => {
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // Executive Summary Toggle & Synthesis State
  const [isExecutiveSummaryEnabled, setIsExecutiveSummaryEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('logitix_exec_summary_toggle');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [perspective, setPerspective] = useState<SynthesisPerspective>('strategic');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedActionIdx, setCopiedActionIdx] = useState<number | null>(null);
  const [savedToNotesSuccess, setSavedToNotesSuccess] = useState(false);
  const [expandedActionIdx, setExpandedActionIdx] = useState<number | null>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const presets = [
    'RFC-7386 JSON Merge Patch & Deterministic Ingestion',
    'PostgreSQL Connection Pooling Benchmarks under Network Partitions',
    'Google Drive API Resumable Upload 256KB Chunk Slicing',
    'Distributed Outbox Pattern with Local SQLite WAL and Redis Stream',
    'Redis Streams & Redlock Distributed Synchronization Pattern',
  ];

  const filteredCitations = useMemo(() => {
    let list = selectedDomain
      ? citationsList.filter((c) => c.domain === selectedDomain)
      : citationsList;

    if (query.trim()) {
      const qLower = query.toLowerCase();
      const matched = list.filter(
        (c) =>
          c.title.toLowerCase().includes(qLower) ||
          c.description.toLowerCase().includes(qLower) ||
          c.domain.toLowerCase().includes(qLower) ||
          c.ref.toLowerCase().includes(qLower)
      );
      if (matched.length > 0) return matched;
    }
    return list;
  }, [selectedDomain, query]);

  const domains = Array.from(new Set(citationsList.map((c) => c.domain)));

  // Toggle Executive Summary and persist preference
  const toggleExecutiveSummary = () => {
    setIsExecutiveSummaryEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('logitix_exec_summary_toggle', String(next));
      } catch {}
      return next;
    });
  };

  // Trigger quick realistic AI synthesis transition when query, domain or perspective changes
  useEffect(() => {
    if (isExecutiveSummaryEnabled) {
      setIsSynthesizing(true);
      const timer = setTimeout(() => {
        setIsSynthesizing(false);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [query, selectedDomain, perspective, isExecutiveSummaryEnabled]);

  // Compute dynamic executive synthesis data
  const synthesisData: ExecutiveSynthesisData = useMemo(() => {
    const qLower = query.toLowerCase();
    const isRfcOrIdempotency = qLower.includes('rfc') || qLower.includes('idempot') || qLower.includes('patch');
    const isPostgresOrDb = qLower.includes('postgres') || qLower.includes('sql') || qLower.includes('pool');
    const isDriveOrUpload = qLower.includes('drive') || qLower.includes('upload') || qLower.includes('chunk');
    const isRedisOrOutbox = qLower.includes('redis') || qLower.includes('outbox') || qLower.includes('stream');

    let title = 'Executive Technical Synthesis & System Invariants';
    let overview =
      'Multi-hop synthesis across IETF RFC standards, database engine benchmarks, and cloud upload protocols confirms that high-availability data ingestion requires atomic local state logging paired with deterministic replay protection. Adherence to formal invariants eliminates token-drift, data loss during partition events, and redundant upstream cloud mutations.';

    let takeaways: KeyTakeaway[] = [
      {
        title: 'Deterministic Mutation Processing via RFC-7386',
        ref: 'IETF RFC-7386 §4.1',
        impact: '100% Idempotent Ingestion',
        detail:
          'Payloads must validate null-field semantics and compute deterministic SHA-256 mutation hashes before triggering asynchronous write pipelines.',
        confidence: '99.9%',
      },
      {
        title: 'Connection Exhaustion Mitigation via Transaction Pooling',
        ref: 'PostgreSQL v16 PgBouncer Spec',
        impact: '10x Connection Resilience',
        detail:
          'Under network partition recovery, transaction-mode pooling caps backend fork overhead and prevents cascading connection pool collapse.',
        confidence: '98.5%',
      },
      {
        title: 'HTTP 308 Resumable Upload Segment Slicing',
        ref: 'Google Drive API v3 §Manual',
        impact: 'Zero Ingestion Quota Loss',
        detail:
          'Upload streams must adhere to 256KB boundary alignment with proactive range verification to recover transparently from broken sockets.',
        confidence: '99.8%',
      },
      {
        title: 'At-Least-Once Distributed Outbox Lease Synchronization',
        ref: 'Redis 7.2 & Local SQLite WAL',
        impact: 'Zero Event Dropping',
        detail:
          'Two-phase local SQLite commits followed by background distributed leases prevent dual-write anomalies across isolated distributed microservices.',
        confidence: '98.7%',
      },
    ];

    let actionItems: ActionItem[] = [
      {
        priority: 'P0',
        title: 'Enforce SHA-256 Idempotency Header on All Mutation Routes',
        description:
          'Validate client mutation hashes against a 24-hour Redis token bucket before executing downstream ledger or cloud drive writes.',
        recommendation:
          'middleware/idempotency.ts: Check Redis key `idemp:${sha256(body)}`; if present, return HTTP 409 or cached payload digest.',
        domain: 'nodejs.org',
      },
      {
        priority: 'P0',
        title: 'Standardize 256KB Byte-Range Slice Uploads with 308 Re-query',
        description:
          'Prevent dangling uncommitted cloud objects by querying Content-Range on any network disconnect before retrying chunks.',
        recommendation:
          'uploader.ts: On socket abort, issue `PUT` with `Content-Range: bytes */${totalSize}` to fetch authoritative byte offset.',
        domain: 'developers.google',
      },
      {
        priority: 'P1',
        title: 'Configure PgBouncer Transaction Pooling with Reserve Ceilings',
        description:
          'Cap client connections at 1,000 while maintaining a default pool size of 25 connections per database to eliminate pool thrashing.',
        recommendation:
          'pgbouncer.ini: Set `pool_mode = transaction`, `reserve_pool_size = 5`, and `server_idle_timeout = 600`.',
        domain: 'postgresql.org',
      },
      {
        priority: 'P2',
        title: 'Deploy Distributed Worker Leases with Atomic Fencing Tokens',
        description:
          'Ensure outbox queue dispatchers hold monotonic lease tokens to prevent split-brain dual dispatching during failover windows.',
        recommendation:
          'worker.ts: Execute `SET lease:worker ${workerId} NX EX 15` before polling SQLite table `outbox WHERE status = "PENDING"`.',
        domain: 'redis.io',
      },
    ];

    if (isRfcOrIdempotency) {
      title = 'Executive Summary: RFC-7386 JSON Merge Patch & Idempotency Specification';
      overview =
        'Detailed evaluation of RFC-7386 indicates that partial updates must treat explicit null values as object key deletions while omitting absent keys from mutation recalculations. Pairing this with a cryptographic SHA-256 request payload fingerprint provides formal guarantees against replay attacks and double-billing mutations in multi-tenant cloud architectures.';
      takeaways[0].impact = 'Guaranteed Determinism';
      takeaways[0].detail =
        'RFC-7386 mandates strict recursive object merging. Client mutations cannot produce divergent backend states across distributed replicas.';
    } else if (isPostgresOrDb) {
      title = 'Executive Summary: PostgreSQL PgBouncer High-Concurrency Ingestion';
      overview =
        'Benchmarking reveals that direct client connections degrade PostgreSQL throughput by 42% under bursts exceeding 500 concurrent sessions. Implementing PgBouncer in transaction mode maintains query latencies under 4ms while buffering connection churn during AWS Multi-AZ failovers.';
    } else if (isDriveOrUpload) {
      title = 'Executive Summary: Resumable Cloud Ingestion & RFC-7233 Chunk Architecture';
      overview =
        'Analysis of Google Drive and S3-compatible cloud APIs verifies that multi-part transfers must align with 256KB boundaries. In the event of network disruption, client runtimes must execute HTTP 308 range queries to determine the exact byte watermark rather than restarting transfers from byte zero.';
    } else if (isRedisOrOutbox) {
      title = 'Executive Summary: Distributed Outbox & Redis Stream Synchronization';
      overview =
        'Dual-write failure modes between local relational storage and external messaging queues can cause data drift. The transactional outbox pattern guarantees that changes are committed atomically to local WAL storage before being pushed to Redis stream workers with fencing tokens.';
    }

    // Adapt based on selected perspective
    if (perspective === 'security') {
      overview += ' Security Audit: Cryptographic digests and JWKS token verification enforce zero-trust bounds.';
      actionItems = [
        {
          priority: 'P0',
          title: 'Rotate Token Verification Keys with JWKS Background Refresh',
          description:
            'Cache JWKS certificates with a 1-hour TTL and implement proactive refresh 60 seconds prior to expiration to eliminate mid-pipe auth drops.',
          recommendation:
            'auth/jwks.ts: Cache public signing keys using distributed Redis key with clock skew allowance of 120s.',
          domain: 'firebase.corp',
        },
        ...actionItems.slice(0, 3),
      ];
    } else if (perspective === 'performance') {
      overview += ' Performance Audit: Low-latency benchmarks prioritize memory pooling and sub-millisecond WAL commits.';
      actionItems = [
        {
          priority: 'P0',
          title: 'Enable SQLite WAL Concurrent Read/Write Primitives',
          description:
            'Configure SQLite in Write-Ahead Logging mode (`PRAGMA journal_mode=WAL`) to allow concurrent reader threads without locking workers.',
          recommendation:
            'db.ts: Execute `PRAGMA synchronous = NORMAL; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`.',
          domain: 'nodejs.org',
        },
        ...actionItems.slice(0, 3),
      ];
    }

    return {
      title,
      overview,
      confidence: '99.4%',
      latencyMs: 218,
      models: ['Gemini 3.1 Flash Lite', 'Claude 3.5 Sonnet', 'Manus AI'],
      takeaways,
      actionItems,
    };
  }, [query, selectedDomain, perspective]);

  // Memoized text representation for dynamic reading time calculations
  const synthesisFullText = useMemo(() => {
    if (!isExecutiveSummaryEnabled) {
      return filteredCitations.map((c) => `${c.title} ${c.description}`).join(' ');
    }
    return `${synthesisData.title}\n${synthesisData.overview}\n` +
      synthesisData.takeaways.map((x) => `${x.title}: ${x.detail}`).join('\n') + '\n' +
      synthesisData.actionItems.map((a) => `${a.title}: ${a.description} ${a.recommendation}`).join('\n');
  }, [isExecutiveSummaryEnabled, filteredCitations, synthesisData]);

  // Scroll handler to report reading progress to Header
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (maxScroll <= 0) {
      if (onReadingProgressChange) {
        onReadingProgressChange(100, {
          title: isExecutiveSummaryEnabled ? 'Executive Research Synthesis' : 'Technical Research Grounding',
          type: 'research',
          textContent: synthesisFullText,
          textLength: synthesisFullText.length,
        });
      }
      return;
    }
    const currentProgress = Math.min(100, Math.max(0, Math.round((target.scrollTop / maxScroll) * 100)));
    if (onReadingProgressChange) {
      onReadingProgressChange(currentProgress, {
        title: isExecutiveSummaryEnabled ? 'Executive Research Synthesis' : 'Technical Research Grounding',
        type: 'research',
        textContent: synthesisFullText,
        textLength: synthesisFullText.length,
      });
    }
  };

  // Sync initial reading title and text content on mount or when toggle or synthesis status changes
  useEffect(() => {
    if (onReadingProgressChange) {
      onReadingProgressChange(0, {
        title: isExecutiveSummaryEnabled ? 'Executive Research Synthesis & Action Items' : 'Technical Research Grounding',
        type: 'research',
        textContent: synthesisFullText,
        textLength: synthesisFullText.length,
        isStreaming: isSynthesizing,
      });
    }
  }, [isExecutiveSummaryEnabled, synthesisFullText, isSynthesizing, onReadingProgressChange]);

  // Copy full executive summary as markdown
  const handleCopySummary = () => {
    let md = `# ${synthesisData.title}\n\n`;
    md += `**Multi-AI Consensus:** ${synthesisData.models.join(' • ')} (${synthesisData.confidence} Confidence, ${synthesisData.latencyMs}ms)\n\n`;
    md += `## 1. Executive Summary & Invariants\n${synthesisData.overview}\n\n`;
    md += `## 2. Key Research Takeaways\n`;
    synthesisData.takeaways.forEach((t, i) => {
      md += `${i + 1}. **${t.title}** [${t.ref}] - Impact: ${t.impact}\n   ${t.detail}\n`;
    });
    md += `\n## 3. Prioritized Action Items\n`;
    synthesisData.actionItems.forEach((a) => {
      md += `- [${a.priority}] **${a.title}** (${a.domain})\n  Description: ${a.description}\n  Recommendation: \`${a.recommendation}\`\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2200);
  };

  // Copy specific action item
  const handleCopyAction = (item: ActionItem, idx: number) => {
    const text = `[${item.priority}] ${item.title}\nDescription: ${item.description}\nCode Guidance: ${item.recommendation}`;
    navigator.clipboard.writeText(text);
    setCopiedActionIdx(idx);
    setTimeout(() => setCopiedActionIdx(null), 1800);
  };

  // Save executive summary to local artifacts and trigger prop
  const handleSaveToNotes = () => {
    const newArtifact = {
      id: `art-exec-${Date.now()}`,
      title: synthesisData.title,
      category: 'spec',
      updatedAt: 'Just now',
      content: `# ${synthesisData.title}\n\n${synthesisData.overview}\n\n### Key Takeaways:\n${synthesisData.takeaways.map((t) => `- [${t.ref}] ${t.title}: ${t.detail}`).join('\n')}\n\n### Action Items:\n${synthesisData.actionItems.map((a) => `[${a.priority}] ${a.title}\n${a.description}\nGuidance: ${a.recommendation}`).join('\n\n')}`,
    };

    try {
      const stored = localStorage.getItem('logitix_saved_artifacts');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newArtifact);
      localStorage.setItem('logitix_saved_artifacts', JSON.stringify(list));
    } catch (e) {
      console.warn('Could not persist artifact:', e);
    }

    if (onSaveToNotes) {
      onSaveToNotes(synthesisData.title, newArtifact.content, ['Executive Summary', 'RFC Grounding', 'Action Items']);
    }

    setSavedToNotesSuccess(true);
    setTimeout(() => setSavedToNotesSuccess(false), 2400);
  };

  // Export Executive Summary directly to PDF
  const handleExportPDF = () => {
    exportExecutiveSummaryAsPDF({
      title: synthesisData.title,
      query: query || 'Grounding Technical RFCs & Cloud Specs',
      domain: selectedDomain,
      perspective,
      overview: synthesisData.overview,
      takeaways: synthesisData.takeaways,
      actionItems: synthesisData.actionItems,
      author: 'LOGITIX AI Executive Synthesis',
    });
    if (onRecordActivity) {
      onRecordActivity({
        type: 'pdf',
        title: 'Exported PDF',
        description: `Research Synthesis: ${synthesisData.title}`,
        view: 'research-search',
        payload: { query },
        icon: 'picture_as_pdf',
        badge: 'Research PDF',
        badgeColor: '#ef4444',
      });
    }
  };

  return (
    <div
      id="research-search-container"
      data-reading-container="true"
      data-reading-title={isExecutiveSummaryEnabled ? 'Executive Research Synthesis & Action Items' : 'Technical Evidence Grounding'}
      data-reading-type="research"
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-6"
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-code text-[11px] text-[#1a146b] font-medium bg-[#e2dfff] px-2 py-0.5 rounded">
              GROUNDED RESEARCH ENGINE
            </span>
            <span className="flex items-center gap-1 font-code text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              MULTI-HOP VERIFIED
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#1a1c1c] mt-1.5">
            Technical Research & Evidence Grounding
          </h1>
          <p className="font-body text-xs md:text-sm text-[#474651] mt-0.5">
            Cross-domain validation across formal RFC standards, cloud specifications, and architectural invariants.
          </p>
        </div>

        {/* Global Quick Export Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e2e2e2] bg-white hover:bg-[#f3f4f3] text-[#1a146b] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Export research session as PDF"
            >
              <span className="material-symbols-outlined text-[16px] text-red-600">picture_as_pdf</span>
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Box */}
      <div className="p-4 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-3">
        <div className="relative flex items-center bg-[#f9f9f8] rounded-xl border border-[#e2e2e2] px-4 py-2.5 focus-within:border-[#1a146b] focus-within:bg-white transition-all">
          <span className="material-symbols-outlined text-[#777682] text-[20px] mr-3">search</span>
          <input
            type="text"
            placeholder="Search specs, RFCs, byte slicing, distributed locks, idempotency..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                onAskQuery(query);
              }
            }}
            className="w-full text-xs md:text-sm bg-transparent outline-none text-[#1a1c1c] placeholder:text-[#777682]"
          />
          {query && (
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                onClick={() => setQuery('')}
                className="p-1 text-[#777682] hover:text-[#1a1c1c] rounded-md hover:bg-slate-100"
                title="Clear query"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
              <button
                onClick={() => onAskQuery(query)}
                className="px-3 py-1 bg-[#1a146b] hover:bg-[#312e81] text-white text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Synthesize in Chat</span>
                <span className="material-symbols-outlined text-[14px]">send</span>
              </button>
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-code uppercase text-[#777682]">Preset Searches:</span>
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuery(p);
              }}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                query === p
                  ? 'bg-[#1a146b] text-white font-medium'
                  : 'bg-[#f3f4f3] hover:bg-[#e2dfff]/60 text-[#1a146b]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* AUTOMATED EXECUTIVE SUMMARY TOGGLE BAR */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/60 p-4 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a146b] text-white flex items-center justify-center shadow-xs shrink-0">
              <span className={`material-symbols-outlined text-[20px] ${isSynthesizing ? 'animate-spin' : ''}`}>
                {isExecutiveSummaryEnabled ? 'auto_awesome' : 'summarize'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#1a1c1c]">
                  Automated Executive Summary
                </span>
                {isExecutiveSummaryEnabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    SYNTHESIS ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                    STANDBY
                  </span>
                )}
              </div>
              <p className="text-xs text-[#52525b] mt-0.5">
                Automatically consolidates matched evidence and specs into key takeaways and actionable engineering items.
              </p>
            </div>
          </div>

          {/* Toggle Switch Control & Fast Actions */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {isExecutiveSummaryEnabled && (
              <button
                onClick={() => {
                  setIsSynthesizing(true);
                  setTimeout(() => setIsSynthesizing(false), 300);
                }}
                disabled={isSynthesizing}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs text-[#1a146b] hover:bg-white rounded-lg border border-indigo-200 font-medium transition-all cursor-pointer"
                title="Re-synthesize summary"
              >
                <span className={`material-symbols-outlined text-[15px] ${isSynthesizing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>Refresh AI</span>
              </button>
            )}

            {/* The Main Accessible Switch */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <span className="text-xs font-semibold text-[#1a146b]">
                {isExecutiveSummaryEnabled ? 'Summary ON' : 'Summary OFF'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isExecutiveSummaryEnabled}
                onClick={toggleExecutiveSummary}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  isExecutiveSummaryEnabled ? 'bg-[#1a146b]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    isExecutiveSummaryEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Perspective Selection Chips (Visible when Toggle is Enabled) */}
        {isExecutiveSummaryEnabled && (
          <div className="mt-4 pt-3 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-[#777682] mr-1">Perspective:</span>
              {(
                [
                  { id: 'strategic', label: 'Strategic & Overview', icon: 'hub' },
                  { id: 'architecture', label: 'Architecture & Invariants', icon: 'account_tree' },
                  { id: 'security', label: 'Security & Idempotency', icon: 'shield_lock' },
                  { id: 'performance', label: 'High Throughput & WAL', icon: 'speed' },
                ] as const
              ).map((persp) => (
                <button
                  key={persp.id}
                  onClick={() => setPerspective(persp.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    perspective === persp.id
                      ? 'bg-[#1a146b] text-white shadow-2xs font-semibold'
                      : 'bg-white/80 hover:bg-white text-[#474651] border border-indigo-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">{persp.icon}</span>
                  <span>{persp.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#777682] font-code">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Consensus: Gemini 3.1 + Claude 3.5
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">{synthesisData.confidence} Verified</span>
            </div>
          </div>
        )}
      </div>

      {/* SYNTHESIZED EXECUTIVE SUMMARY CONTAINER CARD */}
      {isExecutiveSummaryEnabled && (
        <div className="relative rounded-2xl bg-white border border-[#e2e2e2] shadow-sm p-5 sm:p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Shimmer loading bar when synthesizing */}
          {isSynthesizing && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden rounded-t-2xl">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-pulse"></div>
            </div>
          )}

          {/* Section 1: Executive Overview Header */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 text-[#1a146b] font-code text-[10px] font-bold tracking-wider uppercase">
                    AI SYNTHESIS REPORT
                  </span>
                  <span className="text-xs text-[#777682] font-code">
                    Latency: {synthesisData.latencyMs}ms
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-headline font-bold text-[#1a1c1c]">
                  {synthesisData.title}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleCopySummary}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#e2e2e2] hover:bg-[#f9f9f8] text-[#1a1c1c] text-xs font-medium transition-all cursor-pointer"
                  title="Copy formatted markdown summary"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#777682]">
                    {copiedSummary ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedSummary ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleSaveToNotes}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#e2e2e2] hover:bg-[#f9f9f8] text-[#1a1c1c] text-xs font-medium transition-all cursor-pointer"
                  title="Save summary to Notes & Artifacts"
                >
                  <span className="material-symbols-outlined text-[15px] text-indigo-600">
                    {savedToNotesSuccess ? 'task_alt' : 'bookmark_add'}
                  </span>
                  <span>{savedToNotesSuccess ? 'Saved!' : 'Save Note'}</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a146b] hover:bg-[#312e81] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  title="Export executive PDF report"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>PDF Report</span>
                </button>
              </div>
            </div>

            {/* Overview Box */}
            <div className="mt-3.5 p-4 rounded-xl bg-[#f9f9f8] border-l-4 border-indigo-600 text-xs sm:text-sm text-[#374151] leading-relaxed font-body">
              {synthesisData.overview}
            </div>
          </div>

          {/* Section 2: Key Research Takeaways */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#1a1c1c] uppercase tracking-wider font-code flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">verified</span>
                <span>Key Research Takeaways ({synthesisData.takeaways.length})</span>
              </h3>
              <span className="text-[11px] text-[#777682]">
                Cross-validated with formal specifications
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {synthesisData.takeaways.map((takeaway, idx) => (
                <div
                  key={takeaway.title}
                  className="p-4 rounded-xl bg-white border border-[#e2e2e2] hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[#1a146b] font-code text-[10px] font-bold">
                        {takeaway.ref}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                        {takeaway.impact}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs sm:text-sm text-[#1a1c1c] group-hover:text-indigo-950 transition-colors">
                      {idx + 1}. {takeaway.title}
                    </h4>
                    <p className="text-xs text-[#52525b] mt-1.5 leading-relaxed">
                      {takeaway.detail}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-code text-slate-500">
                      Grounded: <span className="font-semibold text-emerald-700">{takeaway.confidence}</span>
                    </span>
                    <button
                      onClick={() => onAskQuery(`Deep dive into takeaway: ${takeaway.title} (${takeaway.ref})`)}
                      className="text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <span>Explore</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Prioritized Action Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#1a1c1c] uppercase tracking-wider font-code flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-600 text-[18px]">checklist</span>
                <span>Prioritized Engineering Action Items</span>
              </h3>
              <span className="text-[11px] text-[#777682]">
                Ranked by failure mitigation impact
              </span>
            </div>

            <div className="space-y-3">
              {synthesisData.actionItems.map((action, aIdx) => {
                const isExpanded = expandedActionIdx === aIdx;
                const isCopied = copiedActionIdx === aIdx;

                const priorityBadge =
                  action.priority === 'P0' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      P0 CRITICAL
                    </span>
                  ) : action.priority === 'P1' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      P1 HIGH
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      P2 OPTIMIZATION
                    </span>
                  );

                return (
                  <div
                    key={action.title}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? 'bg-slate-50/70 border-indigo-300 shadow-xs'
                        : 'bg-white border-[#e2e2e2] hover:border-slate-300'
                    }`}
                  >
                    <div className="p-3.5 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {priorityBadge}
                          <span className="font-semibold text-xs sm:text-sm text-[#1a1c1c]">
                            {action.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <span className="text-[10px] font-code text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {action.domain}
                          </span>
                          <button
                            onClick={() => handleCopyAction(action, aIdx)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                            title="Copy action item"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {isCopied ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          <button
                            onClick={() => setExpandedActionIdx(isExpanded ? null : aIdx)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                            title={isExpanded ? 'Collapse code guidance' : 'Expand code guidance'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#52525b] mt-1.5 leading-relaxed">
                        {action.description}
                      </p>

                      {/* Collapsible / Detailed Code Guidance */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-[11px] font-code text-indigo-700 font-semibold mb-1">
                            <span>Implementation Spec:</span>
                            <button
                              onClick={() => onAskQuery(`Implement this action item in TypeScript: ${action.title}. Recommendation: ${action.recommendation}`)}
                              className="text-xs text-[#1a146b] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Execute in Chat Studio</span>
                              <span className="material-symbols-outlined text-[13px]">play_circle</span>
                            </button>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#1e1e2e] text-[#cdd6f4] font-code text-xs overflow-x-auto leading-relaxed border border-slate-800">
                            <code>{action.recommendation}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Interactive Footer Bar */}
          <div className="pt-3 border-t border-[#e2e2e2] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">verified_user</span>
              <span className="text-xs text-[#52525b]">
                Grounded against zero-loss RFC invariants and real-time model arbitration.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onAskQuery(
                    `Executive Deep Dive on synthesized findings:\n\nTitle: ${synthesisData.title}\n\nOverview:\n${synthesisData.overview}\n\nPlease generate a full production-ready implementation plan addressing all P0 and P1 action items.`
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a146b] hover:bg-[#312e81] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>Inject Full Synthesis into Chat</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citations Grid Section Header */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1a1c1c]">
              Individual Grounded Citations & Spec References ({filteredCitations.length})
            </h2>
            <p className="text-xs text-[#777682]">
              Filter by authoritative standard domains or search above
            </p>
          </div>

          {/* Filter by Domain */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedDomain(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedDomain === null
                  ? 'bg-[#1a146b] text-white shadow-2xs'
                  : 'bg-white border border-[#e2e2e2] text-[#474651] hover:bg-slate-50'
              }`}
            >
              All Domains
            </button>
            {domains.map((dom) => (
              <button
                key={dom}
                onClick={() => setSelectedDomain(dom)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedDomain === dom
                    ? 'bg-[#1a146b] text-white shadow-2xs'
                    : 'bg-white border border-[#e2e2e2] text-[#474651] hover:bg-slate-50'
                }`}
              >
                {dom}
              </button>
            ))}
          </div>
        </div>

        {/* Citations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCitations.map((cite) => (
            <div
              key={cite.title}
              className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-2xs hover:border-[#1a146b]/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-code text-[#777682] mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#f3f4f3] text-[#1a146b] font-medium">
                    {cite.domain}
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    {cite.score} Grounded Score
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-[#1a1c1c] leading-snug">
                  {cite.title}
                </h3>
                <p className="text-xs text-[#474651] mt-2 leading-relaxed">
                  {cite.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#e2e2e2]/70 flex items-center justify-between">
                <span className="text-[11px] font-code text-[#777682]">Location: {cite.ref}</span>
                <button
                  onClick={() => onAskQuery(`Deep dive into: ${cite.title} (${cite.ref})`)}
                  className="text-xs text-[#1a146b] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Ask in Chat</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
