import React from 'react';

export const DesignSystemView: React.FC = () => {
  const colors = [
    { name: 'Canvas Base', hex: '#f9f9f8', role: 'Main workspace canvas background' },
    { name: 'Sidebar Tone', hex: '#f3f4f3', role: 'Lateral navigation panels and drawers' },
    { name: 'Primary Accent', hex: '#1a146b', role: 'Dominant button, active states, key branding' },
    { name: 'Secondary Indigo', hex: '#312e81', role: 'Focused highlights, icons, active tab items' },
    { name: 'Soft Purple Tint', hex: '#e2dfff', role: 'Context tags, pill backdrops, text selection' },
    { name: 'Neutral Dark', hex: '#1a1c1c', role: 'High-contrast typography headings' },
    { name: 'Muted Slate', hex: '#474651', role: 'Body copy and descriptive metadata' },
    { name: 'Subtle Gray', hex: '#777682', role: 'Labels, captions, timestamps, placeholder' },
    { name: 'Card Border', hex: '#e2e2e2', role: 'Card containment and hairline dividers' },
  ];

  return (
    <div className="w-full px-6 py-6 max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div>
        <span className="font-code text-[11px] text-[#1a146b] font-medium bg-[#e2dfff] px-2 py-0.5 rounded">
          DESIGN INTELLIGENCE SPEC
        </span>
        <h1 className="font-headline text-3xl text-[#1a1c1c] mt-1">
          LOGITIX Studio AI Design System & Tokens
        </h1>
        <p className="font-body text-xs md:text-sm text-[#474651]">
          Editorial High-Density Workstation design guidelines, optical balance ratios, and color tokens.
        </p>
      </div>

      {/* Color Palette Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#1a1c1c] uppercase tracking-wider font-code">
          1. Color Token Matrix
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {colors.map((c) => (
            <div
              key={c.name}
              className="p-3 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs flex items-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-xl border border-black/10 shrink-0 shadow-xs"
                style={{ backgroundColor: c.hex }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-[#1a1c1c]">{c.name}</div>
                <div className="font-code text-[11px] text-[#1a146b] font-medium">{c.hex}</div>
                <div className="text-[10px] text-[#777682] truncate mt-0.5">{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography Tokens */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#1a1c1c] uppercase tracking-wider font-code">
          2. Typographic Scale
        </h2>
        <div className="p-6 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-4">
          <div className="border-b border-[#e2e2e2] pb-3">
            <span className="text-[10px] font-code text-[#777682]">Display / Headline 1 (32px - 36px)</span>
            <div className="font-headline text-3xl text-[#1a1c1c] font-medium mt-1">
              Editorial High-Density Cognitive Canvas
            </div>
          </div>
          <div className="border-b border-[#e2e2e2] pb-3">
            <span className="text-[10px] font-code text-[#777682]">Section Header / Title (18px - 20px)</span>
            <div className="font-headline text-lg text-[#1a146b] font-medium mt-1">
              Resilient Dual-Phase Commit Architecture Spec
            </div>
          </div>
          <div className="border-b border-[#e2e2e2] pb-3">
            <span className="text-[10px] font-code text-[#777682]">Body Text (13px - 14px)</span>
            <div className="font-body text-sm text-[#474651] mt-1 leading-relaxed">
              Consensus synthesized across Gemini 1.5 Pro and Claude 3.5 Sonnet to eliminate failure modes under high write churn and intermittent socket disconnects.
            </div>
          </div>
          <div>
            <span className="text-[10px] font-code text-[#777682]">Code & Monospace (11px - 12px)</span>
            <div className="font-code text-xs text-[#1a146b] mt-1 bg-[#f9f9f8] p-2.5 rounded-xl border border-[#e2e2e2]">
              RFC-7233 byte-range slicing | Content-Range: bytes 0-262143/10485760
            </div>
          </div>
        </div>
      </div>

      {/* Component UI Gallery */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#1a1c1c] uppercase tracking-wider font-code">
          3. Component Primitives
        </h2>
        <div className="p-6 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-6">
          {/* Buttons */}
          <div>
            <div className="text-xs font-semibold text-[#777682] mb-2 font-code">Buttons & Triggers</div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="px-4 py-2 bg-[#1a146b] text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-[#312e81]">
                Primary Solid
              </button>
              <button className="px-4 py-2 bg-white border border-[#e2e2e2] text-[#1a1c1c] text-xs font-medium rounded-xl hover:bg-[#f3f4f3]">
                Secondary Neutral
              </button>
              <button className="px-4 py-2 bg-[#e2dfff] text-[#1a146b] text-xs font-semibold rounded-xl hover:bg-[#c4c0ff]/60">
                Tertiary Tint
              </button>
            </div>
          </div>

          {/* Badges */}
          <div>
            <div className="text-xs font-semibold text-[#777682] mb-2 font-code">Status Badges & Tags</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium font-code">
                ● ONLINE (99.8% SLA)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#e2dfff] border border-[#c4c0ff] text-[#1a146b] text-[11px] font-medium font-code">
                RFC-7386
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium font-code">
                STANDBY
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
