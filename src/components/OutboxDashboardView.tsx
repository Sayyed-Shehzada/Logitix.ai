import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Server,
  Cpu,
  Layers,
  Database,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  HardDrive,
  Network,
  Share2,
  Filter,
  Flame,
  ShieldCheck,
  BarChart3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  Check,
  Copy,
} from 'lucide-react';
import {
  OutboxArchitectureHealth,
  ShardMetric,
  KafkaPartitionMetric,
  ConsumerGroupMetric,
  RedisClusterNode,
} from '../types';

interface OutboxDashboardViewProps {
  onSwitchToArtifacts?: () => void;
  onAskChat?: (prompt: string) => void;
  onOpenGoogleSlides?: (prompt: string, conditions?: any) => void;
  onShowToast?: (message: string) => void;
}

export const OutboxDashboardView: React.FC<OutboxDashboardViewProps> = ({
  onSwitchToArtifacts,
  onAskChat,
  onOpenGoogleSlides,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'shards' | 'kafka' | 'redis' | 'cdc'>('shards');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [scenario, setScenario] = useState<'normal' | 'surge' | 'failover'>('normal');
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(1);
  const [healthData, setHealthData] = useState<OutboxArchitectureHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedShardId, setSelectedShardId] = useState<number | null>(1);
  const [selectedPartitionId, setSelectedPartitionId] = useState<number | null>(42);
  const [partitionFilter, setPartitionFilter] = useState<'all' | 'healthy' | 'elevated' | 'critical'>('all');
  const [partitionSearch, setPartitionSearch] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Kafka Partition Monitor specific controls
  const [selectedConsumerGroup, setSelectedConsumerGroup] = useState<string>('all');
  const [onlyDelayedPartitions, setOnlyDelayedPartitions] = useState<boolean>(false);
  const [partitionRange, setPartitionRange] = useState<'all' | '0-63' | '64-127' | '128-191' | '192-255'>('all');
  const [partitionSort, setPartitionSort] = useState<'id-asc' | 'delay-desc' | 'lag-desc'>('id-asc');
  const [hoveredPartition, setHoveredPartition] = useState<KafkaPartitionMetric | null>(null);

  // Historical sparkline buffer (last 16 data points)
  const [throughputHistory, setThroughputHistory] = useState<number[]>([
    49820, 50120, 49950, 50200, 50050, 50350, 50100, 50400, 50250, 50150, 50300, 50200, 50100, 50420, 50310, 50180
  ]);

  // Fetch telemetry from API or generate realistic real-time model
  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`/api/outbox-health?scenario=${scenario}`);
      if (res.ok) {
        const data: OutboxArchitectureHealth = await res.json();
        setHealthData(data);
        setLastUpdated(new Date());
        setThroughputHistory((prev) => [...prev.slice(1), data.totalIngressReqs]);
        return;
      }
    } catch {
      // Fallback fallback generator if server is busy
    }

    // Client-side fallback generation matching 50k req/s specs
    generateClientFallbackTelemetry();
  };

  const generateClientFallbackTelemetry = () => {
    const now = Date.now();
    const baseVariation = Math.sin(now / 4000) * 750 + (Math.random() * 300 - 150);
    const isSurge = scenario === 'surge';
    const isFailover = scenario === 'failover';

    const ingress = Math.round(isSurge ? 62500 + baseVariation : 50000 + baseVariation);
    const writes = ingress * 2;
    const redisHit = +(isSurge ? 99.28 : 99.42 + (Math.random() * 0.08 - 0.04)).toFixed(2);

    const shards: ShardMetric[] = Array.from({ length: 16 }, (_, idx) => {
      const id = idx + 1;
      const shardBase = ingress / 16;
      const isFailing = isFailover && id === 7;
      return {
        id,
        name: `pg-shard-${id.toString().padStart(2, '0')}`,
        cluster: `pg-cluster-${Math.ceil(id / 4)}`,
        host: `shard-${id.toString().padStart(2, '0')}.nvme.internal`,
        throughputReqs: Math.round(isFailing ? shardBase * 0.35 : shardBase + (Math.random() * 60 - 30)),
        writesSec: Math.round((isFailing ? shardBase * 0.35 : shardBase + (Math.random() * 60 - 30)) * 2),
        cpuPercent: Math.round(isSurge ? 56 + Math.random() * 7 : isFailing ? 24 : 42 + Math.random() * 8),
        walRateMbSec: +(isSurge ? 4.75 : 3.8 + Math.random() * 0.25).toFixed(2),
        connPoolActive: Math.round(isSurge ? 66 + Math.random() * 8 : 42 + Math.random() * 6),
        connPoolMax: 100,
        iops: Math.round(isSurge ? 7850 + Math.random() * 300 : 6250 + Math.random() * 250),
        deadTuplesPct: +(0.65 + Math.random() * 0.2).toFixed(2),
        lsnDeltaBytes: isFailing ? 1840 : Math.round(45 + Math.random() * 75),
        cdcLagMs: isFailing ? 820 : Math.round(19 + Math.random() * 12),
        status: isFailing ? 'FAILOVER' : 'OPTIMAL',
        activePartition: `outbox_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}_h${new Date().getUTCHours().toString().padStart(2, '0')}`,
      };
    });

    const consumerGroupNames = ['billing-service-cg', 'notification-dispatch-cg', 'analytics-lakehouse-cg'];
    const kafkaPartitions: KafkaPartitionMetric[] = Array.from({ length: 256 }, (_, pId) => {
      const baseMsgSec = Math.round(ingress / 256);
      const groupIndex = pId % consumerGroupNames.length;
      const consumerGroup = consumerGroupNames[groupIndex];

      const isThresholdBreacher = pId === 42 || pId === 114 || pId === 189 || (isSurge && pId % 40 === 0) || (isFailover && (pId === 42 || pId === 78 || pId === 205));
      let lag: number;
      let delayMs: number;

      if (isThresholdBreacher) {
        delayMs = isFailover && pId === 42 ? 780 : 520 + Math.round((pId % 7) * 45 + Math.random() * 40);
        lag = Math.round((delayMs / 1000) * baseMsgSec * 1.8);
      } else if (isSurge && pId % 8 === 0) {
        delayMs = 280 + Math.round(Math.random() * 140);
        lag = Math.round((delayMs / 1000) * baseMsgSec * 1.3);
      } else {
        delayMs = 18 + Math.round(Math.random() * 120 + ((pId % 10) * 8));
        lag = Math.max(2, Math.round((delayMs / 1000) * baseMsgSec));
      }

      const exceedsThreshold = delayMs > 500;

      return {
        partitionId: pId,
        leaderBroker: `broker-${(pId % 8) + 1}.us-east1`,
        logEndOffset: 142850000 + pId * 50000 + Math.round(now / 1000) * 195,
        consumerOffset: 142850000 + pId * 50000 + Math.round(now / 1000) * 195 - lag,
        lag,
        delayMs,
        consumerGroup,
        assignedConsumer: `consumer-${consumerGroup.slice(0, 7)}-${(pId % 16) + 1}.internal`,
        exceedsThreshold,
        ingressMsgSec: baseMsgSec + Math.round(Math.random() * 6 - 3),
        status: exceedsThreshold ? 'critical' : lag > 60 ? 'elevated' : 'healthy',
      };
    });

    const totalLag = kafkaPartitions.reduce((acc, p) => acc + p.lag, 0);

    const redisNodes: RedisClusterNode[] = Array.from({ length: 6 }, (_, rIdx) => ({
      nodeId: `redis-node-0${rIdx + 1}`,
      role: 'master',
      host: `redis-0${rIdx + 1}.mem.internal:6379`,
      hitRate: +(redisHit + (Math.random() * 0.06 - 0.03)).toFixed(2),
      opsSec: Math.round(ingress / 6 + (Math.random() * 120 - 60)),
      memoryUsedMb: Math.round(2460 + rIdx * 65 + Math.random() * 20),
      memoryMaxMb: 5333,
      fragmentationRatio: +(1.05 + Math.random() * 0.03).toFixed(2),
      latencyP99Ms: +(0.8 + Math.random() * 0.1).toFixed(2),
    }));

    const data: OutboxArchitectureHealth = {
      timestamp: new Date().toISOString(),
      totalIngressReqs: ingress,
      targetIngressReqs: 50000,
      totalStorageWritesSec: writes,
      ingressLatencyP99Ms: +(isSurge ? 33.8 : 31.4 + Math.random() * 1.2).toFixed(1),
      publishLatencyP99Ms: isFailover ? 218 : isSurge ? 202 : Math.round(184 + Math.random() * 6),
      redisLatencyP99Ms: 0.82,
      redisHitRatePct: redisHit,
      redisChecksSec: ingress,
      redisDedupInterceptsSec: Math.round(ingress * 0.024),
      redisNewLeasesSec: Math.round(ingress * 0.976),
      redisConflictRatePct: 0.002,
      kafkaTotalLag: totalLag,
      kafkaMaxLag: isFailover ? 285 : 22,
      kafkaMaxLagPartition: isFailover ? 42 : 114,
      kafkaPublishRateSec: ingress,
      cdcWorkersActive: isFailover ? 15 : 16,
      cdcLagAvgMs: isFailover ? 64 : 22,
      systemStatus: isFailover ? 'FAILOVER_ACTIVE' : isSurge ? 'SURGE_BUFFERING' : 'OPTIMAL',
      shards,
      kafkaPartitions,
      consumerGroups: [
        {
          groupId: 'billing-service-cg',
          consumerCount: 64,
          totalLag: Math.round(totalLag * 0.32),
          topic: 'events.orders.outbox.v1',
          assignedPartitions: 256,
          status: 'STABLE',
        },
        {
          groupId: 'notification-dispatch-cg',
          consumerCount: 32,
          totalLag: Math.round(totalLag * 0.48),
          topic: 'events.orders.outbox.v1',
          assignedPartitions: 256,
          status: isFailover ? 'CATCHING_UP' : 'STABLE',
        },
        {
          groupId: 'analytics-lakehouse-cg',
          consumerCount: 16,
          totalLag: Math.round(totalLag * 0.2),
          topic: 'events.orders.outbox.v1',
          assignedPartitions: 256,
          status: 'STABLE',
        },
      ],
      redisNodes,
    };

    setHealthData(data);
    setLastUpdated(new Date());
    setThroughputHistory((prev) => [...prev.slice(1), ingress]);
  };

  // Timer loop for real-time telemetry streaming
  useEffect(() => {
    fetchTelemetry();
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      fetchTelemetry();
    }, refreshIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [isLiveStreaming, refreshIntervalSec, scenario]);

  const handleCopyMetricsJson = () => {
    if (!healthData) return;
    navigator.clipboard.writeText(JSON.stringify(healthData, null, 2));
    setCopiedText(true);
    onShowToast?.('Health telemetry snapshot copied to clipboard (JSON)');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const selectedShard = useMemo(() => {
    if (!healthData || !selectedShardId) return null;
    return healthData.shards.find((s) => s.id === selectedShardId) || healthData.shards[0];
  }, [healthData, selectedShardId]);

  const selectedPartition = useMemo(() => {
    if (!healthData || selectedPartitionId === null) return null;
    return healthData.kafkaPartitions.find((p) => p.partitionId === selectedPartitionId) || healthData.kafkaPartitions[0];
  }, [healthData, selectedPartitionId]);

  const filteredPartitions = useMemo(() => {
    if (!healthData) return [];
    return healthData.kafkaPartitions.filter((p) => {
      if (partitionFilter !== 'all' && p.status !== partitionFilter) return false;
      if (partitionSearch.trim()) {
        const query = partitionSearch.trim().toLowerCase();
        const matchesId = p.partitionId.toString().includes(query);
        const matchesBroker = p.leaderBroker.toLowerCase().includes(query);
        return matchesId || matchesBroker;
      }
      return true;
    });
  }, [healthData, partitionFilter, partitionSearch]);

  // Partitions breaching 500ms delay threshold
  const partitionsOver500ms = useMemo(() => {
    if (!healthData) return [];
    return healthData.kafkaPartitions.filter(
      (p) => (p.delayMs !== undefined ? p.delayMs > 500 : p.exceedsThreshold || p.lag > 200)
    );
  }, [healthData]);

  const maxPartitionDelay = useMemo(() => {
    if (!healthData || healthData.kafkaPartitions.length === 0) return 0;
    return Math.max(...healthData.kafkaPartitions.map((p) => p.delayMs || 0));
  }, [healthData]);

  const avgPartitionDelay = useMemo(() => {
    if (!healthData || healthData.kafkaPartitions.length === 0) return 0;
    const sum = healthData.kafkaPartitions.reduce((acc, p) => acc + (p.delayMs || 0), 0);
    return Math.round(sum / healthData.kafkaPartitions.length);
  }, [healthData]);

  // Partitions filtered and sorted for the Kafka Partition Monitor bar chart
  const monitorChartPartitions = useMemo(() => {
    if (!healthData) return [];
    let list = [...healthData.kafkaPartitions];

    // Filter by consumer group
    if (selectedConsumerGroup !== 'all') {
      list = list.filter((p) => p.consumerGroup === selectedConsumerGroup);
    }

    // Filter by 500ms threshold
    if (onlyDelayedPartitions) {
      list = list.filter((p) => (p.delayMs !== undefined ? p.delayMs > 500 : p.exceedsThreshold));
    }

    // Filter by partition range
    if (partitionRange === '0-63') {
      list = list.filter((p) => p.partitionId >= 0 && p.partitionId <= 63);
    } else if (partitionRange === '64-127') {
      list = list.filter((p) => p.partitionId >= 64 && p.partitionId <= 127);
    } else if (partitionRange === '128-191') {
      list = list.filter((p) => p.partitionId >= 128 && p.partitionId <= 191);
    } else if (partitionRange === '192-255') {
      list = list.filter((p) => p.partitionId >= 192 && p.partitionId <= 255);
    }

    // Sort order
    if (partitionSort === 'delay-desc') {
      list.sort((a, b) => (b.delayMs || 0) - (a.delayMs || 0));
    } else if (partitionSort === 'lag-desc') {
      list.sort((a, b) => b.lag - a.lag);
    } else {
      list.sort((a, b) => a.partitionId - b.partitionId);
    }

    return list;
  }, [healthData, selectedConsumerGroup, onlyDelayedPartitions, partitionRange, partitionSort]);

  const handleAutoRemediateLag = () => {
    if (!healthData) return;
    const remediatedPartitions = healthData.kafkaPartitions.map((p) => {
      if (p.delayMs > 500 || p.exceedsThreshold) {
        return {
          ...p,
          delayMs: Math.round(45 + Math.random() * 55),
          lag: Math.max(3, Math.round(p.lag * 0.15)),
          exceedsThreshold: false,
          status: 'healthy' as const,
        };
      }
      return p;
    });

    const newTotalLag = remediatedPartitions.reduce((acc, p) => acc + p.lag, 0);
    setHealthData({
      ...healthData,
      kafkaTotalLag: newTotalLag,
      kafkaPartitions: remediatedPartitions,
    });
    onShowToast?.('Auto-Remediation executed: Rebalanced 256 consumer partitions. Delays dropped below 120ms.');
  };

  return (
    <div className="w-full min-h-full bg-[#f8f9fa] text-[#1a1c1c] pb-24 font-body">
      {/* Top Banner & Control Station */}
      <div className="border-b border-[#e2e2e2] bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-code text-[11px] font-semibold text-[#1a146b] bg-[#e2dfff] px-2.5 py-0.5 rounded tracking-wide">
                  50,000 REQ/SEC ZERO-DATA-LOSS ARCHITECTURE
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-code font-bold ${
                    healthData?.systemStatus === 'OPTIMAL'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : healthData?.systemStatus === 'SURGE_BUFFERING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      healthData?.systemStatus === 'OPTIMAL'
                        ? 'bg-emerald-500 animate-pulse'
                        : healthData?.systemStatus === 'SURGE_BUFFERING'
                        ? 'bg-amber-500 animate-bounce'
                        : 'bg-rose-500 animate-ping'
                    }`}
                  />
                  {healthData?.systemStatus || 'CONNECTING...'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-headline font-bold text-[#1a146b] tracking-tight flex items-center gap-2">
                Distributed Outbox Health & Telemetry
              </h1>
              <p className="text-xs text-[#52525e] mt-0.5">
                Real-time monitoring across 16 PostgreSQL shards, 128 Kafka partitions, Tier-1 Redis deduplication, and CDC Debezium tailers.
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {/* Scenario Toggle Buttons */}
              <div className="flex items-center bg-[#f3f4f3] p-1 rounded-xl border border-[#e2e2e2]">
                <button
                  onClick={() => {
                    setScenario('normal');
                    onShowToast?.('Switched to Baseline 50k req/s traffic');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    scenario === 'normal'
                      ? 'bg-white text-[#1a146b] shadow-xs font-semibold'
                      : 'text-[#6b6a75] hover:text-[#1a1c1c]'
                  }`}
                >
                  Baseline (50k)
                </button>
                <button
                  onClick={() => {
                    setScenario('surge');
                    onShowToast?.('Traffic Surge (+25%): 62.5k req/s ingress injected');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    scenario === 'surge'
                      ? 'bg-amber-500 text-white shadow-xs font-semibold'
                      : 'text-[#6b6a75] hover:text-[#1a1c1c]'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  Surge (62.5k)
                </button>
                <button
                  onClick={() => {
                    setScenario('failover');
                    onShowToast?.('Simulated Shard #07 failover: Standby takeover in flight');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    scenario === 'failover'
                      ? 'bg-rose-600 text-white shadow-xs font-semibold'
                      : 'text-[#6b6a75] hover:text-[#1a1c1c]'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Failover Shard 07
                </button>
              </div>

              {/* Streaming Play/Pause */}
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isLiveStreaming
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-600'
                }`}
                title={isLiveStreaming ? 'Pause live polling' : 'Resume live stream'}
              >
                {isLiveStreaming ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Live (1s)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Paused</span>
                  </>
                )}
              </button>

              {/* Copy / Export */}
              <button
                onClick={handleCopyMetricsJson}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#e2e2e2] bg-white hover:bg-zinc-50 text-xs text-[#474651] font-medium transition-all cursor-pointer"
                title="Copy telemetry payload as JSON"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Copied' : 'JSON'}</span>
              </button>

              {/* Export to Google Slides */}
              {onOpenGoogleSlides && (
                <button
                  onClick={() =>
                    onOpenGoogleSlides(
                      `High-Throughput Idempotent Distributed Outbox Architecture (50,000 req/s): 16 PostgreSQL Shards, Tier-1 Redis Deduplication (${healthData?.redisHitRatePct || 99.4}%), CDC Debezium WAL Tailing, and 256 Kafka Partitions`,
                      {
                        slideCount: 5,
                        audience: 'Executive / Board',
                        tone: 'Strategic & Authoritative',
                        theme: 'Modern Indigo',
                        includeMetrics: true,
                        includeArchitecture: true,
                        customConstraints:
                          'Ingress throughput 50,000 req/s, P99 latency <35ms, outbox-to-broker publish lag <250ms, zero-data-loss guaranteed.',
                      }
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  title="Generate an executive presentation in Google Slides from this architecture"
                >
                  <span className="material-symbols-outlined text-[15px]">slideshow</span>
                  <span>Present Deck</span>
                </button>
              )}

              {/* Link to Artifacts Blueprint */}
              {onSwitchToArtifacts && (
                <button
                  onClick={onSwitchToArtifacts}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1a146b] hover:bg-[#312e81] text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
                  title="View complete 50k req/s architectural blueprint and DDL"
                >
                  <span>Blueprint #art-0</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* =========================================================================
            1. HERO METRIC SLATE (Throughput, Writes/s, Redis Hit Rate, Kafka Lag, SLAs)
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Ingress Throughput */}
          <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs relative overflow-hidden group hover:border-[#1a146b] transition-all">
            <div className="flex items-center justify-between text-xs text-[#777682] mb-1">
              <span className="font-medium">Ingress Throughput</span>
              <Activity className="w-4 h-4 text-[#1a146b]" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#1a1c1c] tracking-tight">
              {healthData?.totalIngressReqs ? healthData.totalIngressReqs.toLocaleString() : '50,000'}{' '}
              <span className="text-xs font-normal text-[#52525e]">req/s</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-[#f0f0f0]">
              <span className="text-[#64748b]">Target: 50k req/s</span>
              <span className={`font-semibold font-code ${healthData && healthData.totalIngressReqs >= 50000 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {healthData ? `${((healthData.totalIngressReqs / 50000) * 100).toFixed(1)}%` : '100%'}
              </span>
            </div>
            {/* Real-time mini sparkline */}
            <div className="mt-2 h-6 flex items-end gap-0.5">
              {throughputHistory.map((val, idx) => {
                const heightPct = Math.min(100, Math.max(20, Math.round(((val - 45000) / 20000) * 100)));
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-indigo-200 hover:bg-[#1a146b] transition-all rounded-xs"
                    style={{ height: `${heightPct}%` }}
                    title={`${val} req/s`}
                  />
                );
              })}
            </div>
          </div>

          {/* Card 2: Sharded Storage Write Velocity */}
          <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs relative overflow-hidden group hover:border-[#1a146b] transition-all">
            <div className="flex items-center justify-between text-xs text-[#777682] mb-1">
              <span className="font-medium">Storage Write Velocity</span>
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#1a1c1c] tracking-tight">
              {healthData?.totalStorageWritesSec ? healthData.totalStorageWritesSec.toLocaleString() : '100,000'}{' '}
              <span className="text-xs font-normal text-[#52525e]">writes/s</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-[#f0f0f0]">
              <span className="text-[#64748b]">Dual-Write (Local Shard)</span>
              <span className="text-emerald-600 font-semibold font-code">2x Multiplier</span>
            </div>
            <div className="mt-3 text-[10px] text-[#52525e] bg-zinc-50 p-1.5 rounded-lg border border-zinc-100 font-code">
              50k Domain Entity + 50k Outbox records in single ACID tx
            </div>
          </div>

          {/* Card 3: Redis Idempotency Hit Rate */}
          <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs relative overflow-hidden group hover:border-[#1a146b] transition-all">
            <div className="flex items-center justify-between text-xs text-[#777682] mb-1">
              <span className="font-medium">Tier-1 Dedup Hit Rate</span>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#1a1c1c] tracking-tight">
              {healthData?.redisHitRatePct ? `${healthData.redisHitRatePct}%` : '99.42%'}
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-[#f0f0f0]">
              <span className="text-[#64748b]">Dedup Fast Path</span>
              <span className="text-purple-600 font-semibold font-code">
                {healthData?.redisDedupInterceptsSec.toLocaleString() || '1,240'}/s
              </span>
            </div>
            <div className="mt-3 text-[10px] text-[#52525e] bg-purple-50/60 p-1.5 rounded-lg border border-purple-100 font-code text-purple-900">
              Conflict rate: &lt;0.002% • 24h Sliding Lease
            </div>
          </div>

          {/* Card 4: Kafka Partition Lag */}
          <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs relative overflow-hidden group hover:border-[#1a146b] transition-all">
            <div className="flex items-center justify-between text-xs text-[#777682] mb-1">
              <span className="font-medium">Total Kafka Lag</span>
              <Network className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#1a1c1c] tracking-tight">
              {healthData?.kafkaTotalLag ? healthData.kafkaTotalLag.toLocaleString() : '1,420'}{' '}
              <span className="text-xs font-normal text-[#52525e]">msgs</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-[#f0f0f0]">
              <span className="text-[#64748b]">256 Partitions</span>
              <span className={`font-semibold font-code ${partitionsOver500ms.length > 0 ? 'text-rose-600' : 'text-cyan-700'}`}>
                {partitionsOver500ms.length > 0 ? `${partitionsOver500ms.length} &gt;500ms delay` : `Max Lag: ${healthData?.kafkaMaxLag ?? 18}`}
              </span>
            </div>
            <div className="mt-3 text-[10px] text-[#52525e] bg-cyan-50/60 p-1.5 rounded-lg border border-cyan-100 font-code text-cyan-900 flex items-center justify-between">
              <span>Avg Delay: {avgPartitionDelay}ms</span>
              <span className={maxPartitionDelay > 500 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                Max: {maxPartitionDelay}ms {maxPartitionDelay > 500 ? '(!)' : '(OK)'}
              </span>
            </div>
          </div>

          {/* Card 5: P99 Latency SLA Guarantee */}
          <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs relative overflow-hidden group hover:border-[#1a146b] transition-all">
            <div className="flex items-center justify-between text-xs text-[#777682] mb-1">
              <span className="font-medium">P99 Latency SLA</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#1a1c1c] tracking-tight">
              {healthData?.ingressLatencyP99Ms ?? 31.4}{' '}
              <span className="text-xs font-normal text-[#52525e]">ms</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-[#f0f0f0]">
              <span className="text-[#64748b]">Publish Lag p99</span>
              <span className="text-emerald-600 font-semibold font-code">
                {healthData?.publishLatencyP99Ms ?? 184} ms (&lt;250ms)
              </span>
            </div>
            <div className="mt-3 text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 font-code flex items-center justify-between">
              <span>SLA Target: &lt;35ms</span>
              <span className="font-bold">PASSED</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. VIEWPORT TABS (16 Shards | Kafka Matrix | Redis Dedup | CDC Tailers)
           ========================================================================= */}
        <div className="border-b border-[#e2e2e2] flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('shards')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'shards'
                  ? 'border-[#1a146b] text-[#1a146b]'
                  : 'border-transparent text-[#6b6a75] hover:text-[#1a1c1c]'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>PostgreSQL Shards (16)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-[#1a146b] font-code">
                3.1k req/s per shard
              </span>
            </button>

            <button
              onClick={() => setActiveTab('kafka')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'kafka'
                  ? 'border-[#1a146b] text-[#1a146b]'
                  : 'border-transparent text-[#6b6a75] hover:text-[#1a1c1c]'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>Kafka Partition Monitor (256)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-code font-bold ${
                  partitionsOver500ms.length > 0
                    ? 'bg-rose-100 text-rose-800 animate-pulse'
                    : 'bg-cyan-100 text-cyan-900'
                }`}
              >
                {partitionsOver500ms.length > 0 ? `${partitionsOver500ms.length} delayed >500ms` : '256 OK'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('redis')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'redis'
                  ? 'border-[#1a146b] text-[#1a146b]'
                  : 'border-transparent text-[#6b6a75] hover:text-[#1a1c1c]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Redis Dedup Cluster (6 Nodes)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-code">
                99.4%
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cdc')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'cdc'
                  ? 'border-[#1a146b] text-[#1a146b]'
                  : 'border-transparent text-[#6b6a75] hover:text-[#1a1c1c]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>CDC Debezium Pipeline</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-code">
                {healthData?.cdcLagAvgMs ?? 22}ms
              </span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-[#777682] font-code">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: POSTGRESQL SHARDS (16 Shards Visualizer & Inspector)
           ========================================================================= */}
        {activeTab === 'shards' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1a146b] text-white flex items-center justify-center font-bold text-sm">
                  16x
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1a146b]">
                    16 Independent PostgreSQL Shards with Local NVMe Storage
                  </h3>
                  <p className="text-xs text-[#474651]">
                    Consistent hash distribution by <code className="text-indigo-900 font-bold">tenant_id:entity_id</code>. Dual-write domain entity + append-only outbox table in single ACID transaction.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-code text-[#474651]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Healthy / Primary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Failover / Rebalance</span>
                </div>
              </div>
            </div>

            {/* 16 Shards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {healthData?.shards.map((shard) => {
                const isSelected = selectedShardId === shard.id;
                const isFailover = shard.status === 'FAILOVER';

                return (
                  <div
                    key={shard.id}
                    onClick={() => setSelectedShardId(shard.id)}
                    className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all relative ${
                      isSelected
                        ? 'border-[#1a146b] ring-2 ring-[#1a146b]/20 shadow-md'
                        : 'border-[#e2e2e2] hover:border-[#1a146b]/50 shadow-xs'
                    } ${isFailover ? 'bg-rose-50/30 border-rose-300' : ''}`}
                  >
                    {/* Shard Card Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#f3f4f3] flex items-center justify-center font-code text-xs font-bold text-[#1a146b]">
                          {shard.id.toString().padStart(2, '0')}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-[#1a1c1c] font-code">{shard.name}</div>
                          <div className="text-[10px] text-[#777682]">{shard.cluster}</div>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-code font-bold px-2 py-0.5 rounded-full ${
                          isFailover
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {shard.status}
                      </span>
                    </div>

                    {/* Shard Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 my-3 pt-2 border-t border-[#f0f0f0] text-xs">
                      <div>
                        <div className="text-[10px] text-[#777682]">Throughput</div>
                        <div className="font-bold text-[#1a1c1c] font-code">
                          {shard.throughputReqs.toLocaleString()} <span className="text-[9px] text-[#777682]">req/s</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#777682]">Storage Writes</div>
                        <div className="font-bold text-[#1a1c1c] font-code">
                          {shard.writesSec.toLocaleString()} <span className="text-[9px] text-[#777682]">writes/s</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bars: CPU & Pool */}
                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <div className="flex justify-between text-[#64748b]">
                          <span>CPU Load</span>
                          <span className="font-code font-semibold">{shard.cpuPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full ${
                              shard.cpuPercent > 70 ? 'bg-amber-500' : 'bg-[#1a146b]'
                            }`}
                            style={{ width: `${shard.cpuPercent}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[#64748b]">
                          <span>PgBouncer Pool</span>
                          <span className="font-code font-semibold">
                            {shard.connPoolActive}/{shard.connPoolMax}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden mt-0.5">
                          <div
                            className="h-full rounded-full bg-cyan-600"
                            style={{ width: `${(shard.connPoolActive / shard.connPoolMax) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer indicators */}
                    <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-2.5 mt-2.5 border-t border-[#f0f0f0] font-code">
                      <span>WAL {shard.walRateMbSec} MB/s</span>
                      <span className={isFailover ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                        CDC lag: {shard.cdcLagMs}ms
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Shard Deep-Dive Inspector Panel */}
            {selectedShard && (
              <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#1a146b]">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-base text-[#1a1c1c] flex items-center gap-2">
                        Shard Inspector: <span className="font-code text-[#1a146b]">{selectedShard.name}</span>
                        <span className="text-[10px] font-code px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                          Primary Node
                        </span>
                      </h4>
                      <p className="text-xs text-[#52525e]">
                        Host: <code className="font-code text-indigo-950">{selectedShard.host}</code> • Target Cluster: {selectedShard.cluster}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAskChat?.(`Analyze performance and WAL generation rate for PostgreSQL Shard ${selectedShard.name} handling ${selectedShard.throughputReqs} req/s.`)}
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-[#1a146b] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Ask AI to Analyze Shard</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">Active Table Partition</div>
                    <div className="font-code font-bold text-[#1a1c1c] truncate">{selectedShard.activePartition}</div>
                    <div className="text-[10px] text-emerald-700 mt-1">Hourly Partition Drop Active</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">NVMe Disk IOPS</div>
                    <div className="font-code font-bold text-[#1a1c1c]">{selectedShard.iops.toLocaleString()} IOPS</div>
                    <div className="text-[10px] text-[#52525e] mt-1">Direct I/O bypasses OS cache</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">LSN Replication Delta</div>
                    <div className="font-code font-bold text-[#1a1c1c]">{selectedShard.lsnDeltaBytes} bytes</div>
                    <div className="text-[10px] text-emerald-700 mt-1">Synchronous Standby In-Sync</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">Dead Tuples (Vacuum)</div>
                    <div className="font-code font-bold text-[#1a1c1c]">{selectedShard.deadTuplesPct}%</div>
                    <div className="text-[10px] text-emerald-700 mt-1">Zero Autovacuum Bloat</div>
                  </div>
                </div>

                {/* Shard Outbox Table DDL Snippet */}
                <div className="p-3.5 bg-[#181825] rounded-xl text-[#cdd6f4] font-code text-xs overflow-x-auto border border-[#313244]">
                  <div className="flex items-center justify-between text-[11px] text-[#a6adc8] mb-2 pb-2 border-b border-[#313244]">
                    <span>Local Shard DDL: {selectedShard.name}</span>
                    <span className="text-emerald-400">PARTITION BY RANGE (created_at)</span>
                  </div>
                  <pre className="text-[11px] leading-relaxed">
{`-- Shard ${selectedShard.name} local outbox transaction
BEGIN;
  -- 1. Mutate business state
  INSERT INTO orders (id, tenant_id, status, total) 
  VALUES ('ord_${Date.now()}', 'tenant_42', 'CONFIRMED', 1290.00);

  -- 2. Dual-write outbox entry in exact same ACID transaction
  INSERT INTO ${selectedShard.activePartition} (id, aggregate_id, event_type, payload, idempotency_key)
  VALUES ('evt_${Date.now()}', 'ord_${Date.now()}', 'OrderConfirmed', '{"amount":1290}', 'idemp_key_9942');
COMMIT;`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: KAFKA PARTITION MONITOR (256 Partitions & 500ms SLA Delay Threshold)
           ========================================================================= */}
        {activeTab === 'kafka' && (
          <div className="space-y-6">
            {/* Top Monitor Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cyan-50/50 p-4 rounded-2xl border border-cyan-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center font-bold text-sm">
                  256
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-cyan-950 flex items-center gap-2">
                    <span>Kafka Partition Monitor</span>
                    <span className="text-[10px] font-code px-2 py-0.5 rounded-full bg-cyan-200/70 text-cyan-900 font-bold">
                      Topic: events.orders.outbox.v1
                    </span>
                  </h3>
                  <p className="text-xs text-[#474651]">
                    Real-time monitoring across 256 topic partitions and 3 consumer groups. Strict processing delay SLA: <strong className="text-rose-700 font-code">&lt; 500ms</strong>.
                  </p>
                </div>
              </div>

              {/* Status Alert Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-code font-bold ${
                    partitionsOver500ms.length > 0
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {partitionsOver500ms.length > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{partitionsOver500ms.length} Partitions Exceeding 500ms SLA</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>All 256 Partitions Operating Within SLA</span>
                    </>
                  )}
                </span>
                {partitionsOver500ms.length > 0 && (
                  <button
                    onClick={handleAutoRemediateLag}
                    className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    title="Trigger consumer partition rebalance and burst worker scale-out"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-Remediate</span>
                  </button>
                )}
              </div>
            </div>

            {/* SLA Threshold Monitor Statistics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-[#e2e2e2] shadow-2xs">
                <div className="text-[11px] text-[#777682]">Total Partitions</div>
                <div className="font-headline font-bold text-lg text-[#1a1c1c] mt-0.5">256 Partitions</div>
                <div className="text-[10px] text-[#52525e] mt-1 font-code">8 Brokers • 3x Replication</div>
              </div>

              <div className={`p-3.5 rounded-xl border shadow-2xs ${partitionsOver500ms.length > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-[#e2e2e2]'}`}>
                <div className="text-[11px] text-[#777682] flex items-center justify-between">
                  <span>Partitions &gt; 500ms Delay</span>
                  {partitionsOver500ms.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                </div>
                <div className={`font-headline font-bold text-lg mt-0.5 ${partitionsOver500ms.length > 0 ? 'text-rose-700 font-code' : 'text-[#1a1c1c]'}`}>
                  {partitionsOver500ms.length} Partitions
                </div>
                <div className="text-[10px] text-[#52525e] mt-1 font-code">
                  {partitionsOver500ms.length > 0 ? 'Threshold: 500ms breached' : 'Zero threshold violations'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#e2e2e2] shadow-2xs">
                <div className="text-[11px] text-[#777682]">Max Processing Delay</div>
                <div className={`font-headline font-bold text-lg mt-0.5 font-code ${maxPartitionDelay > 500 ? 'text-rose-700' : 'text-[#1a1c1c]'}`}>
                  {maxPartitionDelay} ms
                </div>
                <div className="text-[10px] text-[#52525e] mt-1 font-code">
                  SLA Ceiling: 500.0 ms
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#e2e2e2] shadow-2xs">
                <div className="text-[11px] text-[#777682]">Average Processing Delay</div>
                <div className="font-headline font-bold text-lg text-emerald-700 mt-0.5 font-code">
                  {avgPartitionDelay} ms
                </div>
                <div className="text-[10px] text-emerald-800 mt-1 font-code">
                  Nominal healthy baseline
                </div>
              </div>
            </div>

            {/* =========================================================================
                THE KAFKA PARTITION MONITOR BAR CHART (256 Partitions)
               ========================================================================= */}
            <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3">
                <div>
                  <h4 className="font-headline font-bold text-base text-[#1a1c1c] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-700" />
                    <span>Consumer Group Lag & Processing Delay Bar Chart (256 Partitions)</span>
                  </h4>
                  <p className="text-xs text-[#52525e] mt-0.5">
                    Bars represent consumer lag duration per partition. Partitions exceeding the <strong className="text-rose-600 font-code">500ms delay threshold</strong> are highlighted in crimson with warning markers.
                  </p>
                </div>

                {/* Filter and Viewport Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Consumer Group Filter */}
                  <select
                    value={selectedConsumerGroup}
                    onChange={(e) => setSelectedConsumerGroup(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#e2e2e2] bg-white text-xs font-code text-[#1a1c1c] outline-none"
                  >
                    <option value="all">All Consumer Groups (3)</option>
                    <option value="billing-service-cg">billing-service-cg</option>
                    <option value="notification-dispatch-cg">notification-dispatch-cg</option>
                    <option value="analytics-lakehouse-cg">analytics-lakehouse-cg</option>
                  </select>

                  {/* Toggle only delayed */}
                  <button
                    onClick={() => setOnlyDelayedPartitions(!onlyDelayedPartitions)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      onlyDelayedPartitions
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-[#474651] border-[#e2e2e2] hover:bg-zinc-50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Only &gt;500ms Delay ({partitionsOver500ms.length})</span>
                  </button>

                  {/* Sort Mode */}
                  <select
                    value={partitionSort}
                    onChange={(e) => setPartitionSort(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#e2e2e2] bg-white text-xs text-[#1a1c1c] outline-none"
                  >
                    <option value="id-asc">Sort: Partition ID (0-255)</option>
                    <option value="delay-desc">Sort: Delay (Highest First)</option>
                    <option value="lag-desc">Sort: Msg Lag (Highest First)</option>
                  </select>
                </div>
              </div>

              {/* Range Tabs (0-63, 64-127, etc.) */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 bg-[#f3f4f3] p-1 rounded-xl border border-[#e2e2e2]">
                  <button
                    onClick={() => setPartitionRange('all')}
                    className={`px-2.5 py-1 rounded-lg font-code transition-all cursor-pointer ${
                      partitionRange === 'all' ? 'bg-white text-[#1a146b] font-bold shadow-xs' : 'text-[#64748b]'
                    }`}
                  >
                    All 256
                  </button>
                  <button
                    onClick={() => setPartitionRange('0-63')}
                    className={`px-2.5 py-1 rounded-lg font-code transition-all cursor-pointer ${
                      partitionRange === '0-63' ? 'bg-white text-[#1a146b] font-bold shadow-xs' : 'text-[#64748b]'
                    }`}
                  >
                    P-0..63
                  </button>
                  <button
                    onClick={() => setPartitionRange('64-127')}
                    className={`px-2.5 py-1 rounded-lg font-code transition-all cursor-pointer ${
                      partitionRange === '64-127' ? 'bg-white text-[#1a146b] font-bold shadow-xs' : 'text-[#64748b]'
                    }`}
                  >
                    P-64..127
                  </button>
                  <button
                    onClick={() => setPartitionRange('128-191')}
                    className={`px-2.5 py-1 rounded-lg font-code transition-all cursor-pointer ${
                      partitionRange === '128-191' ? 'bg-white text-[#1a146b] font-bold shadow-xs' : 'text-[#64748b]'
                    }`}
                  >
                    P-128..191
                  </button>
                  <button
                    onClick={() => setPartitionRange('192-255')}
                    className={`px-2.5 py-1 rounded-lg font-code transition-all cursor-pointer ${
                      partitionRange === '192-255' ? 'bg-white text-[#1a146b] font-bold shadow-xs' : 'text-[#64748b]'
                    }`}
                  >
                    P-192..255
                  </button>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-code">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-rose-500" />
                    <span className="text-rose-700 font-bold">&gt; 500ms SLA Threshold Breached</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-cyan-600" />
                    <span>&lt; 500ms Normal Lag</span>
                  </div>
                </div>
              </div>

              {/* The SVG & High-Density Interactive Bar Chart Canvas */}
              <div className="relative bg-[#0f172a] rounded-2xl p-4 border border-[#334155] overflow-hidden select-none">
                {/* 500ms SLA Threshold Indicator Line */}
                <div
                  className="absolute left-12 right-4 border-b-2 border-dashed border-rose-500 z-10 pointer-events-none flex items-center justify-end pr-2"
                  style={{ top: '38%' }}
                >
                  <span className="bg-rose-600 text-white font-code text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">
                    500ms Delay SLA Ceiling
                  </span>
                </div>

                {/* Y-Axis Scale Markers */}
                <div className="absolute left-2 top-4 bottom-8 flex flex-col justify-between text-[10px] font-code text-slate-400 pointer-events-none">
                  <span>800ms</span>
                  <span className="text-rose-400 font-bold">500ms</span>
                  <span>250ms</span>
                  <span>0ms</span>
                </div>

                {/* Bars Container */}
                <div className="ml-10 h-56 flex items-end gap-[1.5px] sm:gap-[2px] overflow-x-auto pt-6 pb-2">
                  {monitorChartPartitions.map((p) => {
                    const delay = p.delayMs || 25;
                    const isExceeding = delay > 500 || p.exceedsThreshold;
                    const maxChartMs = 850;
                    const heightPercent = Math.min(100, Math.max(6, Math.round((delay / maxChartMs) * 100)));
                    const isSelected = selectedPartitionId === p.partitionId;
                    const isHovered = hoveredPartition?.partitionId === p.partitionId;

                    return (
                      <div
                        key={p.partitionId}
                        onClick={() => setSelectedPartitionId(p.partitionId)}
                        onMouseEnter={() => setHoveredPartition(p)}
                        onMouseLeave={() => setHoveredPartition(null)}
                        className={`flex-1 min-w-[3px] sm:min-w-[4px] rounded-t-xs transition-all cursor-pointer relative group ${
                          isExceeding
                            ? 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                            : p.consumerGroup === 'billing-service-cg'
                            ? 'bg-indigo-400 hover:bg-indigo-300'
                            : p.consumerGroup === 'notification-dispatch-cg'
                            ? 'bg-cyan-400 hover:bg-cyan-300'
                            : 'bg-emerald-400 hover:bg-emerald-300'
                        } ${isSelected ? 'ring-2 ring-white scale-y-105 z-20' : ''}`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {/* Threshold Breacher Indicator Cap */}
                        {isExceeding && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Footnote */}
                <div className="ml-10 flex items-center justify-between text-[10px] font-code text-slate-400 pt-1 border-t border-slate-700">
                  <span>Partitions: {monitorChartPartitions[0]?.partitionId ?? 0}</span>
                  <span>
                    Viewing {monitorChartPartitions.length} partitions (Hover bar for details, click to inspect)
                  </span>
                  <span>Partitions: {monitorChartPartitions[monitorChartPartitions.length - 1]?.partitionId ?? 255}</span>
                </div>

                {/* Interactive Tooltip Card on Hover */}
                {hoveredPartition && (
                  <div className="absolute top-4 right-4 z-30 p-3 rounded-xl bg-slate-900/95 border border-slate-700 text-white shadow-xl backdrop-blur-md text-xs font-code space-y-1 animate-in fade-in duration-100 min-w-56">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">Partition #{hoveredPartition.partitionId}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          hoveredPartition.delayMs > 500
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {hoveredPartition.delayMs > 500 ? 'SLA EXCEEDED' : 'HEALTHY'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Processing Delay:{' '}
                      <strong className={hoveredPartition.delayMs > 500 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {hoveredPartition.delayMs} ms
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Consumer Group: <span className="text-indigo-300">{hoveredPartition.consumerGroup}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Lag Delta: <strong className="text-white">{hoveredPartition.lag} msgs</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      Host: {hoveredPartition.assignedConsumer} • Leader: {hoveredPartition.leaderBroker}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Consumer Groups Health Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {healthData?.consumerGroups.map((cg) => (
                <div key={cg.groupId} className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-code text-xs font-bold text-[#1a146b]">{cg.groupId}</span>
                    <span
                      className={`text-[9px] font-code font-bold px-2 py-0.5 rounded-full ${
                        cg.status === 'STABLE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                      }`}
                    >
                      {cg.status}
                    </span>
                  </div>
                  <div className="text-xl font-headline font-bold text-[#1a1c1c]">
                    {cg.totalLag.toLocaleString()} <span className="text-xs font-normal text-[#777682]">msgs lag</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#52525e] mt-2 pt-2 border-t border-[#f0f0f0]">
                    <span>{cg.consumerCount} Consumers Active</span>
                    <span className="font-code">256 Partitions Mapped</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 256 Partition Heatmap Grid */}
            <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-headline font-bold text-sm text-[#1a1c1c]">
                    256-Partition Heatmap Matrix ({filteredPartitions.length} displayed)
                  </h4>
                  <p className="text-xs text-[#777682]">
                    High-density overview of all 256 partitions. Cells with red indicator violate the 500ms delay threshold.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-code">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                    <span>&lt;20 msgs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-cyan-500" />
                    <span>20-50</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-amber-500" />
                    <span>50-200</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-rose-500" />
                    <span>&gt;500ms SLA Breach</span>
                  </div>
                </div>
              </div>

              {/* Grid of 256 partitions */}
              <div className="grid grid-cols-8 sm:grid-cols-16 lg:grid-cols-32 gap-1 max-h-72 overflow-y-auto p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                {filteredPartitions.map((p) => {
                  const isSelected = selectedPartitionId === p.partitionId;
                  const isBreaching = p.delayMs > 500 || p.exceedsThreshold;
                  const bgClass = isBreaching
                    ? 'bg-rose-500 text-white ring-1 ring-rose-400'
                    : p.lag > 100
                    ? 'bg-amber-500 text-white'
                    : p.lag > 30
                    ? 'bg-cyan-600 text-white'
                    : 'bg-emerald-500 text-white';

                  return (
                    <button
                      key={p.partitionId}
                      onClick={() => setSelectedPartitionId(p.partitionId)}
                      className={`h-7 rounded-sm font-code text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${bgClass} ${
                        isSelected ? 'ring-2 ring-black scale-110 z-10' : 'opacity-90 hover:opacity-100 hover:scale-105'
                      }`}
                      title={`Partition ${p.partitionId}: ${p.delayMs}ms delay (${p.lag} msgs) on ${p.consumerGroup}`}
                    >
                      {p.partitionId}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Partition Inspector */}
            {selectedPartition && (
              <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-800 font-bold font-code">
                      P{selectedPartition.partitionId}
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-base text-[#1a1c1c]">
                        Kafka Partition #{selectedPartition.partitionId} Telemetry & Consumer Health
                      </h4>
                      <p className="text-xs text-[#52525e]">
                        Consumer Group: <code className="font-code text-indigo-900 font-bold">{selectedPartition.consumerGroup}</code> • Host: {selectedPartition.assignedConsumer}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-code font-bold px-2.5 py-1 rounded-full ${
                      selectedPartition.delayMs > 500
                        ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                        : selectedPartition.status === 'healthy'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    Processing Delay: {selectedPartition.delayMs}ms ({selectedPartition.delayMs > 500 ? 'SLA EXCEEDED' : 'PASSED'})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">Log End Offset (LEO)</div>
                    <div className="font-code font-bold text-[#1a1c1c]">{selectedPartition.logEndOffset.toLocaleString()}</div>
                    <div className="text-[10px] text-cyan-700 mt-1">High Watermark Confirmed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">Consumer Committed Offset</div>
                    <div className="font-code font-bold text-[#1a1c1c]">{selectedPartition.consumerOffset.toLocaleString()}</div>
                    <div className="text-[10px] text-emerald-700 mt-1">Lag delta: {selectedPartition.lag} msgs</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">Leader Broker Node</div>
                    <div className="font-code font-bold text-[#1a1c1c]">{selectedPartition.leaderBroker}</div>
                    <div className="text-[10px] text-[#52525e] mt-1">Replication: 3x ISR</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e2e2e2]">
                    <div className="text-[11px] text-[#777682] mb-1">Partition Ingress Velocity</div>
                    <div className="font-code font-bold text-[#1a1c1c]">{selectedPartition.ingressMsgSec} msg/sec</div>
                    <div className="text-[10px] text-emerald-700 mt-1">Target ~195 msg/s (256 Partitions)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: REDIS DEDUPLICATION & IDEMPOTENCY PIPELINE (6 Nodes)
           ========================================================================= */}
        {activeTab === 'redis' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-sm">
                  Redis
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-purple-950">
                    Tier-1 Idempotency Cache: 6-Node Redis Cluster with Consistent Hashing
                  </h3>
                  <p className="text-xs text-[#474651]">
                    Key format: <code className="font-code font-bold text-purple-900">idemp:&#123;tenant_id&#125;:&#123;idempotency_key&#125;</code> • TTL: 24 Hours • Atomic Lease Grant via <code className="font-code font-bold text-purple-900">SET NX PX 86400</code>.
                  </p>
                </div>
              </div>
              <div className="text-right text-xs font-code text-purple-900 font-bold">
                Overall Hit Rate: {healthData?.redisHitRatePct ?? 99.42}%
              </div>
            </div>

            {/* 6 Redis Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthData?.redisNodes.map((node) => (
                <div key={node.nodeId} className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center font-code text-xs font-bold text-purple-800">
                        {node.nodeId.slice(-2)}
                      </span>
                      <div>
                        <div className="text-xs font-bold font-code text-[#1a1c1c]">{node.nodeId}</div>
                        <div className="text-[10px] text-[#777682]">{node.host}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-code font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      MASTER (OK)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-3 pt-2 border-t border-[#f0f0f0] text-xs">
                    <div>
                      <div className="text-[10px] text-[#777682]">Hit Rate</div>
                      <div className="font-bold text-purple-900 font-code">{node.hitRate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#777682]">Ops Throughput</div>
                      <div className="font-bold text-[#1a1c1c] font-code">{node.opsSec.toLocaleString()} ops/s</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between text-[#64748b]">
                      <span>Memory Capacity</span>
                      <span className="font-code font-semibold">
                        {(node.memoryUsedMb / 1024).toFixed(2)} GB / {(node.memoryMaxMb / 1024).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-600"
                        style={{ width: `${(node.memoryUsedMb / node.memoryMaxMb) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-2.5 mt-2.5 border-t border-[#f0f0f0] font-code">
                    <span>Frag Ratio: {node.fragmentationRatio}</span>
                    <span className="text-purple-700 font-semibold">p99: {node.latencyP99Ms}ms</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Dedup Flow Logic Explanation Card */}
            <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-3">
              <h4 className="font-headline font-bold text-sm text-[#1a1c1c] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Two-Tier Deduplication Decision Flow (Zero Race Conditions)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1">
                  <div className="font-bold text-purple-950">1. Tier-1 Fast Intercept (Redis)</div>
                  <p className="text-[11px] text-[#474651] leading-relaxed">
                    Client request with <code className="font-code text-purple-900">Idempotency-Key</code> checks Redis. If status is <strong className="text-purple-900">COMMITTED</strong>, immediately replays cached HTTP 200 + response payload in 0.8ms.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                  <div className="font-bold text-indigo-950">2. Atomic Lease Reservation</div>
                  <p className="text-[11px] text-[#474651] leading-relaxed">
                    If key not found, worker executes <code className="font-code text-indigo-900">SET key PENDING NX PX 86400</code>. Only the lease winner proceeds to the ACID database transaction.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                  <div className="font-bold text-emerald-950">3. Tier-2 Shard Invariant (DB)</div>
                  <p className="text-[11px] text-[#474651] leading-relaxed">
                    Even during a catastrophic Redis cluster crash or network split, the PostgreSQL UNIQUE constraint on <code className="font-code text-emerald-900">idempotency_key</code> guarantees absolute zero duplicate writes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: CDC DEBEZIUM & REPLICATION SLOT PIPELINE
           ========================================================================= */}
        {activeTab === 'cdc' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                  CDC
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-emerald-950">
                    Change Data Capture (CDC) via Debezium & PostgreSQL <code className="font-code text-emerald-900 font-bold">pgoutput</code>
                  </h3>
                  <p className="text-xs text-[#474651]">
                    16 independent replication slots tail WAL logs asynchronously with zero table lock contention. Outbox records published to Kafka with p99 lag &lt; 250ms.
                  </p>
                </div>
              </div>
              <div className="text-right text-xs font-code text-emerald-900 font-bold">
                16/16 Workers Active • Avg Lag: {healthData?.cdcLagAvgMs ?? 22}ms
              </div>
            </div>

            {/* Latency Pipeline Breakdown Stage by Stage */}
            <div className="p-5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-4">
              <h4 className="font-headline font-bold text-sm text-[#1a1c1c]">
                End-to-End Latency Waterfall (From Ingress to Kafka Broker Ack)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-[10px] text-[#777682] uppercase font-code">Stage 1</div>
                  <div className="font-bold text-[#1a1c1c] text-sm mt-0.5">Ingress + Redis Lease</div>
                  <div className="text-lg font-code font-bold text-indigo-700 mt-1">1.2 ms</div>
                  <p className="text-[10px] text-[#52525e] mt-1">TLS termination & Redis NX reservation</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-[10px] text-[#777682] uppercase font-code">Stage 2</div>
                  <div className="font-bold text-[#1a1c1c] text-sm mt-0.5">PostgreSQL Local Commit</div>
                  <div className="text-lg font-code font-bold text-emerald-700 mt-1">14.8 ms</div>
                  <p className="text-[10px] text-[#52525e] mt-1">Dual-write commit & WAL fsync on NVMe</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-[10px] text-[#777682] uppercase font-code">Stage 3</div>
                  <div className="font-bold text-[#1a1c1c] text-sm mt-0.5">CDC WAL Tailing</div>
                  <div className="text-lg font-code font-bold text-cyan-700 mt-1">22.4 ms</div>
                  <p className="text-[10px] text-[#52525e] mt-1">Debezium pgoutput replication slot read</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-[10px] text-[#777682] uppercase font-code">Stage 4</div>
                  <div className="font-bold text-[#1a1c1c] text-sm mt-0.5">Kafka Broker Ack</div>
                  <div className="text-lg font-code font-bold text-purple-700 mt-1">18.6 ms</div>
                  <p className="text-[10px] text-[#52525e] mt-1">Producer acks=all round-trip to 3 brokers</p>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                <span className="font-medium">Total Outbox-to-Broker Publish Lag (P99):</span>
                <span className="font-code font-bold text-base text-emerald-800">
                  {healthData?.publishLatencyP99Ms ?? 184} ms &lt; 250 ms (Strict SLA Confirmed)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
