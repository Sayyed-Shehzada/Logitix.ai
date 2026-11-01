import React, { useState, useEffect } from 'react';
import { exportCodeSnippetAsPDF } from '../utils/exportConversation';

interface NotesArtifactsViewProps {
  onOpenExportModal?: () => void;
  onOpenOutboxDashboard?: () => void;
  onOpenGoogleSlides?: (prompt: string, conditions?: any) => void;
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
  onRecordActivity?: (operation: any) => void;
}

interface ArtifactNote {
  id: string;
  title: string;
  category: 'code' | 'architecture' | 'spec';
  updatedAt: string;
  content: string;
}

const initialArtifacts: ArtifactNote[] = [
  {
    id: 'art-0',
    title: 'Idempotent Distributed Outbox Architecture (50k req/s)',
    category: 'architecture',
    updatedAt: 'Just now',
    content: `# High-Throughput Idempotent Distributed Outbox Architecture (50,000 req/sec)

================================================================================
1. QUANTITATIVE SIZING & HARDWARE ENVELOPE (50k req/s)
================================================================================

Handling 50,000 requests per second with ACID transactional guarantees and guaranteed message publishing breaks traditional single-node outbox polling patterns (e.g., SELECT ... FOR UPDATE SKIP LOCKED on a single PostgreSQL instance collapses under lock contention and vacuum bloat above ~5k–8k writes/sec).

Key Metrics:
• Ingress Throughput:   50,000 requests/sec
• Payload Size (avg):   1.2 KB (business state + event envelope)
• Network Ingress:      60 MB/sec (~480 Mbps)
• Daily Ingestion:      4.32 Billion events/day (~5.18 TB/day uncompressed)
• Storage Write Rate:   100,000 writes/sec (50k domain entity writes + 50k outbox records)
• Kafka Partitions:     128 to 256 partitions (yielding ~200–400 msg/sec per partition)
• Target Latencies:     Ingress p99 < 35ms; Outbox-to-Broker publish lag p99 < 250ms

Infrastructure Envelope:
• Database Tier: 8 to 16 PostgreSQL shards (Citrus / hash-partitioned instances) on NVMe SSDs (IOPS > 35,000 each)
• Caching Tier: Redis Cluster (16 master nodes, memory 64GB each, multi-threaded I/O)
• CDC Engine: Debezium / PgOutput cluster streaming WAL entries directly into Apache Kafka
• Broker Tier: Kafka Cluster (6-9 brokers, NVMe storage, replication factor 3, min.insync.replicas=2)

================================================================================
2. END-TO-END ARCHITECTURE DIAGRAM
================================================================================

[ Clients / Mobile / Partner Gateways ]
                   │
                   │  1. HTTPS POST + Idempotency-Key: <UUIDv4>
                   ▼
┌────────────────────────────────────────────────────────┐
│          API Gateway / Ingress Cluster                 │
│  • TLS Termination & Envoy Edge Rate Limiting          │
│  • SHA-256 Payload Fingerprinting (Collision Defense)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │  2. Atomic Lease & Fast-Dedup Window
                           ▼
┌────────────────────────────────────────────────────────┐
│        Redis Cluster (Tier-1 Dedup Cache)              │
│  Key: idemp:{tenant}:{key}                             │
│  TTL: 24h | Status: PENDING / COMMITTED / CACHED_RESP   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │  Cache Miss / Lease Granted
                           ▼
┌────────────────────────────────────────────────────────┐
│        Stateless Worker Services (Go / Rust / Node)    │
│  Consistent Hash Routing by aggregate_id                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │  3. Single Local ACID Transaction
                           ▼
┌────────────────────────────────────────────────────────┐
│   Sharded PostgreSQL Cluster (8-16 Shards)             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Mutation: INSERT/UPDATE business_entity        │  │
│  │ 2. Outbox:   INSERT INTO outbox_events (APPEND)   │  │
│  │ 3. Dedup:    INSERT INTO idempotency_keys (UNIQUE)│  │
│  └──────────────────────────────────────────────────┘  │
│                   │ WAL Commit Log                     │
└───────────────────┼────────────────────────────────────┘
                    │
                    │  4. Zero-Polling Streaming Replication (WAL Tailer)
                    ▼
┌────────────────────────────────────────────────────────┐
│        Debezium CDC Connector / Kafka Connect Cluster  │
│  • Log-Tailing pgoutput Logical Replication            │
│  • Zero SELECT table scan locks                        │
│  • Filter & extract payload, aggregate_id, event_type  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │  5. acks=all, idempotent producer
                           ▼
┌────────────────────────────────────────────────────────┐
│        Apache Kafka Cluster (128-256 Partitions)       │
│  • Topic: events.domain.mutations                      │
│  • Partition Key: MurmurHash3(aggregate_id)            │
│  • Compression: LZ4 / ZSTD batch buffer                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │  6. Consumer Groups with Dedup Fencing
                           ▼
┌────────────────────────────────────────────────────────┐
│        Downstream Consumers / Projection Stores        │
│  • Event-level deduplication via unique constraint     │
│  • Exactly-once business semantics                     │
└────────────────────────────────────────────────────────┘

================================================================================
3. CORE ARCHITECTURAL PILLARS
================================================================================

1. Never Use SQL Polling:
   Traditional 'SELECT ... FOR UPDATE SKIP LOCKED' triggers massive lock contention,
   row locks, and PostgreSQL MVCC dead-tuple bloat. We replace polling entirely with
   WAL (Write-Ahead-Log) logical replication tailing via pgoutput / Debezium.

2. Never UPDATE Outbox Rows:
   Never run UPDATE outbox SET status = 'PUBLISHED'. In a high-throughput system
   generating 50,000 writes/sec, updating rows doubles random I/O write amplification
   and exhausts autovacuum workers. Outbox is strictly APPEND-ONLY partitioned by time
   (hourly/daily). Old partitions are dropped instantly via DDL 'DROP TABLE' (zero vacuum).

3. Partition by Aggregate / Entity Key:
   Order is guaranteed per aggregate without global bottleneck. Partition key is
   MurmurHash3(aggregate_id), spreading 50k msgs/sec across 128-256 Kafka partitions (~200-400 msgs/sec per partition).

4. Enforce Dual-Layer Idempotency:
   • Layer 1 (Edge/Redis): Sub-millisecond atomic SETNX lease with 24h TTL drops rapid retries.
   • Layer 2 (Database Tier): Durable PRIMARY KEY constraint on idempotency_keys table ensures ACID commit safety even during cache evictions.

================================================================================
4. HIGH-THROUGHPUT DATABASE LAYER (DDL & PARTITIONING)
================================================================================

-- 1. Idempotency Key Ledger (Scoped to Tenant/Shard)
CREATE TABLE idempotency_keys (
    tenant_id          VARCHAR(64) NOT NULL,
    idempotency_key    VARCHAR(128) NOT NULL,
    payload_hash       CHAR(64) NOT NULL,     -- SHA-256 fingerprint
    status             VARCHAR(20) NOT NULL DEFAULT 'COMMITTED',
    response_body      JSONB NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, idempotency_key)
);

-- 2. Append-Only Outbox Table (Range Partitioned by Day/Hour)
CREATE TABLE outbox_events (
    event_id           UUID NOT NULL DEFAULT gen_random_uuid(),
    aggregate_type     VARCHAR(64) NOT NULL,
    aggregate_id       VARCHAR(128) NOT NULL,
    event_type         VARCHAR(64) NOT NULL,
    payload            JSONB NOT NULL,
    metadata           JSONB NOT NULL DEFAULT '{}',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (created_at, event_id)
) PARTITION BY RANGE (created_at);

-- Partition Example:
CREATE TABLE outbox_events_2026_10_13 PARTITION OF outbox_events
    FOR VALUES FROM ('2026-10-13 00:00:00+00') TO ('2026-10-14 00:00:00+00');

-- 3. Logical Replication Publication for CDC
CREATE PUBLICATION outbox_cdc_pub FOR TABLE outbox_events;

================================================================================
5. HIGH-PERFORMANCE CHANGE-DATA-CAPTURE (CDC) TAILER
================================================================================

Debezium PostgreSQL Connector Configuration:
{
  "name": "outbox-cdc-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "plugin.name": "pgoutput",
    "tasks.max": "8",
    "database.hostname": "pg-shard-lb.internal",
    "database.port": "5432",
    "database.user": "cdc_replicator",
    "database.password": "\${file:/secrets/db.properties:cdc_pass}",
    "database.dbname": "production_shard",
    "database.server.name": "outbox_engine",
    "table.include.list": "public.outbox_events",
    "tombstones.on.delete": "false",
    "decimal.handling.mode": "double",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.route.by.field": "aggregate_type",
    "transforms.outbox.route.topic.replacement": "events.\${routedByValue}",
    "transforms.outbox.table.field.event.id": "event_id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.table.field.event.timestamp": "created_at"
  }
}

================================================================================
6. DISTRIBUTED KAFKA PRODUCER & PARTITIONING STRATEGY
================================================================================

Kafka Producer Settings for 50k req/s Zero Data Loss:
• acks = all (Guarantees replication across all in-sync replicas)
• enable.idempotence = true (Prevents producer duplicate dispatches on retry)
• compression.type = lz4 (Optimal CPU-to-compression ratio at high velocity)
• batch.size = 65536 (64 KB batching window)
• linger.ms = 5 (Allows batching of ~250 messages per socket write)
• max.in.flight.requests.per.connection = 5 (Maintains strict ordering with idempotence)
• buffer.memory = 134217728 (128 MB buffer memory per producer process)

Partitioning Strategy:
Partitions count: 256 partitions
Key: aggregate_id (MurmurHash3)
Result: Strict FIFO ordering per customer/entity, seamless linear horizontal scaling.

================================================================================
7. FAILURE MODE MATRIX & DISASTER RECOVERY
================================================================================

Vector 1: Broker Transient Unavailability
• Impact: CDC pipeline lags in memory buffer.
• Recovery: Debezium pauses WAL LSN acknowledgment. PostgreSQL retains WAL segments locally. Once brokers recover, stream catches up at ~120k msgs/sec burst rate.

Vector 2: Redis Dedup Cache Flush / Failover
• Impact: Redis memory evicted or temporary split-brain.
• Recovery: Database Tier-2 uniqueness constraint catches duplicate requests with SQLState 23505 (unique_violation) and returns previously committed result payload.

Vector 3: Poison Pill Payload
• Impact: Serialization / validation error in CDC tailer.
• Recovery: Dead Letter Queue (DLQ) reroute after 3 attempts with full diagnostic envelope (raw hex, stack trace, timestamp), preventing head-of-line blocking.

Vector 4: High Ingress Spikes (>100k req/s)
• Impact: Shard write queue expansion.
• Recovery: Ingress Envoy circuit breakers engage rate limits with HTTP 429 and Retry-After header with exponential jitter.`,
  },
  {
    id: 'art-1',
    title: 'Resilient Drive Resumable Uploader (TypeScript)',
    category: 'code',
    updatedAt: '15m ago',
    content: `/**
 * Resilient Uploader with byte-slice recovery conforming to RFC-7233.
 * Manages exponential backoff with full jitter and Google Drive 308 resumes.
 */
import { createReadStream, statSync } from 'node:fs';
import { request } from 'node:https';

export async function uploadResumableFile(sessionUri: string, filePath: string): Promise<boolean> {
  const totalSize = statSync(filePath).size;
  const CHUNK_SIZE = 256 * 1024; // 256KB chunks
  let offset = 0;

  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize) - 1;
    const chunkLength = end - offset + 1;
    
    // Perform chunk upload with Content-Range header
    // Content-Range: bytes \${offset}-\${end}/\${totalSize}
    offset = end + 1;
  }
  return true;
}`,
  },
  {
    id: 'art-2',
    title: 'Distributed Outbox State Machine Diagram',
    category: 'architecture',
    updatedAt: '1h ago',
    content: `# Distributed Outbox State Machine
1. [Client Mutation] -> [App Server]
2. [App Server] writes payload to [SQLite local WAL table 'outbox']
3. [Background Dispatch Worker] polls 'outbox' status = 'PENDING'
4. Acquire distributed lease on Redis key 'lease:outbox:worker'
5. Post payload to upstream target (Google Drive or PostgreSQL replica)
6. On 200 OK -> Mark status = 'COMMITTED', prune after 7 days
7. On Network Failure / 503 -> Increment attempt, schedule jittered backoff`,
  },
  {
    id: 'art-3',
    title: 'PostgreSQL PgBouncer Connection Optimization Matrix',
    category: 'spec',
    updatedAt: '3h ago',
    content: `[databases]
app_db = host=127.0.0.1 port=5432 dbname=app_production pool_size=50

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = scram-sha-256
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
server_idle_timeout = 600`,
  },
];

