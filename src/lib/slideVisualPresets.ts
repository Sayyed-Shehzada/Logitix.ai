export interface SlideVisualPreset {
  id: string;
  title: string;
  category: 'chart' | 'illustration' | 'diagram';
  type: 'chart' | 'illustration' | 'diagram';
  tagline: string;
  badge: string;
  prompt: string;
  recommendedStyle: string;
  recommendedAspectRatio: '16:9' | '4:3' | '1:1';
}

export const SLIDE_VISUAL_PRESETS: SlideVisualPreset[] = [
  // 1. Business Charts
  {
    id: 'chart-throughput-latency',
    title: '50k req/s Throughput & Latency SLA',
    category: 'chart',
    type: 'chart',
    tagline: 'Dual-axis Benchmark & SLA Envelope',
    badge: 'Performance KPI',
    prompt: 'Dual-axis corporate performance chart: 50,000 req/s ingress throughput bars with P99 latency line staying strictly under 35ms, clean modern corporate dashboard styling',
    recommendedStyle: 'data-chart',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'chart-yoy-growth',
    title: 'Enterprise Platform Adoption (+340% YoY)',
    category: 'chart',
    type: 'chart',
    tagline: 'Annual Growth & Expansion Velocity',
    badge: 'Growth Metric',
    prompt: 'Vibrant corporate bar chart showing +340% year-over-year enterprise platform adoption, quarterly revenue surge, 99.4% net retention rate badge, clean presentation aesthetic',
    recommendedStyle: 'data-chart',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'chart-conversion-funnel',
    title: 'Executive Sales & Adoption Funnel',
    category: 'chart',
    type: 'chart',
    tagline: 'Conversion Velocity Across 4 Stages',
    badge: 'Pipeline',
    prompt: 'Sleek isometric 4-stage business conversion funnel: Inbound Inquiries, Technical POC, Executive Approval, and Enterprise Rollout with conversion rate badges',
    recommendedStyle: 'business-vector',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'chart-uptime-donut',
    title: '99.999% SLA High-Availability Donut',
    category: 'chart',
    type: 'chart',
    tagline: 'Failover Redundancy & Uptime Allocation',
    badge: 'Reliability',
    prompt: 'Clean modern circular donut breakdown chart: 99.999% active production uptime, automated multi-region failover, 0.001% scheduled maintenance window, vibrant contrast',
    recommendedStyle: 'data-chart',
    recommendedAspectRatio: '4:3',
  },

  // 2. Systems Architecture Diagrams
  {
    id: 'diagram-distributed-outbox',
    title: '16-Shard Distributed Outbox Topology',
    category: 'diagram',
    type: 'diagram',
    tagline: 'PostgreSQL Shards, Redis & Kafka Ring',
    badge: 'Architecture',
    prompt: 'Isometric systems topology diagram: Ingress Gateway routing to 16 PostgreSQL database shards, connected to a 6-node Redis cluster and 256 Kafka broker partitions, glowing data streams',
    recommendedStyle: 'corporate-isometric',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'diagram-zero-trust-cloud',
    title: 'Zero-Trust Cloud Security Architecture',
    category: 'diagram',
    type: 'diagram',
    tagline: 'End-to-End Encryption & Perimeter Defense',
    badge: 'Security',
    prompt: 'High-tech cybersecurity architecture diagram: cryptographic shield, mutual TLS 1.3 tunnels, identity-aware proxies, and automated threat mitigation circuit breakers',
    recommendedStyle: 'blueprint-diagram',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'diagram-event-stream-cdc',
    title: 'Real-Time Change Data Capture Pipeline',
    category: 'diagram',
    type: 'diagram',
    tagline: 'WAL Replication to Sliding Window Dedup',
    badge: 'Data Pipeline',
    prompt: 'Stream processing architecture diagram: Database WAL engine tailing into Debezium CDC broker, leading into sliding-window deduplication and event replay queue',
    recommendedStyle: 'corporate-isometric',
    recommendedAspectRatio: '16:9',
  },

  // 3. Professional Executive Illustrations
  {
    id: 'illustration-boardroom-strategy',
    title: 'Executive Vision & Strategic Horizon',
    category: 'illustration',
    type: 'illustration',
    tagline: 'C-Suite Alignment & Future Roadmap',
    badge: 'Executive',
    prompt: 'Polished modern vector illustration of enterprise leaders around an interactive holographic strategic roadmap with rising ROI curves and global delivery targets',
    recommendedStyle: 'business-vector',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'illustration-ai-consensus',
    title: 'Multi-Model AI Consensus Engine',
    category: 'illustration',
    type: 'illustration',
    tagline: 'Neural Multi-Agent Orchestration',
    badge: 'AI Innovation',
    prompt: 'Futuristic glowing neural network node with multi-agent orchestration, consensus scoring waves, holographic processing lattice, elegant dark violet and cyan lighting',
    recommendedStyle: '3d-render',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'illustration-global-scalability',
    title: 'Global Edge Cloud Scalability',
    category: 'illustration',
    type: 'illustration',
    tagline: 'Worldwide Low-Latency Edge Deployment',
    badge: 'Global Scale',
    prompt: 'Stylized 3D earth globe with interconnected high-speed fiber lines, edge data centers, sub-millisecond cloud routing beacons, modern corporate tech aesthetic',
    recommendedStyle: 'business-vector',
    recommendedAspectRatio: '16:9',
  },
];
