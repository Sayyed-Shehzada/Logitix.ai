import React, { useState, useEffect } from 'react';
import {
  CollaboratorUser,
  SlideCommentThread,
  CommentCategory,
} from '../../types/collaborator';
import {
  PresentationDeckPlan,
  ColorPaletteSuggestion,
  TypographyStyleSuggestion,
} from '../../types';
import { CollaboratorPresenceBar } from './CollaboratorPresenceBar';
import { CollaboratorDiscussionPanel } from './CollaboratorDiscussionPanel';
import { SlideCommentPinOverlay } from './SlideCommentPinOverlay';
import {
  Users,
  MessageSquare,
  Sparkles,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Columns,
  Eye,
  CheckCircle2,
  Download,
  Zap,
} from 'lucide-react';

interface CollaboratorDeckViewProps {
  deckPlan: PresentationDeckPlan;
  collaborators: CollaboratorUser[];
  threads: SlideCommentThread[];
  currentUser: CollaboratorUser;
  activePalette: ColorPaletteSuggestion;
  activeTypography: TypographyStyleSuggestion;
  isSimulationActive: boolean;
  onToggleSimulation: () => void;
  onSimulateTeammateComment: () => void;
  onAddComment: (
    slideId: string,
    content: string,
    category: CommentCategory,
    pinPosition?: { xPercent: number; yPercent: number }
  ) => void;
  onAddReply: (threadId: string, content: string) => void;
  onResolveThread: (threadId: string) => void;
  onReopenThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onToggleReaction: (threadId: string, emoji: string) => void;
  onExportPDF?: () => void;
  onExportPPTX?: () => void;
  onCreateGoogleSlides?: () => void;
}

