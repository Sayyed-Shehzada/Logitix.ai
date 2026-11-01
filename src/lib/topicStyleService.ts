import {
  ColorPaletteSuggestion,
  TypographyStyleSuggestion,
  TopicStyleSuggestion,
  TemplateCategoryType,
} from '../types';

/**
 * Curated, high-contrast, professional presentation color palettes.
 * Designed to satisfy strict WCAG AA contrast, anti-slop rules, and distinct domain identities.
 */
export const CURATED_PALETTES: Record<string, ColorPaletteSuggestion> = {
  // 1. Cobalt Enterprise & Cyan
  cobalt_enterprise: {
    id: 'cobalt_enterprise',
    name: 'Cobalt Enterprise & Cyan',
    category: 'Technical & Infrastructure',
    reason: 'Engineered for distributed systems, cloud infrastructure, and mission-critical SLAs. High-contrast blues instill reliability and precision.',
    primaryAccent: '#0284c7', // Sky 600
    secondaryAccent: '#0369a1', // Sky 700
    surfaceBg: '#f8fafc', // Slate 50
    cardBg: '#ffffff',
    cardBorder: '#cbd5e1', // Slate 300
    titleColor: '#082f49', // Sky 950
    bodyColor: '#334155', // Slate 700
    tagBg: '#e0f2fe', // Sky 100
    tagText: '#0369a1', // Sky 700
    gradient: 'from-sky-900/10 via-sky-600/5 to-transparent',
    isDark: false,
  },

  // 2. Executive Obsidian & Violet
  executive_obsidian: {
    id: 'executive_obsidian',
    name: 'Executive Obsidian & Violet',
    category: 'Executive & C-Suite',
    reason: 'Commanding dark theme for boardroom keynotes, high-stakes investor reviews, and premium strategic alignment.',
    primaryAccent: '#a855f7', // Purple 500
    secondaryAccent: '#c084fc', // Purple 400
    surfaceBg: '#09090b', // Zinc 950
    cardBg: '#18181b', // Zinc 900
    cardBorder: '#27272a', // Zinc 800
    titleColor: '#fafafa', // Zinc 50
    bodyColor: '#d4d4d8', // Zinc 300
    tagBg: '#2e1065', // Purple 950
    tagText: '#e9d5ff', // Purple 200
    gradient: 'from-purple-950/40 via-zinc-900/20 to-transparent',
    isDark: true,
  },

  // 3. Modern Royal Indigo
  royal_indigo: {
    id: 'royal_indigo',
    name: 'Modern Royal Indigo',
    category: 'Enterprise Strategy',
    reason: 'Deep authoritative corporate palette with sharp contrast. Ideal for strategic mandates, financial reviews, and organizational transformation.',
    primaryAccent: '#1a146b', // Deep Royal Indigo
    secondaryAccent: '#4338ca', // Indigo 700
    surfaceBg: '#fafafa', // Neutral 50
    cardBg: '#ffffff',
    cardBorder: '#e0e7ff', // Indigo 100
    titleColor: '#0f172a', // Slate 900
    bodyColor: '#334155', // Slate 700
    tagBg: '#e0e7ff', // Indigo 100
    tagText: '#1a146b', // Royal Indigo
    gradient: 'from-[#1a146b]/10 via-[#312e81]/5 to-transparent',
    isDark: false,
  },

  // 4. Hypergrowth Emerald & Mint
  growth_emerald: {
    id: 'growth_emerald',
    name: 'Hypergrowth Emerald & Mint',
    category: 'Pitch Deck & Venture',
    reason: 'Signals explosive adoption, capital efficiency, sustainability, and upward revenue momentum. Inspires confidence in growth metrics.',
    primaryAccent: '#059669', // Emerald 600
    secondaryAccent: '#047857', // Emerald 700
    surfaceBg: '#f0fdf4', // Emerald 50
    cardBg: '#ffffff',
    cardBorder: '#a7f3d0', // Emerald 200
    titleColor: '#064e3b', // Emerald 900
    bodyColor: '#1f2937', // Gray 800
    tagBg: '#d1fae5', // Emerald 100
    tagText: '#065f46', // Emerald 800
    gradient: 'from-emerald-900/10 via-emerald-500/5 to-transparent',
    isDark: false,
  },

  // 5. Quantum Midnight & Neon Cyan
  quantum_neon: {
    id: 'quantum_neon',
    name: 'Quantum Midnight & Neon Cyan',
    category: 'AI & Deep Tech',
    reason: 'Tailored for cutting-edge multimodal AI, LLM architectures, autonomous agents, and deep research breakthroughs.',
    primaryAccent: '#06b6d4', // Cyan 500
    secondaryAccent: '#0891b2', // Cyan 600
    surfaceBg: '#030712', // Gray 950
    cardBg: '#111827', // Gray 900
    cardBorder: '#1f2937', // Gray 800
    titleColor: '#f9fafb', // Gray 50
    bodyColor: '#9ca3af', // Gray 400
    tagBg: '#164e63', // Cyan 900
    tagText: '#a5f3fc', // Cyan 200
    gradient: 'from-cyan-950/40 via-gray-900/30 to-transparent',
    isDark: true,
  },

  // 6. Nordic Slate & Amber
  nordic_slate: {
    id: 'nordic_slate',
    name: 'Nordic Slate & Amber Alert',
    category: 'Security & DevOps',
    reason: 'Sharp, disciplined telemetry aesthetic. Perfect for zero-trust security, RFC protocols, audit compliance, and SLA uptime.',
    primaryAccent: '#d97706', // Amber 600
    secondaryAccent: '#b45309', // Amber 700
    surfaceBg: '#f8fafc', // Slate 50
    cardBg: '#ffffff',
    cardBorder: '#cbd5e1', // Slate 300
    titleColor: '#0f172a', // Slate 900
    bodyColor: '#334155', // Slate 700
    tagBg: '#fef3c7', // Amber 100
    tagText: '#92400e', // Amber 800
    gradient: 'from-amber-900/10 via-slate-500/5 to-transparent',
    isDark: false,
  },

  // 7. Crimson Venture & Coral
  crimson_venture: {
    id: 'crimson_venture',
    name: 'Crimson Venture & Coral',
    category: 'Disruptive Pitch',
    reason: 'High energy and urgency. Creates an unforgettable impression for disruptive consumer products, paradigm shifts, and bold venture calls.',
    primaryAccent: '#e11d48', // Rose 600
    secondaryAccent: '#be123c', // Rose 700
    surfaceBg: '#fff1f2', // Rose 50
    cardBg: '#ffffff',
    cardBorder: '#fecdd3', // Rose 200
    titleColor: '#4c0519', // Rose 950
    bodyColor: '#374151', // Gray 700
    tagBg: '#ffe4e6', // Rose 100
    tagText: '#9f1239', // Rose 800
    gradient: 'from-rose-900/10 via-pink-600/5 to-transparent',
    isDark: false,
  },

  // 8. Sovereign Gold & Graphite
  sovereign_gold: {
    id: 'sovereign_gold',
    name: 'Sovereign Gold & Graphite',
    category: 'Fintech & Capital',
    reason: 'Prestige aesthetic for institutional finance, asset management, liquidity protocols, and private equity.',
    primaryAccent: '#ca8a04', // Yellow 600
    secondaryAccent: '#a16207', // Yellow 700
    surfaceBg: '#fafaf9', // Stone 50
    cardBg: '#ffffff',
    cardBorder: '#e7e5e4', // Stone 200
    titleColor: '#1c1917', // Stone 900
    bodyColor: '#44403c', // Stone 700
    tagBg: '#fef9c3', // Yellow 100
    tagText: '#854d0e', // Yellow 800
    gradient: 'from-amber-950/10 via-stone-500/5 to-transparent',
    isDark: false,
  },
};

