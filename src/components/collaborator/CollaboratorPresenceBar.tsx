import React, { useState } from 'react';
import {
  CollaboratorUser,
  SlideCommentThread,
} from '../../types/collaborator';
import {
  Users,
  Play,
  Pause,
  MessageSquare,
  Sparkles,
  MapPin,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface CollaboratorPresenceBarProps {
  collaborators: CollaboratorUser[];
  threads: SlideCommentThread[];
  isSimulationActive: boolean;
  isPinningMode: boolean;
  isDiscussionOpen: boolean;
  activeSlideNumber?: number;
  onToggleSimulation: () => void;
  onSimulateTeammateComment: () => void;
  onTogglePinningMode: () => void;
  onToggleDiscussion: () => void;
  onResetComments?: () => void;
}

export const CollaboratorPresenceBar: React.FC<CollaboratorPresenceBarProps> = ({
  collaborators,
  threads,
  isSimulationActive,
  isPinningMode,
  isDiscussionOpen,
  activeSlideNumber,
  onToggleSimulation,
  onSimulateTeammateComment,
  onTogglePinningMode,
  onToggleDiscussion,
  onResetComments,
}) => {
  const [activeAvatarHoverId, setActiveAvatarHoverId] = useState<string | null>(null);

  const openThreads = threads.filter((t) => t.status === 'open');
  const resolvedThreads = threads.filter((t) => t.status === 'resolved');

  // Most recent activity ticker snippet from active collaborators
  const activeCollab = collaborators.find((c) => c.status === 'online');

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#e2e2e2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
      {/* Left Section: Active Presence Stack & Live Ticker */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Presence Badge with Pulse */}
        <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
          <span className="relative flex h-2.5 w-2.5">
            {isSimulationActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-semibold text-xs flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span>{collaborators.length} Live Collaborators</span>
          </span>
        </div>

        {/* Collaborators Avatar Stack */}
        <div className="flex items-center -space-x-2">
          {collaborators.map((collab) => {
            const isHovered = activeAvatarHoverId === collab.id;

            return (
              <div
                key={collab.id}
                className="relative"
                onMouseEnter={() => setActiveAvatarHoverId(collab.id)}
                onMouseLeave={() => setActiveAvatarHoverId(null)}
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white text-[11px] font-bold text-white flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-115 hover:z-20 relative"
                  style={{ backgroundColor: collab.color }}
                  title={`${collab.name} (${collab.role}) - ${collab.currentAction}`}
                >
                  {collab.initials}

                  {/* Online / Idle Status Dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      collab.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                </div>

                {/* Popover Card on Hover */}
                {isHovered && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 rounded-2xl bg-zinc-950 text-white shadow-2xl border border-zinc-800 z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none text-left">
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-zinc-800">
                      <div
                        className="w-7 h-7 rounded-full text-xs font-bold text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: collab.color }}
                      >
                        {collab.initials}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate">{collab.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{collab.role}</div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Current Focus:</span>
                        <span className="font-code text-indigo-300 font-bold">
                          Slide #{collab.activeSlideNumber || 1}
                        </span>
                      </div>
                      <div className="text-zinc-300 leading-snug">
                        "{collab.currentAction}"
                      </div>
                      <div className="pt-1 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Status: <strong className="text-emerald-400">{collab.status}</strong></span>
                        <span>{collab.lastActive}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Activity Ticker */}
        {activeCollab && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#52525e] bg-zinc-50 px-2.5 py-1 rounded-xl border border-zinc-200/80">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeCollab.color }}
            />
            <span className="font-semibold text-zinc-800 truncate max-w-[130px]">
              {activeCollab.name}:
            </span>
            <span className="truncate max-w-[220px] italic">
              {activeCollab.currentAction}
            </span>
          </div>
        )}
      </div>

      {/* Right Section: Interactive Collaborator View Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle Real-time Presence Simulation */}
        <button
          type="button"
          onClick={onToggleSimulation}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isSimulationActive
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
          }`}
          title={
            isSimulationActive
              ? 'Real-time presence simulator running (simulates live collaborator focus shifts & typing)'
              : 'Real-time presence simulator paused'
          }
        >
          {isSimulationActive ? (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-700" />
              <span>Sim Live</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-zinc-600" />
              <span>Resume Sim</span>
            </>
          )}
        </button>

        {/* 1-Click Simulate Teammate Feedback */}
        <button
          type="button"
          onClick={onSimulateTeammateComment}
          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          title="Simulate a new review comment from VP of Product, Architect, or CFO on current slide"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>+ Simulate Feedback</span>
        </button>

        {/* Pin Comment on Slide Tool Toggle */}
        <button
          type="button"
          onClick={onTogglePinningMode}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isPinningMode
              ? 'bg-[#1a146b] text-white border-[#1a146b] shadow-2xs'
              : 'bg-white hover:bg-zinc-50 border-[#e2e2e2] text-zinc-800'
          }`}
          title="Click to drop a pinned comment directly onto any slide"
        >
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span>{isPinningMode ? 'Click on Slide...' : 'Drop Pin Tool'}</span>
        </button>

        {/* Open Comment Discussion Drawer */}
        <button
          type="button"
          onClick={onToggleDiscussion}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isDiscussionOpen
              ? 'bg-[#1a146b] text-white border-[#1a146b] shadow-2xs'
              : 'bg-indigo-50 hover:bg-indigo-100 text-[#1a146b] border-indigo-200'
          }`}
          title="Open collaborator comment threads and discussion panel"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comments</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-code ${
              isDiscussionOpen ? 'bg-white/20 text-white' : 'bg-[#1a146b] text-white'
            }`}
          >
            {openThreads.length}
          </span>
        </button>
      </div>
    </div>
  );
};
