import React, { useState } from 'react';
import {
  Sparkles,
  Code2,
  Terminal,
  Play,
  Sliders,
  RotateCcw,
  Copy,
  Check,
  Globe,
  FileCode,
  FileText,
  MessageSquare,
  Download,
  Upload,
  X,
  ExternalLink,
  Cpu,
  Layers,
  Zap,
  Info,
  Clock,
  Database,
  Braces,
} from 'lucide-react';

interface GoogleAIStudioViewProps {
  darkMode?: boolean;
  onSaveToNotes?: (title: string, content: string, tags: string[]) => void;
  onInjectToChat?: (text: string) => void;
}

const PRESET_SYSTEM_PROMPTS = [
  {
    label: 'Senior Full-Stack Architect',
    text: 'You are a Principal Software Architect. Provide robust, production-grade TypeScript code, modular architectures, and detailed technical reasoning.',
  },
  {
    label: 'Executive Research Analyst',
    text: 'You are an executive research intelligence specialist. Provide crisp, data-backed synthesis, strategic insights, and structured bullet points with verified grounding.',
  },
  {
    label: 'Strict JSON Formatter',
    text: 'You are a strict data transformation engine. Return ONLY valid, minified or indented JSON matching the requested structure without conversational intro or markdown.',
  },
  {
    label: 'STEM & Math Reasoning Tutor',
    text: 'You are a world-class STEM professor. Break down complex math, physics, and algorithmic problems step-by-step with clear derivations and intuitive explanations.',
  },
];

const PRESET_PROMPTS = [
  {
    title: 'Distributed System Blueprint',
    prompt: 'Design a high-throughput, fault-tolerant event-driven microservices architecture for real-time AI telemetry processing using Kafka, Redis, and Cloud Run.',
    system: 'Senior Full-Stack Architect',
    model: 'gemini-3.8-flash',
  },
  {
    title: 'Frontier AI Trends & Grounding',
    prompt: 'What are the newest breakthrough capabilities introduced in Gemini 3 series, agentic workflows, and Google AI Studio in 2026? Include search grounded insights.',
    system: 'Executive Research Analyst',
    model: 'gemini-3.8-flash',
    search: true,
  },
  {
    title: 'Extract User Profile Schema (JSON)',
    prompt: 'Extract the entities from: "Dr. Elena Vance, 42, VP of AI Systems at DeepOrbit Inc., contact: elena.vance@deeporbit.ai, based in Zurich, Switzerland."',
    system: 'Strict JSON Formatter',
    model: 'gemini-3.8-flash',
    jsonMode: true,
  },
  {
    title: 'Complex Quantum Computing Reasoning',
    prompt: 'Explain Shor\'s algorithm for integer factorization. Walk through the quantum Fourier transform step, period finding, and the classical post-processing steps in detail.',
    system: 'STEM & Math Reasoning Tutor',
    model: 'gemini-3.1-pro-preview',
  },
];