/**
 * Curated typography style pairings with intentional personality,
 * optical hierarchy, and legibility across presentation slide viewports.
 */
export const CURATED_TYPOGRAPHY: Record<string, TypographyStyleSuggestion> = {
  // 1. Executive Authority
  executive_authority: {
    id: 'executive_authority',
    name: 'Executive Authority',
    headlineFont: 'Montserrat',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
    headlineWeight: 'font-bold',
    letterSpacing: 'tracking-tight',
    characterMood: 'Authoritative, Crisp & Timeless',
    description: 'Geometric headlines paired with ultra-legible body text. The gold standard for boardroom presentations and leadership reviews.',
  },

  // 2. Systems Engineering & Telemetry
  systems_engineering: {
    id: 'systems_engineering',
    name: 'Systems Engineering & Telemetry',
    headlineFont: 'Space Grotesk',
    bodyFont: 'JetBrains Mono',
    codeFont: 'JetBrains Mono',
    headlineWeight: 'font-semibold',
    letterSpacing: 'tracking-tight',
    characterMood: 'High-Tech, Rigorous & Metric-Driven',
    description: 'Monospace telemetry body font with technical grotesk headings. Ideal for distributed systems, latency benchmarks, and protocols.',
  },

  // 3. SaaS Modern & Product Velocity
  saas_velocity: {
    id: 'saas_velocity',
    name: 'SaaS Modern & Velocity',
    headlineFont: 'Plus Jakarta Sans',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
    headlineWeight: 'font-bold',
    letterSpacing: 'tracking-tight',
    characterMood: 'Contemporary, Approachable & Vibrant',
    description: 'Modern neo-grotesk with warm humanistic touches. Engineered for high-velocity software platforms and product walk-throughs.',
  },

  // 4. Minimalist Architectural Clean
  architectural_minimalist: {
    id: 'architectural_minimalist',
    name: 'Architectural Minimalist',
    headlineFont: 'Outfit',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
    headlineWeight: 'font-bold',
    letterSpacing: 'tracking-normal',
    characterMood: 'Minimalist, Sophisticated & Balanced',
    description: 'Clean circular proportions with maximum whitespace harmony. Perfect for visionary design and clear strategic propositions.',
  },

  // 5. Technical Rigor & Structure
  technical_rigor: {
    id: 'technical_rigor',
    name: 'Technical Rigor & Structure',
    headlineFont: 'Space Grotesk',
    bodyFont: 'Plus Jakarta Sans',
    codeFont: 'JetBrains Mono',
    headlineWeight: 'font-bold',
    letterSpacing: 'tracking-tight',
    characterMood: 'Disciplined, Modern & Scalable',
    description: 'Blends technical punch in slide titles with comfortable reading cadence in bullets and architecture callouts.',
  },
};

