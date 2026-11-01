import React, { useState, useRef } from 'react';
import {
  SlideCommentThread,
  CollaboratorUser,
} from '../../types/collaborator';
import { MessageSquare, Check, HelpCircle, AlertCircle, Lightbulb, Heart, Eye } from 'lucide-react';

interface SlideCommentPinOverlayProps {
  slideId: string;
  slideNumber: number;
  threads: SlideCommentThread[];
  activeCollaborators: CollaboratorUser[];
  selectedThreadId: string | null;
  isPinningMode: boolean;
  onSelectThread: (threadId: string) => void;
  onPlacePin: (slideId: string, xPercent: number, yPercent: number) => void;
  onCancelPinning?: () => void;
}

export const SlideCommentPinOverlay: React.FC<SlideCommentPinOverlayProps> = ({
  slideId,
  threads,
  activeCollaborators,
  selectedThreadId,
  isPinningMode,
  onSelectThread,
  onPlacePin,
  onCancelPinning,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  // Filter threads for this slide
  const slideThreads = threads.filter((t) => t.slideId === slideId);

  // Filter collaborators currently looking at or acting on this slide
  const collaboratorsOnSlide = activeCollaborators.filter(
    (c) => c.activeSlideId === slideId || c.activeSlideNumber === slideThreads[0]?.slideNumber
  );

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinningMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = Math.max(5, Math.min(95, Math.round((x / rect.width) * 100)));
    const yPercent = Math.max(8, Math.min(92, Math.round((y / rect.height) * 100)));
    onPlacePin(slideId, xPercent, yPercent);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`absolute inset-0 z-20 pointer-events-none ${
        isPinningMode ? 'pointer-events-auto cursor-crosshair bg-indigo-900/5 backdrop-blur-[0.5px]' : ''
      }`}
    >
      {/* Pinning Mode Banner */}
      {isPinningMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/90 text-white text-[10px] font-semibold shadow-lg border border-indigo-400/40 animate-pulse">
          <span>Click anywhere to drop comment pin</span>
          {onCancelPinning && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelPinning();
              }}
              className="text-zinc-400 hover:text-white underline ml-1 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Render Simulated Collaborator Live Cursors on this Slide */}
      {collaboratorsOnSlide.map((collab) => {
        const cursorX = collab.cursor?.xPercent ?? 50;
        const cursorY = collab.cursor?.yPercent ?? 50;

        return (
          <div
            key={collab.id}
            className="absolute transition-all duration-700 ease-out z-25 pointer-events-none flex flex-col items-start"
            style={{
              left: `${cursorX}%`,
              top: `${cursorY}%`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* SVG Mouse Cursor */}
            <svg
              className="w-4 h-4 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={collab.color}
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
            </svg>

            {/* Name Tag Pill */}
            <div
              className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-md whitespace-nowrap flex items-center gap-1 border border-white/30"
              style={{ backgroundColor: collab.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>{collab.name.split(' ')[0]}</span>
              {collab.currentAction.toLowerCase().includes('typing') && (
                <span className="text-[8px] opacity-80 italic">• typing</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Render Comment Pins */}
      {slideThreads.map((thread, index) => {
        const pinX = thread.pinPosition?.xPercent ?? 20 + index * 18;
        const pinY = thread.pinPosition?.yPercent ?? 25;
        const isSelected = selectedThreadId === thread.id;
        const isHovered = hoveredPinId === thread.id;
        const isResolved = thread.status === 'resolved';

        return (
          <div
            key={thread.id}
            className="absolute z-26 pointer-events-auto transition-transform"
            style={{
              left: `${pinX}%`,
              top: `${pinY}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={() => setHoveredPinId(thread.id)}
            onMouseLeave={() => setHoveredPinId(null)}
          >
            {/* Pin Trigger Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectThread(thread.id);
              }}
              className={`relative flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer group ${
                isSelected
                  ? 'w-7 h-7 ring-4 ring-indigo-400/50 scale-110 z-30'
                  : 'w-6 h-6 hover:scale-115'
              } ${isResolved ? 'opacity-85' : 'animate-bounce-subtle'}`}
              style={{
                backgroundColor: isResolved ? '#64748b' : thread.author.color,
                color: 'white',
              }}
              title={`Comment by ${thread.author.name} (Slide ${thread.slideNumber})`}
            >
              {isResolved ? (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : thread.category === 'question' ? (
                <HelpCircle className="w-3 h-3 stroke-[2.5]" />
              ) : thread.category === 'blocker' ? (
                <AlertCircle className="w-3 h-3 stroke-[2.5]" />
              ) : (
                <span className="text-[10px] font-bold font-code">{index + 1}</span>
              )}

              {/* Pin ripple beacon if open */}
              {!isResolved && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: thread.author.color }}
                />
              )}

              {/* Unread / reply counter badge */}
              {thread.replies.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-[#1a146b] border border-zinc-200 text-[8px] font-bold flex items-center justify-center shadow-xs">
                  {thread.replies.length}
                </span>
              )}
            </button>

            {/* Hover Tooltip Preview Card */}
            {(isHovered || isSelected) && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectThread(thread.id);
                }}
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 rounded-xl bg-zinc-950/95 text-white text-xs shadow-xl border border-zinc-700/60 backdrop-blur-md z-40 animate-in fade-in zoom-in-95 duration-150 cursor-pointer pointer-events-auto text-left"
              >
                <div className="flex items-center justify-between gap-1.5 mb-1 pb-1 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0"
                      style={{ backgroundColor: thread.author.color }}
                    >
                      {thread.author.initials}
                    </span>
                    <span className="font-semibold text-[11px] truncate">{thread.author.name}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-code font-bold uppercase shrink-0 ${
                      isResolved
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-indigo-900/80 text-indigo-200'
                    }`}
                  >
                    {isResolved ? 'Resolved' : thread.category}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-200 line-clamp-2 leading-relaxed">
                  {thread.content}
                </p>

                <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>{thread.createdAt}</span>
                  <span className="text-indigo-300 hover:text-white font-semibold flex items-center gap-1">
                    <span>Open thread</span>
                    {thread.replies.length > 0 && `(${thread.replies.length} replies)`}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