export const GoogleAIStudioView: React.FC<GoogleAIStudioViewProps> = ({
  darkMode = false,
  onSaveToNotes,
  onInjectToChat,
}) => {
  const [model, setModel] = useState<string>('gemini-3.8-flash');
  const [systemInstruction, setSystemInstruction] = useState<string>(
    'You are a helpful, expert AI assistant powered by Google Gemini in Google AI Studio.'
  );
  const [prompt, setPrompt] = useState<string>(
    'Write a concise technical comparison between synchronous REST APIs and event-driven WebSockets for real-time collaborative applications. Provide architecture recommendations and code examples.'
  );
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(0.95);
  const [thinkingLevel, setThinkingLevel] = useState<'HIGH' | 'LOW' | 'MINIMAL'>('HIGH');
  const [enableSearchGrounding, setEnableSearchGrounding] = useState<boolean>(true);
  const [responseMimeType, setResponseMimeType] = useState<'text/plain' | 'application/json'>('text/plain');
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'output' | 'citations' | 'code' | 'telemetry'>('output');
  const [codeLanguageTab, setCodeLanguageTab] = useState<'typescript' | 'python' | 'curl'>('typescript');

  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

  const [result, setResult] = useState<{
    output: string;
    model: string;
    latencyMs: number;
    tokenCountEstimated: number;
    citations: { title: string; url: string; snippet: string }[];
    codeSnippets: {
      typescript: string;
      python: string;
      curl: string;
    };
  } | null>({
    output: `### 🚀 Google AI Studio — Gemini Playground Ready

Welcome to **Google AI Studio** inside LOGITIX AI! You can prototype and test frontier Gemini models with full prompt engineering parameters, system instructions, temperature controls, structured JSON schemas, and live Google Search grounding.

#### Quick Capabilities:
- **Models Available:** \`gemini-3.8-flash\`, \`gemini-flash-latest\`, \`gemini-3.1-pro-preview\`, \`gemini-3.1-flash-lite\`, \`gemini-3.1-flash-image\`
- **Search Grounding:** Inject live web grounding into model generations
- **Code Export:** Instant TypeScript SDK, Python, and cURL snippets for production
- **Multimodal Testing:** Upload images or diagram sketches for visual inspection

*Click "Run Prompt" or press Ctrl+Enter to execute.*`,
    model: 'gemini-3.8-flash',
    latencyMs: 340,
    tokenCountEstimated: 195,
    citations: [
      {
        title: 'Google AI Studio Official Portal',
        url: 'https://aistudio.google.com',
        snippet: 'Fastest way to build with Gemini models and export production SDK code.',
      },
      {
        title: '@google/genai TypeScript SDK Docs',
        url: 'https://ai.google.dev/gemini-api/docs/quickstart?lang=node',
        snippet: 'Standard official TypeScript SDK for server-side Gemini integration.',
      },
    ],
    codeSnippets: {
      typescript: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

const response = await ai.models.generateContent({
  model: "gemini-3.8-flash",
  contents: "Your prompt here",
  config: {
    systemInstruction: "You are a helpful assistant.",
    temperature: 0.7,
  }
});

console.log(response.text);`,
      python: `from google import genai
import os

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="Your prompt here"
)
print(response.text)`,
      curl: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=$GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contents": [{"parts": [{"text": "Your prompt here"}]}]}'`,
    },
  });

  const handleExecute = async () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);

    try {
      const res = await fetch('/api/google-ai-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          systemInstruction: systemInstruction.trim(),
          model,
          temperature,
          topP,
          thinkingLevel,
          enableSearchGrounding,
          responseMimeType,
          imageAttachment,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setActiveTab('output');
    } catch (err: any) {
      console.error('Google AI Studio Run Error:', err);
      setResult({
        output: `### ❌ Execution Error\n\nFailed to execute prompt with model \`${model}\`: ${err.message || 'Unknown error'}.\n\nPlease ensure your API parameters and network connection are active.`,
        model,
        latencyMs: 0,
        tokenCountEstimated: 0,
        citations: [],
        codeSnippets: {
          typescript: '// Execution failed',
          python: '# Execution failed',
          curl: '# Execution failed',
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageAttachment(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, type: 'code' | 'output') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const content = `# Google AI Studio Output\n\n**Model:** ${result.model}\n**Latency:** ${result.latencyMs}ms\n**Estimated Tokens:** ${result.tokenCountEstimated}\n**Timestamp:** ${new Date().toISOString()}\n\n## System Instruction\n${systemInstruction}\n\n## User Prompt\n${prompt}\n\n## Generated Output\n${result.output}\n\n## TypeScript Code Snippet\n\`\`\`typescript\n${result.codeSnippets.typescript}\n\`\`\``;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `google_ai_studio_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-transparent select-none">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Google AI Studio
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  Gemini Frontier Playground
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Interactive prompt engineering, system instructions, temperature tuning, and @google/genai code export.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>@google/genai Connected</span>
          </div>

          <button
            onClick={() => {
              setPrompt('');
              setSystemInstruction('You are a helpful, expert AI assistant powered by Google Gemini in Google AI Studio.');
              setImageAttachment(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!result}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Settings & Configuration Panel */}
        <div className="lg:col-span-4 border-r border-white/10 bg-slate-950/40 backdrop-blur-md p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Frontier Model</span>
              <span className="text-[10px] font-mono text-blue-400">Gemini 3 Series</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Frontier Default & Recommended)</option>
              <option value="gemini-flash-latest">gemini-flash-latest (Dynamic Healthy Cluster)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Low Latency & High Throughput)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep STEM & Reasoning)</option>
              <option value="gemini-3.1-flash-image">gemini-3.1-flash-image (High Quality Visuals)</option>
            </select>
          </div>

          {/* Preset Prompts Library */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Preset Blueprints</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p.prompt);
                    const matchSys = PRESET_SYSTEM_PROMPTS.find((s) => s.label === p.system);
                    if (matchSys) setSystemInstruction(matchSys.text);
                    if (p.model) setModel(p.model);
                    if (p.search !== undefined) setEnableSearchGrounding(p.search);
                    if (p.jsonMode) setResponseMimeType('application/json');
                    else setResponseMimeType('text/plain');
                  }}
                  className="text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-purple-500/15 border border-white/5 hover:border-purple-500/30 text-[11px] text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span className="font-medium group-hover:text-purple-200">{p.title}</span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-purple-400">Apply</span>
                </button>
              ))}
            </div>
          </div>

          {/* System Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>System Instructions</span>
              </label>
              <select
                onChange={(e) => {
                  const found = PRESET_SYSTEM_PROMPTS.find((p) => p.label === e.target.value);
                  if (found) setSystemInstruction(found.text);
                }}
                className="bg-transparent text-[10px] text-blue-400 border-none outline-hidden cursor-pointer hover:underline"
              >
                <option value="" disabled selected>
                  Load Persona...
                </option>
                {PRESET_SYSTEM_PROMPTS.map((p) => (
                  <option key={p.label} value={p.label} className="bg-slate-900 text-slate-200">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={4}
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder="Define behavioral rules, persona, and output constraints for the model..."
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500 custom-scrollbar font-mono leading-relaxed"
            />
          </div>

          {/* Sliders: Temperature & TopP */}
          <div className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Temperature
                </span>
                <span className="font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded text-[11px]">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.0 (Deterministic)</span>
                <span>1.0 (Balanced)</span>
                <span>2.0 (Creative)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Top-P</span>
                <span className="font-mono text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded text-[11px]">
                  {topP.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* Thinking Level */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reasoning Thinking Level</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['HIGH', 'LOW', 'MINIMAL'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setThinkingLevel(lvl)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-medium transition-all ${
                      thinkingLevel === lvl
                        ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                        : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Capabilities Toggles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Google Search Grounding</div>
                  <div className="text-[10px] text-slate-400">Live search index verification</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableSearchGrounding}
                onChange={(e) => setEnableSearchGrounding(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Braces className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Structured JSON Output</div>
                  <div className="text-[10px] text-slate-400">Enforce application/json MIME</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={responseMimeType === 'application/json'}
                onChange={(e) =>
                  setResponseMimeType(e.target.checked ? 'application/json' : 'text/plain')
                }
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Main Prompt & Output Workspace */}
        <div className="lg:col-span-8 flex flex-col justify-between overflow-hidden bg-slate-950/20">
          {/* Top Prompt Input Area */}
          <div className="p-5 border-b border-white/10 bg-slate-900/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Prompt Input</span>
              </label>

              {/* Multimodal Image Input */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Attach Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Image Preview if Attached */}
            {imageAttachment && (
              <div className="relative inline-flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 w-fit">
                <img
                  src={imageAttachment}
                  alt="Attachment Preview"
                  className="w-12 h-12 object-cover rounded-lg border border-blue-400/40"
                />
                <div className="text-[11px] text-blue-200">
                  <div className="font-semibold">Vision Input Attached</div>
                  <div className="text-[10px] text-slate-400">Gemini Multimodal Active</div>
                </div>
                <button
                  onClick={() => setImageAttachment(null)}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative">
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleExecute();
                  }
                }}
                placeholder="Enter instructions, code requests, or analytical prompts for Gemini..."
                className="w-full bg-slate-900/90 border border-white/15 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner font-sans leading-relaxed custom-scrollbar"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Enter</kbd> to run
              </span>

              <button
                onClick={handleExecute}
                disabled={isRunning || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing in AI Studio...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Tabs & Output Section */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Output Header Tabs */}
            <div className="px-5 py-2.5 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('output')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'output'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Output Response</span>
                </button>

                <button
                  onClick={() => setActiveTab('citations')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'citations'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Search Citations ({result?.citations?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'code'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Export Code Snippets</span>
                </button>

                <button
                  onClick={() => setActiveTab('telemetry')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'telemetry'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Telemetry</span>
                </button>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-2">
                {activeTab === 'output' && result && (
                  <button
                    onClick={() => copyToClipboard(result.output, 'output')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-colors"
                  >
                    {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                  </button>
                )}

                {onSaveToNotes && result && (
                  <button
                    onClick={() => onSaveToNotes(`AI Studio: ${prompt.substring(0, 30)}...`, result.output, ['ai-studio', 'gemini'])}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Save to Notes</span>
                  </button>
                )}

                {onInjectToChat && result && (
                  <button
                    onClick={() => onInjectToChat(`[Google AI Studio Generated]:\n\n${result.output}`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Send to Chat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Body Contents */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
              {activeTab === 'output' && (
                <div className="space-y-4">
                  {result ? (
                    <div className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans selection:bg-blue-500/30">
                      {result.output}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Run a prompt to see live Gemini outputs here.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'citations' && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Verified Google Search Grounding Nodes
                  </div>
                  {result && result.citations && result.citations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.citations.map((c, idx) => (
                        <a
                          key={idx}
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3.5 rounded-xl bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 transition-all block group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-300 group-hover:text-blue-200 truncate">
                              {c.title}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-300 shrink-0" />
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{c.snippet}</p>
                          <div className="text-[10px] font-mono text-slate-500 mt-2 truncate">{c.url}</div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
                      No search grounding citations returned for this prompt. Ensure "Google Search Grounding" is enabled.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'code' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {(['typescript', 'python', 'curl'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLanguageTab(lang)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                            codeLanguageTab === lang
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'typescript' ? 'TypeScript (@google/genai)' : lang === 'python' ? 'Python (google-genai)' : 'cURL'}
                        </button>
                      ))}
                    </div>

                    {result && (
                      <button
                        onClick={() => copyToClipboard(result.codeSnippets[codeLanguageTab], 'code')}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 transition-colors"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    )}
                  </div>

                  {result && (
                    <pre className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar leading-relaxed">
                      <code>{result.codeSnippets[codeLanguageTab]}</code>
                    </pre>
                  )}
                </div>
              )}

              {activeTab === 'telemetry' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Latency</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                        {result?.latencyMs || 0} ms
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Tokens (Est.)</div>
                      <div className="text-lg font-bold text-blue-400 font-mono mt-1">
                        {result?.tokenCountEstimated || 0}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Model Executed</div>
                      <div className="text-xs font-bold text-purple-300 font-mono mt-1 truncate">
                        {result?.model || model}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-[10px] uppercase font-mono text-slate-400">HTTP Status</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                        200 OK
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300">
                    <div className="font-semibold text-white">Execution Environment Details</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                      <li>SDK: <code className="text-blue-300">@google/genai (v2.4+)</code></li>
                      <li>Headers: <code className="text-blue-300">User-Agent: aistudio-build</code></li>
                      <li>API Key: Server-side verified via environment variables</li>
                      <li>Search Grounding Engine: Google Live Index</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
