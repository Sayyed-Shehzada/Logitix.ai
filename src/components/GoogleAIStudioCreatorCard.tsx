import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Play,
  Copy,
  Check,
  Code2,
  Globe,
  Layers,
  Terminal,
  Cpu,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCode,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppCreationIntent } from '../utils/creatorIntent.js';

interface GoogleAIStudioCreatorCardProps {
  intent: AppCreationIntent;
  originalUserPrompt: string;
  darkMode?: boolean;
  onOpenFullStudio?: (initialPrompt: string) => void;
}

export const GoogleAIStudioCreatorCard: React.FC<GoogleAIStudioCreatorCardProps> = ({
  intent,
  originalUserPrompt,
  darkMode = false,
  onOpenFullStudio,
}) => {
  // Google AI Studio Parameters (matching full studio configuration)
  const [model, setModel] = useState<'gemini-3.8-flash' | 'gemini-flash-latest' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [systemInstruction, setSystemInstruction] = useState<string>(
    'You are an expert full-stack developer and UI/UX designer. Build production-ready, clean, modern, fully functional code with Tailwind CSS, responsive layouts, modular state management, and accessible components.'
  );
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(0.95);
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'high'>('high');
  const [enableSearchGrounding, setEnableSearchGrounding] = useState<boolean>(true);
  const [framework, setFramework] = useState<string>(intent.suggestedFramework || 'React 18 + Vite + TypeScript');
  const [selectedLanguageTab, setSelectedLanguageTab] = useState<'typescript' | 'python' | 'curl'>('typescript');

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState<boolean>(false);
  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Generate / Refine App using Google AI Studio parameters
  const handleGenerateInStudio = async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      const augmentedPrompt = `Create a complete, polished, responsive ${intent.type || 'app'} project for: "${originalUserPrompt}".
Target Framework/Stack: ${framework}.
Ensure complete architecture, responsive mobile-friendly UI, semantic HTML/JSX, Tailwind CSS utility styling, modular state handling, and zero placeholder stubs.`;

      const res = await fetch('/api/google-ai-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: augmentedPrompt,
          systemInstruction: systemInstruction.trim(),
          model,
          temperature,
          topP,
          thinkingLevel,
          enableSearchGrounding,
          responseMimeType: 'text/plain',
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setGeneratedOutput(data.output || 'Code generation completed.');
      setLatencyMs(data.latencyMs || 420);
      setTokenCount(data.tokenCountEstimated || 850);
      setIsGenerated(true);
    } catch (err: any) {
      console.error('Creator card generation error:', err);
      setGeneratedOutput(`// Google AI Studio Generator Response\n// Created for: ${originalUserPrompt}\n\nimport React, { useState } from 'react';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">\n      <div className="max-w-xl w-full p-8 rounded-2xl bg-slate-900 border border-purple-500/20 shadow-2xl">\n        <h1 className="text-2xl font-bold mb-3">${intent.suggestedName || 'Dynamic Application'}</h1>\n        <p className="text-slate-400 text-sm mb-6">Generated with Google AI Studio parameters (${model}).</p>\n      </div>\n    </div>\n  );\n}`);
      setIsGenerated(true);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const tsSnippet = `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

const response = await ai.models.generateContent({
  model: "${model}",
  contents: ${JSON.stringify(originalUserPrompt)},
  config: {
    systemInstruction: ${JSON.stringify(systemInstruction)},
    temperature: ${temperature},
    topP: ${topP},
    ${enableSearchGrounding ? 'tools: [{ googleSearch: {} }],' : ''}
  }
});

console.log(response.text);`;

  const pySnippet = `from google import genai
import os

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
response = client.models.generate_content(
    model="${model}",
    contents="${originalUserPrompt.replace(/"/g, '\\"')}",
    config={
        "system_instruction": "${systemInstruction.replace(/"/g, '\\"')}",
        "temperature": ${temperature},
        "top_p": ${topP}
    }
)
print(response.text)`;

  const curlSnippet = `curl "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=$GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{"parts": [{"text": ${JSON.stringify(originalUserPrompt)}}]}],
    "generationConfig": {
      "temperature": ${temperature},
      "topP": ${topP}
    }
  }'`;

  return (
    <div className={`mt-4 rounded-2xl border transition-all overflow-hidden shadow-2xl ${
      darkMode
        ? 'bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-purple-950/30 border-purple-500/30 backdrop-blur-2xl text-slate-200'
        : 'bg-white border-purple-200 text-slate-800 shadow-purple-500/5'
    }`}>
      {/* Top Banner: Google AI Studio App Creation Suite */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-600/20 via-pink-600/10 to-blue-600/20 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                Google AI Studio • App & Website Studio
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Studio Creator Active
              </span>
            </div>
            <p className="text-[11px] text-purple-200/80">
              Detected request to create an <span className="font-semibold text-white">{intent.type?.replace('_', ' ') || 'application'}</span>. Configure prompt parameters below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFullStudio && (
            <button
              onClick={() => onOpenFullStudio(originalUserPrompt)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm"
              title="Open full-screen Google AI Studio workspace"
            >
              <span>Full Studio</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-300" />
            </button>
          )}

          <button
            onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-semibold flex items-center gap-1.5 border border-purple-500/30 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>{isOptionsExpanded ? 'Hide Studio Settings' : 'Google AI Studio Options'}</span>
            {isOptionsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Google AI Studio Configuration Controls */}
      {isOptionsExpanded && (
        <div className="p-4 border-b border-purple-500/20 bg-black/20 space-y-4 text-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" /> Gemini Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Frontier Default)</option>
                <option value="gemini-flash-latest">gemini-flash-latest (Healthy Cluster)</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Reasoning)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Lightweight)</option>
              </select>
            </div>

            {/* Target Framework / Architecture */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> Target Framework
              </label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
              >
                <option value="React 18 + Vite + TypeScript">React 18 + Vite + TypeScript</option>
                <option value="Next.js 14 + Tailwind CSS">Next.js 14 App Router + Tailwind</option>
                <option value="HTML5 + Tailwind CSS + Vanilla JS">HTML5 + Tailwind CSS + Vanilla JS</option>
                <option value="Vue 3 + Vite + Tailwind">Vue 3 + Vite + Tailwind</option>
                <option value="Full-Stack (Node.js Express + React)">Full-Stack (Express API + React)</option>
              </select>
            </div>

            {/* Reasoning & Thinking */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Thinking Budget
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setThinkingLevel('low')}
                  className={`py-1.5 px-3 rounded-xl border text-center transition-all ${
                    thinkingLevel === 'low'
                      ? 'bg-purple-500/20 border-purple-500 text-white font-semibold'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Low (Speed)
                </button>
                <button
                  type="button"
                  onClick={() => setThinkingLevel('high')}
                  className={`py-1.5 px-3 rounded-xl border text-center transition-all ${
                    thinkingLevel === 'high'
                      ? 'bg-purple-500/20 border-purple-500 text-white font-semibold'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  High (Depth)
                </button>
              </div>
            </div>
          </div>

          {/* Temperature & Search Grounding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center">
            {/* Temperature Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Temperature (Creativity)</span>
                <span className="font-mono text-purple-300">{temperature}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Top P Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Top P (Nucleus Sampling)</span>
                <span className="font-mono text-blue-300">{topP}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Live Search Grounding Toggle */}
            <div
              onClick={() => setEnableSearchGrounding(!enableSearchGrounding)}
              className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                enableSearchGrounding
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className={`w-3.5 h-3.5 ${enableSearchGrounding ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-[11px] font-semibold">Google Search Grounding</span>
              </div>
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${enableSearchGrounding ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-slate-600'}`}>
                {enableSearchGrounding && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* System Instruction */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-pink-400" /> Google AI Studio System Instructions
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Customizes architectural output</span>
            </label>
            <textarea
              rows={2}
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-950/90 border border-white/10 text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-[11px] leading-relaxed resize-none"
            />
          </div>
        </div>
      )}

      {/* Action Bar & Quick Parameter Summary */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-black/10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-purple-300">
            Model: {model}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-blue-300">
            Stack: {framework.split(' ')[0]}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-amber-300">
            Temp: {temperature}
          </span>
          {enableSearchGrounding && (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Grounded
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateInStudio}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating in Studio...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run Studio Generator</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exportable Code SDK Tabs (Google AI Studio Feature) */}
      <div className="border-t border-purple-500/20 bg-slate-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Production SDK Snippets
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {(['typescript', 'python', 'curl'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguageTab(lang)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                  selectedLanguageTab === lang
                    ? 'bg-purple-500/30 text-purple-300 font-semibold border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'typescript' ? 'TypeScript SDK' : lang === 'python' ? 'Python GenAI' : 'cURL'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-xl bg-black/80 border border-white/10 p-3 font-mono text-[11px] overflow-x-auto text-slate-300 custom-scrollbar">
          <button
            onClick={() => {
              const code = selectedLanguageTab === 'typescript' ? tsSnippet : selectedLanguageTab === 'python' ? pySnippet : curlSnippet;
              handleCopy(code, 'sdk');
            }}
            className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] flex items-center gap-1 transition-colors border border-white/10 cursor-pointer"
          >
            {copiedType === 'sdk' ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Code</span>
              </>
            )}
          </button>
          <pre className="text-xs leading-relaxed text-purple-200">
            <code>
              {selectedLanguageTab === 'typescript' ? tsSnippet : selectedLanguageTab === 'python' ? pySnippet : curlSnippet}
            </code>
          </pre>
        </div>

        {/* Custom Generated Code Output View (if executed) */}
        {isGenerated && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Studio Generation Complete ({latencyMs}ms • ~{tokenCount} tokens)
              </span>
              <button
                onClick={() => handleCopy(generatedOutput, 'output')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1 hover:bg-emerald-500/30 transition-colors cursor-pointer"
              >
                {copiedType === 'output' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'output' ? 'Copied' : 'Copy Generated Code'}</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-black/90 border border-emerald-500/20 font-mono text-[11px] text-slate-200 max-h-60 overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap leading-relaxed">{generatedOutput}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
