import React from 'react';

interface LogitixLogoProps {
  className?: string;
  size?: number; // size in px
  showText?: boolean;
  darkMode?: boolean;
}

export const LogitixLogo: React.FC<LogitixLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  darkMode = false,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center flex-shrink-0"
      >
        {/* Soft Ambient Neon Backglow Ring (Hollow Center for True Transparency) */}
        <div
          className={`absolute inset-0 rounded-full blur-xl pointer-events-none transition-all duration-500 ${
            darkMode ? 'opacity-70' : 'opacity-35'
          }`}
          style={{
            background: darkMode
              ? 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(0, 212, 255, 0.45) 50%, rgba(139, 61, 255, 0.35) 75%, transparent 100%)'
              : 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(56, 189, 248, 0.35) 50%, rgba(129, 140, 248, 0.25) 75%, transparent 100%)',
          }}
        />

        {/* 3D Penrose / Impossible Triangle SVG with True SVG Masked Central Hole */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 w-full h-full drop-shadow-[0_0_14px_rgba(0,210,255,0.45)]"
        >
          <defs>
            {/* SVG Mask cutting out a 100% transparent triangular void in the middle */}
            <mask id="logitixCenterHole">
              {/* Full canvas visible */}
              <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
              {/* Black center triangle punches a clean transparent hole through all underlying facets */}
              <polygon points="50,34 68,66 32,66" fill="#000000" />
            </mask>

            {/* Gradient 1: Cyan to Electric Blue */}
            <linearGradient id="logitixCyanBlue" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#00f2fe" />
              <stop offset="45%" stopColor="#00a8ff" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            {/* Gradient 2: Electric Blue to Deep Indigo Purple */}
            <linearGradient id="logitixBluePurple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>

            {/* Gradient 3: Indigo Purple to Bright Neon Pink/Magenta */}
            <linearGradient id="logitixPurpleMagenta" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="35%" stopColor="#7c3aed" />
              <stop offset="70%" stopColor="#c026d3" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* Specular Highlight for Glassy Edge */}
            <linearGradient id="logitixGlassHighlight" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
            </linearGradient>

            {/* Dark Bevel Shadow */}
            <linearGradient id="logitixInnerShadow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#090d24" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.7" />
            </linearGradient>

            {/* Soft Glow Filter */}
            <filter id="logitixTriangleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* === 3D IMPOSSIBLE TRIANGLE FACETS MASKED BY THE CENTRAL HOLE === */}
          <g mask="url(#logitixCenterHole)">
            {/* 1. Outer Left Facet (Cyan -> Blue) */}
            <path
              d="M 50,6 L 92,82 L 76,82 L 40,18 Z"
              fill="url(#logitixCyanBlue)"
              filter="url(#logitixTriangleGlow)"
            />

            {/* 2. Top Specular Glass Reflection Cap */}
            <path
              d="M 50,6 L 40,18 L 56,26 L 50,6 Z"
              fill="url(#logitixGlassHighlight)"
            />

            {/* 3. Outer Bottom Facet (Purple -> Magenta) */}
            <path
              d="M 92,82 L 8,82 L 20,64 L 76,64 Z"
              fill="url(#logitixPurpleMagenta)"
              filter="url(#logitixTriangleGlow)"
            />

            {/* 4. Bottom Right Bevel */}
            <path
              d="M 92,82 L 76,82 L 76,64 Z"
              fill="#c026d3"
            />

            {/* 5. Outer Right Facet (Blue -> Purple) */}
            <path
              d="M 8,82 L 50,6 L 60,20 L 26,82 Z"
              fill="url(#logitixBluePurple)"
              filter="url(#logitixTriangleGlow)"
            />

            {/* 6. Bottom Left Corner Bevel */}
            <path
              d="M 8,82 L 20,64 L 26,82 Z"
              fill="#00f2fe"
            />

            {/* 7. Inner Fold Segment A (Upper Overlap) */}
            <path
              d="M 40,18 L 76,82 L 62,82 L 32,28 Z"
              fill="url(#logitixBluePurple)"
              opacity="0.95"
            />

            {/* 8. Inner Fold Segment B (Bottom Overlap) */}
            <path
              d="M 76,64 L 20,64 L 32,46 L 62,46 Z"
              fill="url(#logitixPurpleMagenta)"
              opacity="0.95"
            />

            {/* 9. Inner Fold Segment C (Shadow Return) */}
            <path
              d="M 26,82 L 60,20 L 50,34 L 26,74 Z"
              fill="url(#logitixInnerShadow)"
            />
          </g>

          {/* Crisp Glowing Rim around the Transparent Center Gap */}
          <polygon
            points="50,34 68,66 32,66"
            fill="none"
            stroke={darkMode ? 'url(#logitixCyanBlue)' : '#0284c7'}
            strokeWidth="1.2"
            className={darkMode ? 'drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]' : 'drop-shadow-[0_0_4px_rgba(2,132,199,0.3)]'}
          />

          {/* Specular Outer Edge Highlights */}
          <line x1="50" y1="6" x2="92" y2="82" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
          <line x1="8" y1="82" x2="92" y2="82" stroke="#f43f5e" strokeWidth="0.8" opacity="0.8" />
          <line x1="50" y1="6" x2="8" y2="82" stroke="#00f2fe" strokeWidth="0.8" opacity="0.85" />

          {/* Inner Gap Rim Highlights */}
          <line x1="50" y1="34" x2="68" y2="66" stroke={darkMode ? '#38bdf8' : '#0284c7'} strokeWidth="0.7" opacity="0.9" />
          <line x1="68" y1="66" x2="32" y2="66" stroke={darkMode ? '#c026d3' : '#9333ea'} strokeWidth="0.7" opacity="0.9" />
          <line x1="32" y1="66" x2="50" y2="34" stroke={darkMode ? '#00f2fe' : '#0284c7'} strokeWidth="0.7" opacity="0.9" />
        </svg>
      </div>

      {/* Optional Full Brand Typography (LOGITIX - AI ASSISTANT) */}
      {showText && (
        <div className="mt-2.5 flex flex-col items-center text-center space-y-1">
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-[0.28em] font-sans uppercase transition-all duration-300 leading-normal py-0.5 px-2 ${
              darkMode
                ? 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-purple-300 drop-shadow-[0_0_16px_rgba(0,212,255,0.5)]'
                : 'bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 drop-shadow-sm'
            }`}
          >
            LOGITIX
          </h1>
          <div className="flex items-center gap-2">
            <div className={`h-[1px] w-6 bg-gradient-to-r ${darkMode ? 'from-transparent via-cyan-400 to-blue-500' : 'from-transparent via-blue-500 to-indigo-600'}`} />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 uppercase font-sans py-0.5">
              AI ASSISTANT
            </span>
            <div className={`h-[1px] w-6 bg-gradient-to-l ${darkMode ? 'from-transparent via-purple-500 to-blue-500' : 'from-transparent via-indigo-600 to-blue-500'}`} />
          </div>
          <span className={`text-[10.5px] font-bold tracking-widest font-sans inline-block py-0.5 px-2 ${
            darkMode
              ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]'
              : 'text-slate-800'
          }`}>
            by Sayyed Muhammad Ali
          </span>
        </div>
      )}
    </div>
  );
};

export const NexaLogo = LogitixLogo;
