import React, { useState } from 'react';

interface SettingsSecurityViewProps {
  onOpenExportModal?: () => void;
}

export const SettingsSecurityView: React.FC<SettingsSecurityViewProps> = () => {
  const [tokenRateCeiling, setTokenRateCeiling] = useState('100 req/sec');
  const [sessionAutoLock, setSessionAutoLock] = useState('30 minutes');
  const [consensusVerificationThreshold, setConsensusVerificationThreshold] = useState('98.5%');
  const [strictEsmSandbox, setStrictEsmSandbox] = useState(true);
  const [autoRedactPii, setAutoRedactPii] = useState(true);

  return (
    <div className="w-full px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-code text-[11px] text-[#1a146b] font-medium bg-[#e2dfff] px-2 py-0.5 rounded">
            SECURITY & RUNTIME POLICIES
          </span>
          <h1 className="font-headline text-3xl text-[#1a1c1c] mt-1">
            Workspace Security & Settings
          </h1>
          <p className="font-body text-xs md:text-sm text-[#474651]">
            Cryptographic audit controls, sandbox isolation boundaries, and model gateway governance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security & Access Box */}
        <div className="p-6 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1c1c]">
            <span className="material-symbols-outlined text-[20px] text-[#1a146b]">shield</span>
            <span>Zero-Trust Security Controls</span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#f9f9f8] border border-[#e2e2e2]">
              <div>
                <div className="font-semibold text-[#1a1c1c]">Strict ESM Sandbox Isolation</div>
                <div className="text-[11px] text-[#777682]">Execute all code generators in ephemeral VM isolate</div>
              </div>
              <input
                type="checkbox"
                checked={strictEsmSandbox}
                onChange={(e) => setStrictEsmSandbox(e.target.checked)}
                className="w-4 h-4 accent-[#1a146b]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#f9f9f8] border border-[#e2e2e2]">
              <div>
                <div className="font-semibold text-[#1a1c1c]">Auto PII & Key Sanitization</div>
                <div className="text-[11px] text-[#777682]">Mask API tokens and credentials in prompts</div>
              </div>
              <input
                type="checkbox"
                checked={autoRedactPii}
                onChange={(e) => setAutoRedactPii(e.target.checked)}
                className="w-4 h-4 accent-[#1a146b]"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#f9f9f8] border border-[#e2e2e2] space-y-1.5">
              <div className="font-semibold text-[#1a1c1c]">Session Idle Lock</div>
              <select
                value={sessionAutoLock}
                onChange={(e) => setSessionAutoLock(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-[#e2e2e2] outline-none"
              >
                <option value="15 minutes">15 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="1 hour">1 hour</option>
                <option value="Never">Never (Development only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Model Gateway & Rate Limits */}
        <div className="p-6 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1c1c]">
            <span className="material-symbols-outlined text-[20px] text-[#00674e]">tune</span>
            <span>Gateway & Consensus Thresholds</span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[#f9f9f8] border border-[#e2e2e2] space-y-1.5">
              <div className="font-semibold text-[#1a1c1c]">Consensus Arbiter Minimum Confidence</div>
              <div className="text-[11px] text-[#777682]">Required agreement across Gemini and Claude</div>
              <select
                value={consensusVerificationThreshold}
                onChange={(e) => setConsensusVerificationThreshold(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-[#e2e2e2] outline-none"
              >
                <option value="95.0%">95.0% Loose Consensus</option>
                <option value="98.5%">98.5% Strict Production (Default)</option>
                <option value="99.9%">99.9% Mathematical Proof Level</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-[#f9f9f8] border border-[#e2e2e2] space-y-1.5">
              <div className="font-semibold text-[#1a1c1c]">Redis Rate-Limiting Burst Capacity</div>
              <input
                type="text"
                value={tokenRateCeiling}
                onChange={(e) => setTokenRateCeiling(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-[#e2e2e2] outline-none font-code"
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <div className="font-semibold">All Systems Operational</div>
              <p className="text-[11px] mt-0.5">
                Google AI Studio Gateway connected with low-latency streaming enabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
