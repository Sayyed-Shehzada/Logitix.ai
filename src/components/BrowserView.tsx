import React, { useState } from 'react';
import { Globe, Search, ArrowRight, ExternalLink, Sparkles, BookOpen, Check, RefreshCw } from 'lucide-react';

interface BrowserViewProps {
  darkMode?: boolean;
}

export const BrowserView: React.FC<BrowserViewProps> = ({ darkMode = false }) => {
  const [searchQuery, setSearchQuery] = useState('Python PySide6 vs Electron for AI Desktop Apps');
  const [isSearching, setIsSearching] = useState(false);
  const [searchSummary, setSearchSummary] = useState(
    'PySide6 is the modern standard for native Python desktop applications, offering lighter memory footprint, direct OS integration, hardware acceleration, and custom CSS-like QSS styling. When paired with Gemini AI agents, it enables a truly private AI executive OS experience.'
  );

  const [searchResults, setSearchResults] = useState([
    {
      title: 'PySide6 Official Qt for Python Documentation',
      url: 'https://doc.qt.io/qtforpython-6/',
      snippet: 'Official Python bindings for Qt6 offering high-performance native desktop GUI creation with custom QSS styling and C++ binding support.',
      date: 'Official Docs',
    },
    {
      title: 'Building AI Desktop Executive Applications with PySide6',
      url: 'https://developer.nvidia.com/blog/pyside6-ai-apps',
      snippet: 'Learn how to integrate local LLMs, Gemini API, and custom agent controllers into modular PySide6 desktop applications.',
      date: 'Tech Guide',
    },
    {
      title: 'Advanced AI Assistant Architectures with Gemini API',
      url: 'https://ai.google.dev/docs',
      snippet: 'Build real-time, multimodal AI agents with search grounding, function calling, and structured JSON outputs.',
      date: 'API Docs',
    },
  ]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.summary) {
        setSearchSummary(data.summary);
      }
      if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
        setSearchResults(data.citations);
      }
    } catch (err) {
      console.error('Browser Search Error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Globe className="w-5 h-5 text-blue-400" />
            Browser & Research Tool
          </h2>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Search the web, extract webpage summaries, gather live research, and cite sources in real-time.
          </p>
        </div>
      </div>

      {/* URL & Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the web or paste URL to summarize..."
            className={`w-full h-10 pl-9 pr-4 rounded-xl border text-xs focus:outline-none ${
              darkMode
                ? 'bg-white/5 border-white/10 text-white focus:border-white/20'
                : 'bg-white border-slate-200 text-slate-900 focus:border-blue-400 shadow-xs'
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="px-5 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-xs flex items-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all shadow-md shadow-purple-500/20 border border-white/10 cursor-pointer disabled:opacity-50"
        >
          {isSearching ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-200" />
              <span>Searching Web...</span>
            </>
          ) : (
            <span>Execute Search</span>
          )}
        </button>
      </form>

      {/* Web Agent Research Summary */}
      {searchSummary && (
        <div className={`p-5 rounded-2xl border space-y-3 shadow-xl backdrop-blur-2xl ${
          darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
            <h3 className={`text-xs font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Sparkles className="w-4 h-4 text-purple-400" />
              LOGITIX Web Agent Synthesis
            </h3>
            <span className="text-[10px] text-blue-500 font-mono font-bold">Grounding Verified</span>
          </div>
          <p className={`text-xs leading-relaxed font-sans whitespace-pre-line ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {searchSummary}
          </p>
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-3">
        <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Web Grounding Results ({searchResults.length})
        </h3>
        {searchResults.map((res, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border transition-all space-y-1.5 backdrop-blur-2xl ${
              darkMode ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <a
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-purple-500 transition-colors flex items-center gap-1.5"
              >
                {res.title} <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <span className={`text-[10px] font-mono truncate max-w-[200px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{res.url}</span>
            </div>
            <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{res.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