/**
 * Intelligent topic semantic analyzer that maps presentation topics to
 * domain archetypes, optimal palettes, and typography pairings.
 */
export function suggestStylesForTopic(
  topicPrompt: string,
  preferredTemplate?: TemplateCategoryType
): TopicStyleSuggestion {
  const text = (topicPrompt || '').toLowerCase();

  // Category Detection Rules
  let detectedCategory = 'General Strategy & Enterprise';
  let primaryPaletteKey = 'royal_indigo';
  let primaryTypoKey = 'executive_authority';
  let altPaletteKeys = ['executive_obsidian', 'cobalt_enterprise', 'growth_emerald'];
  let altTypoKeys = ['saas_velocity', 'systems_engineering', 'architectural_minimalist'];
  let reason = 'Balanced corporate color hierarchy and clean typography suited for executive stakeholder communication.';

  // Rule 1: Distributed Systems, High-Throughput & Infrastructure
  if (
    text.includes('outbox') ||
    text.includes('kafka') ||
    text.includes('distributed') ||
    text.includes('shard') ||
    text.includes('throughput') ||
    text.includes('req/s') ||
    text.includes('latency') ||
    text.includes('p99') ||
    text.includes('database') ||
    text.includes('postgres') ||
    text.includes('redis') ||
    text.includes('architecture') ||
    text.includes('infrastructure') ||
    text.includes('microservice') ||
    text.includes('rfc') ||
    text.includes('pipeline') ||
    text.includes('cache') ||
    text.includes('failover') ||
    text.includes('cdc') ||
    preferredTemplate === 'Technical'
  ) {
    detectedCategory = 'Distributed Systems & Cloud Architecture';
    primaryPaletteKey = 'cobalt_enterprise';
    primaryTypoKey = 'systems_engineering';
    altPaletteKeys = ['nordic_slate', 'quantum_neon', 'executive_obsidian'];
    altTypoKeys = ['technical_rigor', 'executive_authority', 'saas_velocity'];
    reason =
      'Technical architecture demands precision and telemetry legibility. Cobalt and Cyan deliver high-contrast clarity for component diagrams, while Space Grotesk + JetBrains Mono anchors rigorous throughput benchmarks.';
  }
  // Rule 2: AI, Machine Learning, Deep Tech & Agents
  else if (
    text.includes('ai') ||
    text.includes('model') ||
    text.includes('llm') ||
    text.includes('gemini') ||
    text.includes('agent') ||
    text.includes('autonomous') ||
    text.includes('neural') ||
    text.includes('multimodal') ||
    text.includes('deep learning') ||
    text.includes('inference') ||
    text.includes('consensus') ||
    text.includes('rag')
  ) {
    detectedCategory = 'Artificial Intelligence & Deep Tech';
    primaryPaletteKey = 'quantum_neon';
    primaryTypoKey = 'systems_engineering';
    altPaletteKeys = ['executive_obsidian', 'cobalt_enterprise', 'royal_indigo'];
    altTypoKeys = ['saas_velocity', 'architectural_minimalist', 'technical_rigor'];
    reason =
      'Deep tech and frontier AI thrive on dark modern surfaces with luminous cyan accents, reflecting computational power, algorithmic consensus, and futuristic velocity.';
  }
  // Rule 3: Pitch Deck, Startups, Venture Capital & Growth
  else if (
    text.includes('pitch') ||
    text.includes('seed') ||
    text.includes('series a') ||
    text.includes('investor') ||
    text.includes('vc') ||
    text.includes('growth') ||
    text.includes('traction') ||
    text.includes('breakthrough') ||
    text.includes('disrupt') ||
    text.includes('vision') ||
    text.includes('revolution') ||
    preferredTemplate === 'Creative'
  ) {
    detectedCategory = 'Venture Pitch & Visionary Growth';
    primaryPaletteKey = 'growth_emerald';
    primaryTypoKey = 'saas_velocity';
    altPaletteKeys = ['crimson_venture', 'royal_indigo', 'executive_obsidian'];
    altTypoKeys = ['architectural_minimalist', 'executive_authority', 'systems_engineering'];
    reason =
      'Pitch decks require momentum and confidence. Growth Emerald signals traction, capital efficiency, and upward trajectories, paired with vibrant Plus Jakarta Sans typography.';
  }
  // Rule 4: Fintech, Trading, Liquidity & Capital Markets
  else if (
    text.includes('fintech') ||
    text.includes('trading') ||
    text.includes('payment') ||
    text.includes('bank') ||
    text.includes('liquidity') ||
    text.includes('asset') ||
    text.includes('crypto') ||
    text.includes('capital') ||
    text.includes('treasury') ||
    text.includes('ledger')
  ) {
    detectedCategory = 'Fintech & Capital Markets';
    primaryPaletteKey = 'sovereign_gold';
    primaryTypoKey = 'executive_authority';
    altPaletteKeys = ['executive_obsidian', 'growth_emerald', 'royal_indigo'];
    altTypoKeys = ['architectural_minimalist', 'saas_velocity', 'technical_rigor'];
    reason =
      'Capital and institutional finance benefit from Sovereign Gold and Graphite, radiating stability, balance sheet discipline, and private-equity rigor.';
  }
  // Rule 5: Security, Zero-Trust, Audits & Governance
  else if (
    text.includes('security') ||
    text.includes('zero-trust') ||
    text.includes('zero trust') ||
    text.includes('auth') ||
    text.includes('firewall') ||
    text.includes('vulnerability') ||
    text.includes('audit') ||
    text.includes('compliance') ||
    text.includes('governance') ||
    text.includes('risk')
  ) {
    detectedCategory = 'Cybersecurity & Zero-Trust Governance';
    primaryPaletteKey = 'nordic_slate';
    primaryTypoKey = 'technical_rigor';
    altPaletteKeys = ['cobalt_enterprise', 'executive_obsidian', 'royal_indigo'];
    altTypoKeys = ['systems_engineering', 'executive_authority', 'saas_velocity'];
    reason =
      'Zero-trust security requires decisive contrast and alert states. Nordic Slate with Amber indicators guarantees immediate visual hierarchy for threat boundaries and audit compliance.';
  }
  // Rule 6: Executive Briefing & Boardroom Reviews
  else if (
    text.includes('board') ||
    text.includes('executive') ||
    text.includes('q4') ||
    text.includes('q1') ||
    text.includes('q2') ||
    text.includes('q3') ||
    text.includes('revenue') ||
    text.includes('roi') ||
    text.includes('mandate') ||
    preferredTemplate === 'Executive'
  ) {
    detectedCategory = 'C-Suite Strategy & Board Review';
    primaryPaletteKey = 'royal_indigo';
    primaryTypoKey = 'executive_authority';
    altPaletteKeys = ['executive_obsidian', 'cobalt_enterprise', 'growth_emerald'];
    altTypoKeys = ['architectural_minimalist', 'saas_velocity', 'technical_rigor'];
    reason =
      'C-suite presentations demand commanding sobriety. Royal Indigo paired with geometric Montserrat conveys unshakeable authority and clear capital allocation guidance.';
  }

  const primaryPalette = CURATED_PALETTES[primaryPaletteKey] || CURATED_PALETTES.royal_indigo;
  const alternativePalettes = altPaletteKeys
    .map((k) => CURATED_PALETTES[k])
    .filter(Boolean);

  const primaryTypography =
    CURATED_TYPOGRAPHY[primaryTypoKey] || CURATED_TYPOGRAPHY.executive_authority;
  const alternativeTypography = altTypoKeys
    .map((k) => CURATED_TYPOGRAPHY[k])
    .filter(Boolean);

  return {
    topicKey: primaryPaletteKey,
    confidence: text.trim().length > 10 ? 94 : 85,
    detectedCategory,
    summaryExplanation: reason,
    palette: primaryPalette,
    alternativePalettes,
    typography: primaryTypography,
    alternativeTypography,
  };
}

