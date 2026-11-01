import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Pin,
  Search,
  Copy,
  Download,
  Check,
  Tag,
  BookOpen,
  Sparkles,
  AlignLeft,
  Clock,
  Layout,
  Type,
  Maximize2
} from 'lucide-react';
import { NoteItem } from '../types.js';

interface NotepadViewProps {
  notes: NoteItem[];
  onAddNote: (note: { title?: string; content?: string; category?: NoteItem['category']; tags?: string[] }) => NoteItem | void;
  onUpdateNote: (id: string, updates: Partial<NoteItem>) => void;
  onDeleteNote: (id: string) => void;
  darkMode?: boolean;
}

export const NotepadView: React.FC<NotepadViewProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  darkMode = false,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [fontFamily, setFontFamily] = useState<'sans' | 'mono' | 'serif'>('sans');
  const [copied, setCopied] = useState(false);

  // Local buffered text state for zero-input-latency typing
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');

  // Categories list
  const categories: NoteItem['category'][] = ['General', 'Personal', 'Work', 'Ideas', 'To-Do', 'Code'];

  // Select first note by default if available and none selected
  useEffect(() => {
    if (notes.length > 0 && (!selectedNoteId || !notes.some((n) => n.id === selectedNoteId))) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  const activeNote = notes.find((n) => n.id === selectedNoteId);

  // Sync local editor buffers whenever active note changes
  useEffect(() => {
    if (activeNote) {
      setLocalTitle(activeNote.title);
      setLocalContent(activeNote.content);
    } else {
      setLocalTitle('');
      setLocalContent('');
    }
  }, [activeNote?.id]);

  // Debounced parent state sync (300ms) to keep typing silky smooth without laggy re-renders
  useEffect(() => {
    if (!activeNote) return;
    if (localTitle === activeNote.title && localContent === activeNote.content) return;

    const timer = setTimeout(() => {
      onUpdateNote(activeNote.id, { title: localTitle, content: localContent });
    }, 250);

    return () => clearTimeout(timer);
  }, [localTitle, localContent, activeNote?.id]);

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Pinned'
        ? n.isPinned
        : n.category === selectedCategory;

    const matchesQuery =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesQuery;
  });

  // Sort pinned first, then by updatedAt desc
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleCreateNote = () => {
    const res = onAddNote({
      title: 'Untitled Note',
      content: '',
      category: 'General',
      tags: [],
    });
    if (res && res.id) {
      setSelectedNoteId(res.id);
    }
  };

  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(`${localTitle}\n\n${localContent}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeNote) return;
    const blob = new Blob([`${localTitle}\n\n${localContent}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localTitle.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Word & character counts based on instant local buffer
  const wordCount = localContent ? localContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = localContent ? localContent.length : 0;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden w-full z-10">
      {/* LEFT SIDEBAR: Notes Navigation & Library */}
      <div
        className={`w-full md:w-80 border-r flex flex-col flex-shrink-0 transition-colors ${
          darkMode ? 'bg-[#0a0d18]/90 border-white/5' : 'bg-slate-50/90 border-slate-200'
        }`}
      >
        {/* Header & New Note Button */}
        <div className={`p-4 border-b space-y-3 ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`font-bold text-base tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Notepad
                </h2>
                <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateNote}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-8 pl-8 pr-3 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-all ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {['All', 'Pinned', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? darkMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-amber-500 text-white font-semibold shadow-xs'
                    : darkMode
                    ? 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat === 'Pinned' ? '📌 Pinned' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {sortedNotes.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border ${
                darkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <FileText className="w-6 h-6" />
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {searchQuery ? 'No notes match your search' : 'No notes found'}
              </p>
              <button
                onClick={handleCreateNote}
                className="text-xs text-amber-500 hover:underline font-medium cursor-pointer"
              >
                + Create your first note
              </button>
            </div>
          ) : (
            sortedNotes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isSelected
                      ? darkMode
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                        : 'bg-amber-50 border-amber-300 shadow-xs'
                      : darkMode
                      ? 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-xs font-semibold truncate flex-1 ${
                        isSelected
                          ? darkMode
                            ? 'text-amber-300'
                            : 'text-amber-900'
                          : darkMode
                          ? 'text-slate-200'
                          : 'text-slate-800'
                      }`}
                    >
                      {note.title.trim() || 'Untitled Note'}
                    </h3>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          darkMode ? 'hover:bg-white/10 text-slate-500 hover:text-red-400' : 'hover:bg-slate-200 text-slate-400 hover:text-red-600'
                        }`}
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className={`text-[11px] line-clamp-2 my-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {note.content.trim() || 'Empty note...'}
                  </p>

                  <div className="flex items-center justify-between text-[9px] mt-1 text-slate-500 font-mono">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      {note.category || 'General'}
                    </span>
                    <span>{new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN PANEL: Active Note Text Editor */}
      {activeNote ? (
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${
          darkMode ? 'bg-[#080b14]' : 'bg-white'
        }`}>
          {/* Top Window Title Bar */}
          <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono select-none ${
            darkMode ? 'border-white/10 bg-[#0d1120] text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className={`text-xs font-bold font-sans ml-2 truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {localTitle.trim() || 'Untitled Note'} — Notepad
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Prominent Copy All Button */}
              <button
                onClick={handleCopy}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  copied
                    ? 'bg-emerald-500 text-white border border-emerald-400'
                    : darkMode
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
                title="Copy all typed text in this note"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied All!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All Text</span>
                  </>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{new Date(activeNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Editor Controls & Title Input */}
          <div className={`p-3 md:p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            darkMode ? 'border-white/5 bg-[#0a0d18]/50' : 'border-slate-200 bg-slate-50/50'
          }`}>
            {/* Title Input Bar */}
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <span className={`text-xs font-bold uppercase tracking-wider font-mono ${darkMode ? 'text-amber-400/80' : 'text-amber-600'}`}>
                Title:
              </span>
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="Enter note title..."
                className={`text-base sm:text-lg font-bold bg-transparent focus:outline-none flex-1 border-b pb-0.5 transition-colors ${
                  darkMode
                    ? 'text-white border-white/10 focus:border-amber-500 placeholder:text-slate-600'
                    : 'text-slate-900 border-slate-200 focus:border-amber-500 placeholder:text-slate-400'
                }`}
              />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Selector */}
              <select
                value={activeNote.category || 'General'}
                onChange={(e) => onUpdateNote(activeNote.id, { category: e.target.value as NoteItem['category'] })}
                className={`h-8 px-2.5 rounded-xl border text-xs focus:outline-none cursor-pointer ${
                  darkMode
                    ? 'bg-white/5 border-white/10 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {categories.map((c) => (
                  <option key={c} value={c} className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Pin Toggle Button */}
              <button
                onClick={() => onUpdateNote(activeNote.id, { isPinned: !activeNote.isPinned })}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  activeNote.isPinned
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : darkMode
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title={activeNote.isPinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className={`w-3.5 h-3.5 ${activeNote.isPinned ? 'fill-amber-400' : ''}`} />
              </button>

              {/* Font Toggle */}
              <div className={`flex rounded-xl border p-0.5 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  onClick={() => setFontFamily('sans')}
                  className={`px-2 py-1 text-[10px] font-sans rounded-lg font-semibold transition-all cursor-pointer ${
                    fontFamily === 'sans' ? (darkMode ? 'bg-white/20 text-white' : 'bg-white text-slate-900 shadow-xs') : 'text-slate-400'
                  }`}
                  title="Sans Serif Font"
                >
                  Sans
                </button>
                <button
                  onClick={() => setFontFamily('mono')}
                  className={`px-2 py-1 text-[10px] font-mono rounded-lg font-semibold transition-all cursor-pointer ${
                    fontFamily === 'mono' ? (darkMode ? 'bg-white/20 text-white' : 'bg-white text-slate-900 shadow-xs') : 'text-slate-400'
                  }`}
                  title="Monospace Code Font"
                >
                  Mono
                </button>
                <button
                  onClick={() => setFontFamily('serif')}
                  className={`px-2 py-1 text-[10px] font-serif rounded-lg font-semibold transition-all cursor-pointer ${
                    fontFamily === 'serif' ? (darkMode ? 'bg-white/20 text-white' : 'bg-white text-slate-900 shadow-xs') : 'text-slate-400'
                  }`}
                  title="Serif Font"
                >
                  Serif
                </button>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Export .txt file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Delete Note Button */}
              <button
                onClick={() => onDeleteNote(activeNote.id)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                    : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                }`}
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Text Editor Area */}
          <div className="flex-1 relative p-4 md:p-6 overflow-y-auto custom-scrollbar">
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Start typing your note here..."
              className={`w-full h-full min-h-[400px] resize-none bg-transparent focus:outline-none text-sm leading-relaxed ${
                fontFamily === 'mono' ? 'font-mono' : fontFamily === 'serif' ? 'font-serif text-base' : 'font-sans'
              } ${darkMode ? 'text-slate-100 placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`}
            />
          </div>

          {/* Bottom Status Bar */}
          <div className={`px-4 py-2 border-t flex items-center justify-between text-xs font-mono ${
            darkMode ? 'border-white/5 bg-[#0a0d18]/80 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}>
            <div className="flex items-center gap-4">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Auto-saved {new Date(activeNote.updatedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border ${
            darkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}>
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>No Note Selected</h3>
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Select a note from the left panel or create a brand new note.
            </p>
          </div>
          <button
            onClick={handleCreateNote}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Note</span>
          </button>
        </div>
      )}
    </div>
  );
};
