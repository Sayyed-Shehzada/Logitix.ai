import React, { useState, useMemo } from 'react';
import { Message, ChatMessage } from '../types.js';
import {
  exportConversationAsPDF,
  exportCodeSnippetAsPDF,
  exportAsMarkdown,
  extractCodeSnippetsFromMessages,
  ExtractedCodeSnippet,
} from '../utils/exportConversation.js';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: (Message | ChatMessage)[];
  currentTitle?: string;
  onShowToast?: (msg: string) => void;
  onRecordActivity?: (operation: any) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  messages,
  currentTitle = 'LOGITIX Multi-AI Consensus Session',
  onShowToast,
  onRecordActivity,
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'snippets'>('conversation');
  const [docTitle, setDocTitle] = useState(currentTitle);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'md'>('pdf');
  const [includeCode, setIncludeCode] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeLineNumbers, setIncludeLineNumbers] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState<string | null>(null);

  // Extract all code snippets in conversation
  const codeSnippets = useMemo(() => {
    return extractCodeSnippetsFromMessages(messages);
  }, [messages]);

  if (!isOpen) return null;

  const handleExportConversation = () => {
    if (messages.length === 0) {
      if (onShowToast) onShowToast('No messages available in the active session to export.');
      return;
    }

    setIsExporting(true);
    setTimeout(() => {
      try {
        if (exportFormat === 'pdf') {
          exportConversationAsPDF(messages, {
            title: docTitle.trim() || 'Logitix Multi-AI Session',
            includeCode,
            includeMetrics,
            includeLineNumbers,
          });
          setExportedSuccess('Conversation PDF downloaded successfully!');
          if (onShowToast) onShowToast('Conversation PDF generated and downloaded.');
          if (onRecordActivity) {
            onRecordActivity({
              type: 'pdf',
              title: 'Exported PDF',
              description: `Session Report: ${docTitle.trim() || 'Multi-AI Synthesis'}`,
              view: 'chat-studio',
              icon: 'picture_as_pdf',
              badge: 'Session PDF',
              badgeColor: '#ef4444',
            });
          }
        } else {
          exportAsMarkdown(messages, docTitle.trim() || 'Logitix Multi-AI Session');
          setExportedSuccess('Markdown file downloaded successfully!');
          if (onShowToast) onShowToast('Markdown (.md) generated and downloaded.');
          if (onRecordActivity) {
            onRecordActivity({
              type: 'pdf',
              title: 'Exported Markdown',
              description: `Markdown: ${docTitle.trim() || 'Multi-AI Synthesis'}`,
              view: 'chat-studio',
              icon: 'description',
              badge: 'Session Markdown',
              badgeColor: '#6366f1',
            });
          }
        }
      } catch (err) {
        console.error('Export error:', err);
        if (onShowToast) onShowToast('Export failed. Please check console.');
      } finally {
        setIsExporting(false);
        setTimeout(() => setExportedSuccess(null), 3000);
      }
    }, 400);
  };

  const handleExportSingleSnippet = (snippet: ExtractedCodeSnippet) => {
    try {
      exportCodeSnippetAsPDF({
        code: snippet.code,
        title: snippet.title,
        language: snippet.language,
        sourceContext: `Session: ${docTitle}`,
        includeLineNumbers,
      });
      if (onShowToast) {
        onShowToast(`Exported "${snippet.title}" to formatted PDF.`);
      }
      if (onRecordActivity) {
        onRecordActivity({
          type: 'pdf',
          title: 'Exported PDF',
          description: `Code Snippet: ${snippet.title} (${snippet.language})`,
          view: 'chat-studio',
          icon: 'picture_as_pdf',
          badge: 'Code PDF',
          badgeColor: '#ef4444',
        });
      }
    } catch (err) {
      console.error('Code snippet export error:', err);
      if (onShowToast) onShowToast('Failed to export code snippet.');
    }
  };

  const handleExportAllSnippets = () => {
    if (codeSnippets.length === 0) return;
    setIsExporting(true);
    let count = 0;
    codeSnippets.forEach((snippet, index) => {
      setTimeout(() => {
        exportCodeSnippetAsPDF({
          code: snippet.code,
          title: snippet.title,
          language: snippet.language,
          sourceContext: `Session: ${docTitle} (Batch ${index + 1}/${codeSnippets.length})`,
          includeLineNumbers,
        });
        count++;
        if (count === codeSnippets.length) {
          setIsExporting(false);
          if (onShowToast) onShowToast(`Exported all ${count} code snippets as PDFs.`);
        }
      }, index * 350);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#e2e2e2] shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-5 bg-[#1a146b] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-cyan-300 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
            </div>
            <div>
              <h2 className="font-semibold text-base leading-tight">
                Export Session & Code to PDF
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Formatted offline documents for executive review, archiving, and code reference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[#e2e2e2] bg-[#f9f9f8] px-6">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'conversation'
                ? 'border-[#1a146b] text-[#1a146b]'
                : 'border-transparent text-[#777682] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">forum</span>
            <span>Full Conversation ({messages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('snippets')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'snippets'
                ? 'border-[#1a146b] text-[#1a146b]'
                : 'border-transparent text-[#777682] hover:text-[#1a1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">code_blocks</span>
            <span>Code Snippets ({codeSnippets.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'conversation' ? (
            <div className="space-y-4">
              {/* Document Title */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1c1c] mb-1.5">
                  Document Header Title
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#e2e2e2] bg-[#f9f9f8] focus:bg-white focus:border-[#1a146b] outline-none transition-all"
                  placeholder="Enter custom conversation title for the PDF header..."
                />
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1c1c] mb-2">
                  Export Document Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      exportFormat === 'pdf'
                        ? 'border-[#1a146b] bg-[#e2dfff]/20 ring-1 ring-[#1a146b]'
                        : 'border-[#e2e2e2] bg-white hover:bg-[#f9f9f8]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1a1c1c]">Formatted PDF (.pdf)</div>
                      <p className="text-[11px] text-[#777682] mt-0.5 leading-snug">
                        Multi-page layout with headers, code boxes, line numbers & executive stats
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('md')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      exportFormat === 'md'
                        ? 'border-[#1a146b] bg-[#e2dfff]/20 ring-1 ring-[#1a146b]'
                        : 'border-[#e2e2e2] bg-white hover:bg-[#f9f9f8]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1a1c1c]">Markdown Archive (.md)</div>
                      <p className="text-[11px] text-[#777682] mt-0.5 leading-snug">
                        Raw structured Markdown for GitHub, Obsidian, or developer wikis
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* PDF Inclusion Options */}
              {exportFormat === 'pdf' && (
                <div className="p-4 rounded-2xl bg-[#f9f9f8] border border-[#e2e2e2] space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#1a146b] font-code">
                    PDF Formatting Options
                  </div>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#1a1c1c] font-medium">Format Code in Monospace Syntax Cards</span>
                    <input
                      type="checkbox"
                      checked={includeCode}
                      onChange={(e) => setIncludeCode(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1a146b] accent-[#1a146b] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#1a1c1c] font-medium">Include Multi-AI Consensus & Latency Stats</span>
                    <input
                      type="checkbox"
                      checked={includeMetrics}
                      onChange={(e) => setIncludeMetrics(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1a146b] accent-[#1a146b] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#1a1c1c] font-medium">Show Line Numbers on Code Snippets</span>
                    <input
                      type="checkbox"
                      checked={includeLineNumbers}
                      onChange={(e) => setIncludeLineNumbers(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1a146b] accent-[#1a146b] cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* Stats overview */}
              <div className="flex items-center justify-between text-xs text-[#777682] px-2">
                <span>Total Messages: <strong className="text-[#1a1c1c]">{messages.length}</strong></span>
                <span>Code Snippets Detected: <strong className="text-[#1a1c1c]">{codeSnippets.length}</strong></span>
                <span>Page Size: <strong className="text-[#1a1c1c]">A4 Standard</strong></span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1a1c1c]">
                    Detected Code Snippets in Conversation
                  </h3>
                  <p className="text-[11px] text-[#777682]">
                    Export any specific snippet into its own formatted, multi-page reference PDF.
                  </p>
                </div>
                {codeSnippets.length > 1 && (
                  <button
                    onClick={handleExportAllSnippets}
                    disabled={isExporting}
                    className="px-3 py-1.5 rounded-xl bg-[#1a146b] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-900 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">file_download</span>
                    <span>Export All ({codeSnippets.length})</span>
                  </button>
                )}
              </div>

              {codeSnippets.length === 0 ? (
                <div className="p-8 text-center bg-[#f9f9f8] rounded-2xl border border-dashed border-[#e2e2e2]">
                  <span className="material-symbols-outlined text-[36px] text-zinc-400">code_off</span>
                  <p className="text-xs font-semibold text-[#1a1c1c] mt-2">
                    No code snippets found in current conversation
                  </p>
                  <p className="text-[11px] text-[#777682] mt-1 max-w-sm mx-auto">
                    Ask the Logitix Multi-AI engine to write code or solve a programming task in Chat Studio to generate code artifacts.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {codeSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="p-3.5 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs hover:border-[#1a146b]/50 transition-all flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-code font-bold uppercase px-2 py-0.5 rounded bg-[#e2dfff] text-[#1a146b]">
                            {snippet.language}
                          </span>
                          <span className="text-xs font-semibold text-[#1a1c1c]">
                            {snippet.title}
                          </span>
                        </div>
                        <div className="text-[11px] font-code text-[#777682]">
                          {snippet.lineCount} lines • {snippet.timestamp}
                        </div>
                      </div>

                      {/* Code preview snippet */}
                      <pre className="p-2.5 rounded-xl bg-[#1e1e2e] text-[#cdd6f4] font-code text-[11px] max-h-24 overflow-x-auto overflow-y-hidden leading-relaxed">
                        <code>{snippet.code.slice(0, 300)}{snippet.code.length > 300 ? '...' : ''}</code>
                      </pre>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-[#777682]">
                          From: {snippet.sender === 'user' ? 'User message' : 'LOGITIX consensus answer'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(snippet.code);
                              if (onShowToast) onShowToast('Code copied to clipboard.');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[#e2e2e2] text-[11px] font-medium text-[#1a1c1c] hover:bg-[#f9f9f8] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            <span>Copy</span>
                          </button>
                          <button
                            onClick={() => handleExportSingleSnippet(snippet)}
                            className="px-3 py-1 rounded-lg bg-[#1a146b] text-white text-[11px] font-semibold hover:bg-indigo-900 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                            <span>Export PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {exportedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span>{exportedSuccess}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#f9f9f8] border-t border-[#e2e2e2] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#474651] hover:bg-[#e8e8e7] transition-all cursor-pointer"
          >
            Cancel
          </button>

          {activeTab === 'conversation' ? (
            <button
              onClick={handleExportConversation}
              disabled={isExporting || messages.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-[#1a146b] hover:bg-indigo-900 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Document...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    {exportFormat === 'pdf' ? 'picture_as_pdf' : 'download'}
                  </span>
                  <span>
                    {exportFormat === 'pdf' ? 'Download Formatted PDF' : 'Download Markdown (.md)'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <div className="text-[11px] text-[#777682] font-code">
              {codeSnippets.length} Snippet{codeSnippets.length === 1 ? '' : 's'} available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