/**
 * Converts a hex color (#RRGGBB) to Google Slides API normalized RGB (0.0 to 1.0)
 */
export function hexToGoogleSlidesRgb(hex: string): { red: number; green: number; blue: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { red: 0.1, green: 0.1, blue: 0.4 };
  }
  return {
    red: Math.round((((num >> 16) & 255) / 255) * 100) / 100,
    green: Math.round((((num >> 8) & 255) / 255) * 100) / 100,
    blue: Math.round(((num & 255) / 255) * 100) / 100,
  };
}

/**
 * Returns complete Google Slides API palette structure for a given ColorPaletteSuggestion
 */
export function buildGoogleSlidesThemePalette(palette: ColorPaletteSuggestion) {
  return {
    bg: hexToGoogleSlidesRgb(palette.surfaceBg),
    titleText: hexToGoogleSlidesRgb(palette.titleColor),
    bodyText: hexToGoogleSlidesRgb(palette.bodyColor),
    subText: hexToGoogleSlidesRgb(palette.bodyColor),
    accent: hexToGoogleSlidesRgb(palette.primaryAccent),
    cardBg: hexToGoogleSlidesRgb(palette.cardBg),
    cardBorder: hexToGoogleSlidesRgb(palette.cardBorder),
    calloutBg: hexToGoogleSlidesRgb(palette.tagBg),
  };
}

/**
 * Maps a ColorPaletteSuggestion to PPTX / PDF export structure
 */
export function buildSlideExportPalette(palette: ColorPaletteSuggestion) {
  return {
    primary: palette.primaryAccent.replace('#', ''),
    primaryHex: palette.primaryAccent,
    secondaryHex: palette.secondaryAccent,
    bgHex: palette.surfaceBg,
    cardBgHex: palette.cardBg,
    textPrimaryHex: palette.titleColor,
    textSecondaryHex: palette.bodyColor,
    accentHex: palette.primaryAccent,
    isDark: palette.isDark,
  };
}