export const CollaboratorDeckView: React.FC<CollaboratorDeckViewProps> = ({
  deckPlan,
  collaborators,
  threads,
  currentUser,
  activePalette,
  activeTypography,
  isSimulationActive,
  onToggleSimulation,
  onSimulateTeammateComment,
  onAddComment,
  onAddReply,
  onResolveThread,
  onReopenThread,
  onDeleteThread,
  onToggleReaction,
  onExportPDF,
  onExportPPTX,
  onCreateGoogleSlides,
}) => {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(true);
  const [viewLayout, setViewLayout] = useState<'split' | 'grid'>('split');
  const [pendingPin, setPendingPin] = useState<{
    slideId: string;
    xPercent: number;
    yPercent: number;
  } | null>(null);

  const slides = deckPlan.slides;
  const currentSlide = slides[activeSlideIndex] || slides[0];

  // Auto-select slide when thread is selected
  useEffect(() => {
    if (selectedThreadId) {
      const targetThread = threads.find((t) => t.id === selectedThreadId);
      if (targetThread) {
        const sIndex = slides.findIndex((s) => s.id === targetThread.slideId);
        if (sIndex !== -1) {
          setActiveSlideIndex(sIndex);
        }
      }
    }
  }, [selectedThreadId, threads, slides]);

  const handlePlacePin = (slideId: string, xPercent: number, yPercent: number) => {
    setPendingPin({ slideId, xPercent, yPercent });
    setIsPinningMode(false);
    setIsDiscussionOpen(true);
    // Prompt or open comment box pre-targeted to this pin
  };

  const handleScrollToSlide = (slideId: string) => {
    const sIndex = slides.findIndex((s) => s.id === slideId);
    if (sIndex !== -1) {
      setActiveSlideIndex(sIndex);
      const el = document.getElementById(`slide_preview_${slideId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Real-time Collaborator Presence Top Bar */}
      <CollaboratorPresenceBar
        collaborators={collaborators}
        threads={threads}
        isSimulationActive={isSimulationActive}
        isPinningMode={isPinningMode}
        isDiscussionOpen={isDiscussionOpen}
        activeSlideNumber={currentSlide ? currentSlide.slideNumber : 1}
        onToggleSimulation={onToggleSimulation}
        onSimulateTeammateComment={onSimulateTeammateComment}
        onTogglePinningMode={() => setIsPinningMode(!isPinningMode)}
        onToggleDiscussion={() => setIsDiscussionOpen(!isDiscussionOpen)}
      />

      {/* Main Review Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Center Column: Slides Presentation & Interactive Canvas */}
        <div className={isDiscussionOpen ? 'lg:col-span-7 xl:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {/* Deck Header & Mode Switcher */}
          <div className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-code text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-[#1a146b] border border-indigo-200 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Collaborator Review Mode</span>
                </span>
                <span className="text-[10px] font-code text-zinc-500">
                  {slides.length} Slides • {threads.length} Feedback Threads
                </span>
              </div>
              <h2
                className="font-bold text-base text-[#1a1c1c] truncate"
                style={{ fontFamily: activeTypography.headlineFont }}
              >
                {deckPlan.title}
              </h2>
              <p className="text-xs text-[#52525e] truncate">
                {deckPlan.subtitle || `${deckPlan.conditions.audience} • Theme: ${deckPlan.conditions.theme}`}
              </p>
            </div>

            {/* Quick Layout Controls */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="flex items-center p-0.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewLayout('split')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    viewLayout === 'split' ? 'bg-white text-[#1a146b] shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Single slide presentation view with pins"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Presenter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    viewLayout === 'grid' ? 'bg-white text-[#1a146b] shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="All slides vertical review list"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>All Slides</span>
                </button>
              </div>

              {!isDiscussionOpen && (
                <button
                  type="button"
                  onClick={() => setIsDiscussionOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#1a146b] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Comments ({threads.filter((t) => t.status === 'open').length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Pin Placement Feedback Banner if active */}
          {pendingPin && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-2 text-xs text-indigo-950 animate-in fade-in">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Pin dropped at <strong>{pendingPin.xPercent}%, {pendingPin.yPercent}%</strong> on Slide #{currentSlide.slideNumber}!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddComment(
                      pendingPin.slideId,
                      'Please verify this section for board presentation review.',
                      'suggestion',
                      { xPercent: pendingPin.xPercent, yPercent: pendingPin.yPercent }
                    );
                    setPendingPin(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#1a146b] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Pin
                </button>
                <button
                  type="button"
                  onClick={() => setPendingPin(null)}
                  className="text-zinc-500 hover:text-zinc-800 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* PRESENTER VIEW (1 Slide at a time with Navigation & Full 16:9 Canvas) */}
          {viewLayout === 'split' && currentSlide && (
            <div className="space-y-3">
              {/* Slide Navigation Pagination */}
              <div className="flex items-center justify-between px-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-700">
                    Slide {activeSlideIndex + 1} of {slides.length}
                  </span>
                  <span className="text-[10px] font-code px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 uppercase font-bold">
                    {currentSlide.layout.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeSlideIndex === 0}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 transition-all cursor-pointer"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-700" />
                  </button>

                  {slides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`w-6 h-6 rounded-lg text-xs font-code font-bold transition-all cursor-pointer ${
                        idx === activeSlideIndex
                          ? 'bg-[#1a146b] text-white shadow-2xs'
                          : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                    disabled={activeSlideIndex === slides.length - 1}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 transition-all cursor-pointer"
                    title="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-700" />
                  </button>
                </div>
              </div>

              {/* 16:9 High-Fidelity Slide Canvas with Pin Overlay */}
              <div
                id={`slide_preview_${currentSlide.id}`}
                className="relative rounded-2xl border border-zinc-300 shadow-md overflow-hidden aspect-[16/9] transition-all select-none"
                style={{
                  backgroundColor: activePalette.surfaceBg,
                  color: activePalette.bodyColor,
                }}
              >
                {/* Active Slide Collaborators Presence Banner */}
                {collaborators.filter(
                  (c) => c.activeSlideId === currentSlide.id || c.activeSlideNumber === currentSlide.slideNumber
                ).length > 0 && (
                  <div className="absolute top-3 right-3 z-25 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 px-2.5 rounded-full shadow-md border border-black/10 text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-zinc-800">
                      {
                        collaborators.find(
                          (c) => c.activeSlideId === currentSlide.id || c.activeSlideNumber === currentSlide.slideNumber
                        )?.name
                      }{' '}
                      is reviewing
                    </span>
                  </div>
                )}

                {/* Live Pins & Cursors Overlay */}
                <SlideCommentPinOverlay
                  slideId={currentSlide.id}
                  slideNumber={currentSlide.slideNumber}
                  threads={threads}
                  activeCollaborators={collaborators}
                  selectedThreadId={selectedThreadId}
                  isPinningMode={isPinningMode}
                  onSelectThread={(id) => {
                    setSelectedThreadId(id);
                    setIsDiscussionOpen(true);
                  }}
                  onPlacePin={handlePlacePin}
                  onCancelPinning={() => setIsPinningMode(false)}
                />

                {/* Render Slide Content according to Layout */}
                <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
                  {/* Slide Top Bar */}
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: `${activePalette.cardBorder}40` }}>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-code text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${activePalette.primaryAccent}15`,
                          color: activePalette.primaryAccent,
                        }}
                      >
                        0{currentSlide.slideNumber}
                      </span>
                      <span className="text-[11px] font-semibold opacity-70 tracking-wide uppercase">
                        {deckPlan.conditions.templateCategory || 'Executive'} Deck
                      </span>
                    </div>

                    <div className="text-[10px] font-code opacity-60">
                      {deckPlan.title.slice(0, 30)}
                    </div>
                  </div>

                  {/* Slide Main Body */}
                  <div className="my-auto space-y-4">
                    {/* Header */}
                    <div>
                      <h3
                        className="text-lg sm:text-2xl font-extrabold tracking-tight leading-tight"
                        style={{
                          fontFamily: activeTypography.headlineFont,
                          color: activePalette.titleColor,
                        }}
                      >
                        {currentSlide.title}
                      </h3>
                      {currentSlide.subtitle && (
                        <p
                          className="text-xs sm:text-sm mt-1 opacity-80"
                          style={{ fontFamily: activeTypography.bodyFont }}
                        >
                          {currentSlide.subtitle}
                        </p>
                      )}
                    </div>

                    {/* TWO COLUMNS LAYOUT */}
                    {currentSlide.layout === 'TWO_COLUMNS' && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div
                          className="p-3.5 rounded-xl border space-y-1.5 shadow-2xs"
                          style={{
                            backgroundColor: activePalette.cardBg,
                            borderColor: activePalette.cardBorder,
                          }}
                        >
                          <div
                            className="font-bold uppercase text-[10px] font-code"
                            style={{ color: activePalette.primaryAccent }}
                          >
                            Architecture Pillars
                          </div>
                          <ul className="space-y-1 opacity-90" style={{ fontFamily: activeTypography.bodyFont }}>
                            {(currentSlide.leftColumn || currentSlide.bullets?.slice(0, 3) || []).map((b, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="font-bold">•</span>
                                <span className="leading-snug">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div
                          className="p-3.5 rounded-xl border space-y-1.5 shadow-2xs"
                          style={{
                            backgroundColor: activePalette.cardBg,
                            borderColor: activePalette.cardBorder,
                          }}
                        >
                          <div
                            className="font-bold uppercase text-[10px] font-code"
                            style={{ color: activePalette.secondaryAccent }}
                          >
                            Execution & Strategy
                          </div>
                          <ul className="space-y-1 opacity-90" style={{ fontFamily: activeTypography.bodyFont }}>
                            {(currentSlide.rightColumn || currentSlide.bullets?.slice(3) || []).map((b, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="font-bold">•</span>
                                <span className="leading-snug">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* METRIC HIGHLIGHT LAYOUT */}
                    {(currentSlide.layout === 'METRIC_HIGHLIGHT' || currentSlide.metric) && (
                      <div className="grid grid-cols-3 gap-3">
                        <div
                          className="p-4 rounded-xl border text-center flex flex-col justify-center shadow-2xs"
                          style={{
                            backgroundColor: activePalette.cardBg,
                            borderColor: activePalette.cardBorder,
                          }}
                        >
                          <span
                            className="text-2xl sm:text-3xl font-extrabold leading-none"
                            style={{
                              color: activePalette.primaryAccent,
                              fontFamily: activeTypography.headlineFont,
                            }}
                          >
                            {currentSlide.metric?.value || '50,000 /s'}
                          </span>
                          <span className="text-[11px] font-medium opacity-80 mt-1">
                            {currentSlide.metric?.label || 'Throughput'}
                          </span>
                          <span className="text-[9px] font-code font-bold text-emerald-600 mt-0.5">
                            {currentSlide.metric?.trend || '+99.4% SLA'}
                          </span>
                        </div>

                        <div
                          className="col-span-2 p-4 rounded-xl border flex flex-col justify-center space-y-1.5"
                          style={{
                            backgroundColor: activePalette.cardBg,
                            borderColor: activePalette.cardBorder,
                          }}
                        >
                          <div className="font-bold text-xs" style={{ color: activePalette.titleColor }}>
                            Key Performance Benchmark
                          </div>
                          <ul className="text-xs space-y-1 opacity-90" style={{ fontFamily: activeTypography.bodyFont }}>
                            {(currentSlide.bullets || []).map((b, i) => (
                              <li key={i}>• {b}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* STANDARD BULLETS / OTHER LAYOUTS */}
                    {currentSlide.layout !== 'TWO_COLUMNS' &&
                      currentSlide.layout !== 'METRIC_HIGHLIGHT' &&
                      !currentSlide.metric && (
                        <div
                          className="p-4 rounded-xl border space-y-2"
                          style={{
                            backgroundColor: activePalette.cardBg,
                            borderColor: activePalette.cardBorder,
                          }}
                        >
                          <ul className="space-y-1.5 text-xs sm:text-sm" style={{ fontFamily: activeTypography.bodyFont }}>
                            {(currentSlide.bullets || []).map((b, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span style={{ color: activePalette.primaryAccent }} className="font-bold">
                                  •
                                </span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Takeaway Callout */}
                    {currentSlide.callout && (
                      <div
                        className="p-2.5 rounded-xl border flex items-center gap-2 text-xs font-code shadow-2xs"
                        style={{
                          backgroundColor: `${activePalette.primaryAccent}10`,
                          borderColor: `${activePalette.primaryAccent}30`,
                          color: activePalette.titleColor,
                        }}
                      >
                        <span className="font-bold text-amber-500">💡 Strategic Takeaway:</span>
                        <span className="opacity-90">{currentSlide.callout}</span>
                      </div>
                    )}
                  </div>

                  {/* Slide Footer */}
                  <div className="flex items-center justify-between text-[10px] opacity-70 border-t pt-2" style={{ borderColor: `${activePalette.cardBorder}40` }}>
                    <span>Confidential • Board Review Deck</span>
                    <span className="font-code">Page {currentSlide.slideNumber}</span>
                  </div>
                </div>
              </div>

              {/* Speaker Notes Preview Strip */}
              {currentSlide.notes && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
                  <div className="font-semibold text-zinc-800 text-[11px] flex items-center gap-1.5">
                    <span>🎙️ Speaker Notes:</span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed italic">{currentSlide.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* GRID / ALL SLIDES VIEW */}
          {viewLayout === 'grid' && (
            <div className="space-y-4">
              {slides.map((slide, sIdx) => {
                const slideComments = threads.filter((t) => t.slideId === slide.id);
                const activeCollab = collaborators.find(
                  (c) => c.activeSlideId === slide.id || c.activeSlideNumber === slide.slideNumber
                );

                return (
                  <div
                    key={slide.id}
                    id={`slide_preview_${slide.id}`}
                    className="p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs space-y-3 hover:border-indigo-300 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-code text-xs font-bold text-[#1a146b]">
                          {slide.slideNumber}
                        </span>
                        <span className="font-bold text-xs text-[#1a1c1c]">{slide.title}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {activeCollab && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs flex items-center gap-1"
                            style={{ backgroundColor: activeCollab.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>{activeCollab.name.split(' ')[0]} reviewing</span>
                          </span>
                        )}

                        <span className="text-[10px] font-code px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 uppercase font-bold">
                          {slide.layout.replace(/_/g, ' ')}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSlideIndex(sIdx);
                            setViewLayout('split');
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-[#1a146b] font-semibold text-[11px] cursor-pointer"
                        >
                          Focus View
                        </button>
                      </div>
                    </div>

                    {/* Preview Area with Pins */}
                    <div
                      className="relative rounded-xl border border-zinc-200 overflow-hidden p-5 aspect-[16/9]"
                      style={{
                        backgroundColor: activePalette.surfaceBg,
                        color: activePalette.bodyColor,
                      }}
                    >
                      <SlideCommentPinOverlay
                        slideId={slide.id}
                        slideNumber={slide.slideNumber}
                        threads={threads}
                        activeCollaborators={collaborators}
                        selectedThreadId={selectedThreadId}
                        isPinningMode={isPinningMode}
                        onSelectThread={(id) => {
                          setSelectedThreadId(id);
                          setIsDiscussionOpen(true);
                        }}
                        onPlacePin={handlePlacePin}
                      />

                      <div className="space-y-2 pointer-events-none">
                        <h4
                          className="font-bold text-sm"
                          style={{
                            fontFamily: activeTypography.headlineFont,
                            color: activePalette.titleColor,
                          }}
                        >
                          {slide.title}
                        </h4>
                        <ul className="text-xs space-y-1 opacity-90" style={{ fontFamily: activeTypography.bodyFont }}>
                          {(slide.bullets || []).slice(0, 3).map((b, i) => (
                            <li key={i}>• {b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Footer with comment count */}
                    <div className="flex items-center justify-between text-xs pt-1 text-zinc-500">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-700 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{slideComments.length} Threads</span>
                        </span>
                        {slideComments.filter((t) => t.status === 'open').length > 0 && (
                          <span className="text-[10px] font-code px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            {slideComments.filter((t) => t.status === 'open').length} Open
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlideIndex(sIdx);
                          setIsPinningMode(true);
                        }}
                        className="text-xs font-semibold text-[#1a146b] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Drop Pin on this Slide</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Collaborator Discussion Drawer */}
        {isDiscussionOpen && (
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6 max-h-[85vh] flex flex-col">
            <CollaboratorDiscussionPanel
              deckPlan={deckPlan}
              threads={threads}
              collaborators={collaborators}
              currentUser={currentUser}
              selectedThreadId={selectedThreadId}
              activeFilterSlideId={currentSlide?.id || null}
              onSelectThread={setSelectedThreadId}
              onAddComment={onAddComment}
              onAddReply={onAddReply}
              onResolveThread={onResolveThread}
              onReopenThread={onReopenThread}
              onDeleteThread={onDeleteThread}
              onToggleReaction={onToggleReaction}
              onScrollToSlide={handleScrollToSlide}
              onClose={() => setIsDiscussionOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
