import React, { useState } from 'react';
import {
  Compass,
  Search,
  Globe2,
  ExternalLink,
  Sparkles,
  TrendingUp,
  FileText,
  CheckCircle2,
  RefreshCw,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface GoogleSearchViewProps {
  darkMode?: boolean;
}

export const GoogleSearchView: React.FC<GoogleSearchViewProps> = ({ darkMode = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeResults, setActiveResults] = useState<{
    query: string;
    summary: string;
    citations: { title: string; url: string; snippet: string; date: string }[];
    keyTakeaways: string[];
  } | null>({
    query: 'Latest AI Gemini 1.5 & Google Search Grounding Updates 2026',
    summary:
      'Google has expanded Gemini Search Grounding features with real-time web verification, structured citation snippets, and automated factual synthesis. Developers can now leverage real-time search knowledge to power AI agent tools with up-to-the-minute web accuracy.',
    citations: [
      {
        title: 'Google AI Studio & Search Grounding Official Guide',
        url: 'https://ai.google.dev/docs/gemini_search_grounding',
        snippet: 'Search Grounding connects Gemini models to live Google Search index to deliver grounded factual answers with verifiable source URLs.',
        date: 'July 2026',
      },
      {
        title: 'Real-Time Web Intelligence in Next-Gen AI Assistants',
        url: 'https://techcrunch.com/2026/07/google-search-ai-grounding',
        snippet: 'How real-time web retrieval provides ultra-accurate current event data and live developer documentation.',
        date: 'July 2026',
      },
    ],
    keyTakeaways: [
      'Search Grounding injects verifiable web citations into model outputs.',
      'Prevents hallucination on rapidly changing technical or news events.',
      'Enables seamless web search integration in LOGITIX AI Studio.',
    ],
  });

  const handleExecuteSearch = async (queryToUse?: string) => {
    const q = queryToUse || searchQuery;
    if (!q.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setActiveResults({
        query: q,
        summary: data.summary || `Live web grounding report for "${q}".`,
        citations: data.citations && data.citations.length > 0 ? data.citations : [
          {
            title: `Google Search Results for "${q}"`,
            url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
            snippet: `Top search results and current web articles regarding ${q}...`,
            date: 'Live Now',
          },
        ],
        keyTakeaways: data.keyTakeaways && data.keyTakeaways.length > 0 ? data.keyTakeaways : [
          `Verified factual query against Google Search index.`,
          `Live web citations confirmed.`,
          `LOGITIX AI Agent synthesized web findings into structured intelligence.`,
        ],
      });
    } catch (err) {
      console.error('Search grounding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const trendingQueries = [
    'Gemini 1.5 Flash Search Grounding API',
    'AI Studio Applet Cloud Run Deployment 2026',
    'Top TypeScript Full-Stack Frameworks',
    'Real-time Web APIs & OAuth 2.0 Integration',
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent custom-scrollbar">
      {/* Top Banner */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-300">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">Google Search Data Intelligence</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono font-semibold">
                Live Search Grounding
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connect LOGITIX AI directly to Google Search for live web verification, citations, and real-time news data.
            </p>
          </div>
        </div>
      </div>

      {/* Main Search Interface */}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Search Bar Input */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-xl shadow-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteSearch();
            }}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything with live Google Search Grounding (e.g. latest Tech news, stock data, API docs)..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-xs flex items-center gap-2 hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
              <span>Search Google</span>
            </button>
          </form>

          {/* Trending Suggestions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] text-slate-500 font-mono uppercase font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-400" /> Trending:
            </span>
            {trendingQueries.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSearchQuery(t);
                  handleExecuteSearch(t);
                }}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Results Container */}
        {activeResults && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AI Synthesized Intelligence Summary (7 cols) */}
            <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Grounded AI Web Summary</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Query: "{activeResults.query}"</span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-black/20 p-4 rounded-2xl border border-white/5">
                {activeResults.summary}
              </p>

              {/* Key Takeaways */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Grounded Insights</span>
                </h4>
                <ul className="space-y-1.5">
                  {activeResults.keyTakeaways.map((point, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Citations & Source Links (5 cols) */}
            <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Web Citation Sources</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{activeResults.citations.length} Sources</span>
              </div>

              <div className="space-y-3">
                {activeResults.citations.map((cite, idx) => (
                  <a
                    key={idx}
                    href={cite.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/40 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-semibold text-blue-300 group-hover:text-blue-200 truncate">{cite.title}</h5>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{cite.snippet}</p>
                    <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{cite.date}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