export const NotesArtifactsView: React.FC<NotesArtifactsViewProps> = ({
  onOpenExportModal,
  onOpenOutboxDashboard,
  onOpenGoogleSlides,
  onReadingProgressChange,
  onRecordActivity,
}) => {
  const [artifacts, setArtifacts] = useState<ArtifactNote[]>(() => {
    try {
      const stored = localStorage.getItem('logitix_saved_artifacts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customIds = new Set(parsed.map((p: ArtifactNote) => p.id));
          return [...parsed, ...initialArtifacts.filter((a) => !customIds.has(a.id))];
        }
      }
    } catch {}
    return initialArtifacts;
  });

  const [selectedId, setSelectedId] = useState<string>(() => artifacts[0]?.id || 'art-0');
  const selectedNote = artifacts.find((a) => a.id === selectedId) || artifacts[0];
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (onReadingProgressChange && selectedNote) {
      onReadingProgressChange(0, {
        title: selectedNote.title,
        type: 'artifact',
        textContent: selectedNote.content,
        textLength: selectedNote.content.length,
      });
    }
    const container = document.getElementById('artifact-content-container');
    if (container) {
      container.scrollTop = 0;
    }
  }, [selectedId, selectedNote, onReadingProgressChange]);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full px-6 py-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-code text-[11px] text-[#1a146b] font-medium bg-[#e2dfff] px-2 py-0.5 rounded">
            ARTIFACT REPOSITORY
          </span>
          <h1 className="font-headline text-3xl text-[#1a1c1c] mt-1">
            Notes & Generated Artifacts
          </h1>
          <p className="font-body text-xs md:text-sm text-[#474651]">
            Curated code structures, architectural schematics, and synthesized engineering specs.
          </p>
        </div>
        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e2e2e2] hover:bg-[#f3f4f3] text-[#1a1c1c] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Export full session or code artifacts to formatted PDF"
          >
            <span className="material-symbols-outlined text-[16px] text-[#b3261e]">picture_as_pdf</span>
            <span>Export Session PDF</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
        {/* Left Artifact List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#e2e2e2] p-3 flex flex-col max-h-56 lg:max-h-none overflow-y-auto custom-scrollbar space-y-2">
          <div className="text-[11px] font-code uppercase text-[#777682] font-semibold px-2 py-1">
            Available Artifacts ({artifacts.length})
          </div>
          {artifacts.map((art) => (
            <button
              key={art.id}
              onClick={() => setSelectedId(art.id)}
              className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col gap-1 ${
                selectedId === art.id
                  ? 'bg-[#1a146b] text-white shadow-xs'
                  : 'bg-[#f9f9f8] hover:bg-[#e8e8e7] text-[#1a1c1c]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-code px-1.5 py-0.5 rounded uppercase font-semibold ${
                    selectedId === art.id
                      ? 'bg-white/20 text-indigo-100'
                      : 'bg-[#e2dfff] text-[#1a146b]'
                  }`}
                >
                  {art.category}
                </span>
                <span
                  className={`text-[10px] font-code ${
                    selectedId === art.id ? 'text-indigo-200' : 'text-[#777682]'
                  }`}
                >
                  {art.updatedAt}
                </span>
              </div>
              <span className="font-semibold text-xs leading-snug">{art.title}</span>
            </button>
          ))}
        </div>

        {/* Right Artifact Preview Canvas */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e2e2e2] flex flex-col min-h-[500px] lg:min-h-0 overflow-hidden shadow-xs">
          <div className="px-4 sm:px-5 py-3 border-b border-[#e2e2e2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f9f9f8]">
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-[#1a1c1c] truncate">{selectedNote.title}</h2>
              <span className="text-[11px] text-[#777682] font-code block">
                Format: {selectedNote.category.toUpperCase()} • Last updated {selectedNote.updatedAt}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              {onOpenGoogleSlides && (
                <button
                  onClick={() =>
                    onOpenGoogleSlides(
                      `Presentation Blueprint: ${selectedNote.title}`,
                      {
                        slideCount: 5,
                        audience: 'Executive / Board',
                        tone: 'Strategic & Authoritative',
                        theme: 'Modern Indigo',
                        includeMetrics: true,
                        includeArchitecture: true,
                        customConstraints: selectedNote.content.slice(0, 300),
                      }
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  title="Generate a Google Slides presentation deck from this artifact"
                >
                  <span className="material-symbols-outlined text-[16px]">slideshow</span>
                  <span>Create Slides Deck</span>
                </button>
              )}
              {selectedNote.id === 'art-0' && onOpenOutboxDashboard && (
                <button
                  onClick={onOpenOutboxDashboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  title="Open real-time Distributed Outbox Health Dashboard"
                >
                  <span className="material-symbols-outlined text-[16px]">monitoring</span>
                  <span>Live Health Dashboard</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#e2e2e2] text-xs font-medium text-[#1a1c1c] hover:border-[#1a146b] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => {
                  exportCodeSnippetAsPDF({
                    code: selectedNote.content,
                    title: selectedNote.title,
                    language: selectedNote.category === 'code' ? 'typescript' : selectedNote.category,
                    sourceContext: 'Logitix Artifact Repository',
                  });
                  if (onRecordActivity) {
                    onRecordActivity({
                      type: 'pdf',
                      title: 'Exported PDF',
                      description: `Artifact: ${selectedNote.title}`,
                      view: 'notes-artifacts',
                      payload: { artifactId: selectedNote.id },
                      icon: 'picture_as_pdf',
                      badge: 'Artifact PDF',
                      badgeColor: '#ef4444',
                    });
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a146b] text-white text-xs font-semibold hover:bg-indigo-900 transition-all shadow-xs cursor-pointer"
                title="Export this artifact as a formatted PDF file"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          <div
            id="artifact-content-container"
            data-reading-container="true"
            data-reading-title={selectedNote.title}
            data-reading-type="artifact"
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              const maxScroll = scrollHeight - clientHeight;
              const pct = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100))) : 0;
              if (onReadingProgressChange) {
                onReadingProgressChange(pct, {
                  title: selectedNote.title,
                  type: 'artifact',
                  textContent: selectedNote.content,
                  textLength: selectedNote.content.length,
                });
              }
            }}
            className="flex-1 p-5 overflow-y-auto bg-[#1e1e2e] text-[#cdd6f4] font-code text-xs leading-relaxed"
          >
            <pre className="whitespace-pre-wrap">{selectedNote.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
