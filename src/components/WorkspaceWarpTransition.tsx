import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogitixLogo } from './LogitixLogo.js';
import { audioSynth } from '../utils/audioFx.js';
import { UserProfile } from '../types.js';
import { ShieldCheck, Cpu, Zap, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';

interface WorkspaceWarpTransitionProps {
  userProfile: UserProfile;
  onComplete: () => void;
  onStartReveal?: () => void;
}

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
  color: string;
}

export const WorkspaceWarpTransition: React.FC<WorkspaceWarpTransitionProps> = ({
  userProfile,
  onComplete,
  onStartReveal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'charging' | 'warp' | 'reveal'>('charging');
  const [hudLogs, setHudLogs] = useState<string[]>([
    'INITIALIZING EXECUTIVE QUANTUM BUS...',
  ]);

  useEffect(() => {
    // Fire the warp-in audio synthesizer
    audioSynth.playWarpIn();

    // Staged HUD log sequence
    const t1 = setTimeout(() => {
      setPhase('warp');
      setHudLogs((prev) => [
        ...prev,
        'ENGAGING NEURAL MULTI-AGENT RUNTIME (GEMINI 3.8 + CLAUDE 3.7 + MANUS)...',
      ]);
    }, 450);

    const t2 = setTimeout(() => {
      setPhase('reveal');
      onStartReveal?.();
      setHudLogs((prev) => [
        ...prev,
        `SECURITY CLEARANCE GRANTED: ${userProfile.name.toUpperCase()} (ROOT EXECUTIVE)`,
      ]);
    }, 1000);

    const t3 = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [userProfile, onComplete, onStartReveal]);

  // Hyperspace 3D Warp Field Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const STAR_COUNT = 320;
    const colors = [
      '#0284c7', // Sky Blue / Cerulean
      '#0ea5e9', // Vibrant Cyan-Blue
      '#2563eb', // Royal Azure
      '#6366f1', // Indigo
      '#8b5cf6', // Violet
      '#f59e0b', // Solar Amber / Sunbeam
      '#10b981', // Emerald
      '#38bdf8', // Light Cyan
    ];

    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
        pz: Math.random() * width,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;

      // Speed profile: quick acceleration, warp plateau, then explosive deceleration
      let speed = 12;
      if (elapsed < 0.5) {
        speed = 10 + elapsed * 70;
      } else if (elapsed < 1.2) {
        speed = 45;
      } else {
        speed = Math.max(3, 45 - (elapsed - 1.2) * 55);
      }

      // Daylight motion blur trail backdrop (soft radiant daylight clear)
      ctx.fillStyle = 'rgba(238, 246, 255, 0.35)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < STAR_COUNT; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed;

        if (s.z <= 0) {
          s.z = width;
          s.pz = width;
          s.x = (Math.random() - 0.5) * width * 2;
          s.y = (Math.random() - 0.5) * height * 2;
        }

        const k = 180 / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;

        const pk = 180 / s.pz;
        const prevPx = s.x * pk + cx;
        const prevPy = s.y * pk + cy;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const alpha = Math.min(1, Math.max(0.25, (width - s.z) / width));
          ctx.beginPath();
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = Math.min(3.8, (1 - s.z / width) * 3.8 + 0.6);
          ctx.globalAlpha = alpha;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'reveal' ? 0 : 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#e8f2fe] via-[#f0f7ff] to-[#faf5ff] text-slate-900 flex items-center justify-center overflow-hidden select-none pointer-events-none"
    >
      {/* 3D Hyperspace Warp Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Solar Daylight Atmospheric Glow Blobs */}
      <div className="absolute top-12 left-1/4 w-[34rem] h-[34rem] bg-sky-300/35 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-[32rem] h-[32rem] bg-indigo-300/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] bg-amber-200/25 rounded-full blur-[150px] pointer-events-none" />

      {/* Daylight Cyber Grid Tunnel Floor & Ceiling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c718_1px,transparent_1px),linear-gradient(to_bottom,#0284c718_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none opacity-50" />

      {/* Expanding Concentric Laser Shockwaves with Daylight Colors */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{
            scale: [0.2, 3.6],
            opacity: [0.85, 0],
          }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          className="w-96 h-96 rounded-full border-2 border-sky-400/80 shadow-[0_0_50px_rgba(14,165,233,0.45)]"
        />
        <motion.div
          animate={{
            scale: [0.2, 4.3],
            opacity: [0.7, 0],
          }}
          transition={{ duration: 1.4, delay: 0.35, repeat: Infinity, ease: 'easeOut' }}
          className="w-96 h-96 rounded-full border border-indigo-400/70 shadow-[0_0_60px_rgba(99,102,241,0.35)]"
        />
        <motion.div
          animate={{
            scale: [0.2, 4.9],
            opacity: [0.55, 0],
          }}
          transition={{ duration: 1.4, delay: 0.7, repeat: Infinity, ease: 'easeOut' }}
          className="w-96 h-96 rounded-full border border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
        />
      </div>

      {/* Central Holographic HUD Chamber */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-lg px-6">
        {/* Dual Rotating Orbital Rings & Logo */}
        <div className="relative flex items-center justify-center p-4">
          {/* Outer Dashed Orbit */}
          <motion.div
            animate={{ rotate: 360, scale: [0.95, 1.05, 0.95] }}
            transition={{ rotate: { duration: 12, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
            className="absolute w-44 h-44 rounded-full border-2 border-dashed border-sky-400/60 pointer-events-none"
          />
          {/* Counter Orbit with Crosshair Ticks */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute w-36 h-36 rounded-full border border-indigo-500/55 border-t-transparent border-b-transparent pointer-events-none"
          />
          {/* Core Energy Glow */}
          <motion.div
            animate={{ scale: [0.85, 1.25, 0.85], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-sky-300/40 via-indigo-300/30 to-amber-300/35 blur-xl pointer-events-none"
          />

          {/* Central Logo with Holographic Levitation */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="relative z-10 drop-shadow-md"
          >
            <LogitixLogo size={105} showText={true} />
          </motion.div>
        </div>

        {/* Executive Welcome & Mode Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/40 backdrop-blur-xl shadow-sm">
            <motion.div
              animate={{ scale: [1, 1.45, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_10px_#0ea5e9]"
            />
            <span className="text-[11px] font-mono tracking-widest text-sky-800 font-bold uppercase">
              Quantum Executive Uplink Active
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 tracking-tight drop-shadow-sm">
            Welcome to LOGITIX AI
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-mono">
            {userProfile.name} • <span className="text-indigo-600 font-semibold">{userProfile.role}</span>
          </p>
        </motion.div>

        {/* Live Terminal Decryption Stream (Daylight Frosted Glass) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md p-4 rounded-3xl bg-white/80 border border-sky-200/80 backdrop-blur-2xl text-left font-mono text-[11px] space-y-1.5 shadow-[0_15px_40px_rgba(14,165,233,0.14)]"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 mb-1.5 text-slate-500 text-[10px]">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-600" />
              SYSTEM BOOT DIAGNOSTICS
            </span>
            <span className="text-emerald-600 font-bold">100% OPERATIONAL</span>
          </div>

          {hudLogs.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-slate-700 font-medium"
            >
              <span className="text-sky-600 font-bold">›</span>
              <span className="truncate">{log}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Laser Sweep Horizon Line */}
        <motion.div
          initial={{ top: '-10%', opacity: 0 }}
          animate={{ top: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="fixed inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_20px_#38bdf8] pointer-events-none"
        />
      </div>
    </motion.div>
  );
};
