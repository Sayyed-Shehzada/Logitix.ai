import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  AudioLines,
  Database,
  ArrowRight,
  FileText,
  Clock,
  Zap,
} from 'lucide-react';
import { format12HourTime } from '../utils/formatTime.js';
import { UserProfile } from '../types.js';
import { saveMemoryToFirestore, saveProjectArtifactToFirestore } from '../lib/firestore_service.js';

interface VoiceSparkViewProps {
  darkMode?: boolean;
  currentUser?: UserProfile | null;
  onInjectToChat?: (text: string) => void;
  onShowToast?: (msg: string) => void;
}

interface TranscriptItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
  time: string;
  model?: string;
  audioChunks?: string[];
}

export const VoiceSparkView: React.FC<VoiceSparkViewProps> = ({
  darkMode = false,
  currentUser,
  onInjectToChat,
  onShowToast,
}) => {
  // Mode selection: 'live-conversation' (gemini-3.8-live) | 'transcribe-audio' (gemini-3.5-transcribe)
  const [activeMode, setActiveMode] = useState<'live-conversation' | 'transcribe-audio'>('live-conversation');

  // Live Conversation State (gemini-3.8-live)
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [isLiveSpeaking, setIsLiveSpeaking] = useState(false);
  const [isLiveProcessing, setIsLiveProcessing] = useState(false);
  const [liveStatusText, setLiveStatusText] = useState('Ready — click below to start real-time voice conversation with Gemini 3.8 Live API');
  const [typedMessage, setTypedMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedFirestoreId, setSavedFirestoreId] = useState<string | null>(null);
  const [waveBars, setWaveBars] = useState<number[]>([40, 65, 30, 80, 55, 90, 45, 70, 35, 85, 50, 60]);

  // Audio Transcription State (gemini-3.5-transcribe)
  const [isRecordingTranscribe, setIsRecordingTranscribe] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeElapsedSec, setTranscribeElapsedSec] = useState(0);
  const [transcribedResult, setTranscribedResult] = useState<string>('');
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Live Conversation Transcript List
  const [liveTranscript, setLiveTranscript] = useState<TranscriptItem[]>([
    {
      id: 'welcome-live',
      sender: 'model',
      text: "Hello! I am LOGITIX Voice powered by the Gemini 3.8 Live API. Tap Start Conversation or hold the microphone to talk with me in real time.",
      time: format12HourTime(),
      model: 'gemini-3.8-live',
    },
  ]);

  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcribeTimerRef = useRef<any>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const liveWsRef = useRef<WebSocket | null>(null);

  // Auto-scroll transcript container
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [liveTranscript]);

  // Wave bar animation when active
  useEffect(() => {
    let interval: any;
    if (isLiveListening || isLiveSpeaking || isRecordingTranscribe) {
      interval = setInterval(() => {
        setWaveBars(Array.from({ length: 14 }, () => Math.floor(20 + Math.random() * 80)));
      }, 110);
    } else {
      setWaveBars([25, 45, 20, 60, 35, 70, 40, 65, 30, 55, 35, 50, 25, 40]);
    }
    return () => clearInterval(interval);
  }, [isLiveListening, isLiveSpeaking, isRecordingTranscribe]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (liveWsRef.current) {
        liveWsRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (transcribeTimerRef.current) {
        clearInterval(transcribeTimerRef.current);
      }
    };
  }, []);

  /**
   * Play back raw 24kHz PCM audio chunks streamed from gemini-3.8-live
   */
  const playPcmAudioChunks = (base64Chunks: string[]) => {
    if (isMuted || !base64Chunks || base64Chunks.length === 0) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass({ sampleRate: 24000 });

      const buffers: Uint8Array[] = base64Chunks.map((chunk) => {
        const binary = atob(chunk);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      });

      const totalLength = buffers.reduce((acc, b) => acc + b.byteLength, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const b of buffers) {
        merged.set(b, offset);
        offset += b.byteLength;
      }

      // Convert 16-bit PCM (little endian) to Float32
      const int16 = new Int16Array(merged.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        setIsLiveSpeaking(false);
        setLiveStatusText('Ready — tap microphone to speak again');
      };

      setIsLiveSpeaking(true);
      setLiveStatusText('Gemini 3.8 Live API is speaking...');
      source.start(0);
    } catch (err) {
      console.warn('PCM audio playback notice:', err);
      setIsLiveSpeaking(false);
    }
  };

  // ========================================================
  // FEATURE: Gemini 3.8 Live API Voice Conversation
  // ========================================================

  const startLiveConversationRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsLiveListening(false);
        stream.getTracks().forEach((track) => track.stop());

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 400) {
          setLiveStatusText('Audio too short. Please speak a sentence or phrase.');
          return;
        }

        setIsLiveProcessing(true);
        setLiveStatusText('Connecting to Gemini 3.8 Live API...');

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const resultStr = reader.result as string;
            const base64Audio = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;

            const res = await fetch('/api/live/voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
            });

            const data = await res.json();
            setIsLiveProcessing(false);

            if (data.promptText) {
              const userTurn: TranscriptItem = {
                id: `usr-${Date.now()}`,
                sender: 'user',
                text: data.promptText,
                time: format12HourTime(),
              };
              setLiveTranscript((prev) => [...prev, userTurn]);
            }

            if (data.reply) {
              const modelTurn: TranscriptItem = {
                id: `mod-${Date.now()}`,
                sender: 'model',
                text: data.reply,
                time: format12HourTime(),
                model: 'gemini-3.8-live',
                audioChunks: data.audioChunks,
              };
              setLiveTranscript((prev) => [...prev, modelTurn]);

              if (data.audioChunks && data.audioChunks.length > 0) {
                playPcmAudioChunks(data.audioChunks);
              } else {
                setLiveStatusText('Ready — tap microphone to speak again');
              }
            }
          };
        } catch (err: any) {
          console.error('Live voice exchange error:', err);
          setIsLiveProcessing(false);
          setLiveStatusText('Network error contacting Live API. Please try again.');
        }
      };

      mediaRecorder.start(200);
      setIsLiveListening(true);
      setLiveStatusText('Listening... Speak now to Gemini 3.8 Live');
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setIsLiveListening(false);
      setLiveStatusText('Microphone permission required. Please allow microphone access.');
    }
  };

  const stopLiveConversationRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    } else {
      setIsLiveListening(false);
    }
  };

  const handleSendLiveText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = typedMessage.trim();
    if (!text || isLiveProcessing) return;

    setTypedMessage('');
    const userTurn: TranscriptItem = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      time: format12HourTime(),
    };
    setLiveTranscript((prev) => [...prev, userTurn]);
    setIsLiveProcessing(true);
    setLiveStatusText('Sending to Gemini 3.8 Live API...');

    try {
      const res = await fetch('/api/live/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      setIsLiveProcessing(false);

      if (data.reply) {
        const modelTurn: TranscriptItem = {
          id: `mod-${Date.now()}`,
          sender: 'model',
          text: data.reply,
          time: format12HourTime(),
          model: 'gemini-3.8-live',
          audioChunks: data.audioChunks,
        };
        setLiveTranscript((prev) => [...prev, modelTurn]);

        if (data.audioChunks && data.audioChunks.length > 0) {
          playPcmAudioChunks(data.audioChunks);
        } else {
          setLiveStatusText('Ready — tap microphone to speak');
        }
      }
    } catch (err) {
      console.error('Live message error:', err);
      setIsLiveProcessing(false);
      setLiveStatusText('Live API communication error. Please try again.');
    }
  };

  // ========================================================
  // FEATURE: Gemini 3.5 Microphone Audio Transcription
  // ========================================================

  const startAudioTranscriptionRecording = async () => {
    setTranscribeError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecordingTranscribe(false);
        if (transcribeTimerRef.current) clearInterval(transcribeTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 400) {
          setTranscribeError('Recording was too short. Please speak clearly for at least 1-2 seconds.');
          return;
        }

        setIsTranscribing(true);

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const resultStr = reader.result as string;
            const base64Audio = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;

            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
            });

            const data = await res.json();
            setIsTranscribing(false);

            if (data.text) {
              setTranscribedResult(data.text.trim());
              onShowToast?.('Transcribed accurately with Gemini 3.5 Transcribe.');
            } else if (data.error) {
              setTranscribeError(data.error);
            }
          };
        } catch (err: any) {
          console.error('Audio transcription error:', err);
          setIsTranscribing(false);
          setTranscribeError(err?.message || 'Failed to transcribe recording.');
        }
      };

      mediaRecorder.start(250);
      setIsRecordingTranscribe(true);
      setTranscribeElapsedSec(0);

      transcribeTimerRef.current = setInterval(() => {
        setTranscribeElapsedSec((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Transcription mic permission error:', err);
      setIsRecordingTranscribe(false);
      setTranscribeError('Microphone access blocked. Please allow microphone permissions in your browser.');
    }
  };

  const stopAudioTranscriptionRecording = () => {
    if (transcribeTimerRef.current) clearInterval(transcribeTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    } else {
      setIsRecordingTranscribe(false);
    }
  };

  // ========================================================
  // FEATURE: Save to Firestore Database
  // ========================================================

  const handleSaveToFirestore = async (itemText: string, title: string = 'Voice Note') => {
    const userEmail = currentUser?.email || 'user';
    try {
      await saveMemoryToFirestore(userEmail, {
        id: `voice-${Date.now()}`,
        title: `${title} [${format12HourTime()}]`,
        detail: itemText,
        category: 'voice-intelligence',
        content: itemText,
        tags: ['audio', 'gemini-voice', 'live-api'],
        timestamp: new Date().toISOString(),
      });
      setSavedFirestoreId(title);
      setTimeout(() => setSavedFirestoreId(null), 3000);
      onShowToast?.(`Persisted to Firebase Firestore: "${title}" saved.`);
    } catch (err: any) {
      console.error('Failed to save to Firestore:', err);
      onShowToast?.('Error persisting to Firestore.');
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onShowToast?.('Copied to clipboard');
  };

  return (
    <div className="w-full p-3 sm:p-5 flex flex-col gap-4 max-w-6xl mx-auto">
      {/* Top Header Card with Mode Tabs & Firebase Status */}
      <div
        className={`w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border transition-all ${
          darkMode ? 'bg-white/5 border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2.5 rounded-xl border flex-shrink-0 ${
              darkMode
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                : 'bg-purple-50 border-purple-200 text-purple-600'
            }`}
          >
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                LOGITIX Voice & Audio Intelligence
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1 whitespace-nowrap">
                <Zap className="w-3 h-3 text-indigo-500" />
                Gemini 3.8 Live & 3.5 Transcribe
              </span>
            </div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'} flex items-center gap-2 mt-0.5`}>
              <span>Real-time voice conversations and microphone transcription connected to Cloud Firestore.</span>
            </p>
          </div>
        </div>

        {/* Feature Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveMode('live-conversation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'live-conversation'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AudioLines className="w-3.5 h-3.5 text-indigo-500" />
            <span>Gemini 3.8 Live API</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('transcribe-audio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'transcribe-audio'
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-purple-500" />
            <span>Gemini 3.5 Transcribe</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Gemini 3.8 Live API Voice Conversations */}
      {activeMode === 'live-conversation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Interactive Live Voice Visualizer & Controls */}
          <div
            className={`lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border transition-all text-center relative overflow-hidden ${
              darkMode ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Ambient Glow */}
            <div
              className={`absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-opacity ${
                isLiveListening
                  ? 'bg-rose-500/20'
                  : isLiveSpeaking
                  ? 'bg-purple-600/20'
                  : 'bg-indigo-500/10'
              }`}
            />

            {/* Model Badge */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live API • gemini-3.8-live
              </span>
            </div>

            {/* Glowing Orb */}
            <div className="relative my-3 flex items-center justify-center">
              <div
                className={`w-36 h-36 rounded-full p-1 shadow-2xl transition-transform duration-150 flex items-center justify-center ${
                  isLiveListening
                    ? 'bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-400 shadow-rose-500/30 scale-105'
                    : isLiveSpeaking
                    ? 'bg-gradient-to-tr from-purple-600 via-blue-500 to-emerald-400 shadow-purple-500/30 scale-105'
                    : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-indigo-500/20'
                }`}
              >
                <div
                  className={`w-full h-full rounded-full flex flex-col items-center justify-center gap-2 relative overflow-hidden ${
                    darkMode ? 'bg-slate-950 text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  {isLiveProcessing ? (
                    <Loader2 className="w-8 h-8 text-blue-300 animate-spin" />
                  ) : (
                    <Sparkles
                      className={`w-8 h-8 transition-colors ${
                        isLiveListening
                          ? 'text-rose-300 animate-bounce'
                          : isLiveSpeaking
                          ? 'text-purple-300 animate-pulse'
                          : 'text-indigo-300'
                      }`}
                    />
                  )}
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-200">
                    {isLiveListening ? 'Listening' : isLiveSpeaking ? 'Live Speaking' : isLiveProcessing ? 'Processing' : 'LOGITIX LIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Waveform Visualizer */}
            <div className="flex items-end justify-center gap-1.5 h-10 my-2">
              {waveBars.map((height, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    isLiveListening
                      ? 'bg-rose-500'
                      : isLiveSpeaking
                      ? 'bg-gradient-to-t from-blue-500 to-purple-500'
                      : darkMode
                      ? 'bg-slate-700'
                      : 'bg-slate-300'
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            {/* Status Text */}
            <p className={`text-xs font-medium px-4 mb-4 min-h-[2.5rem] flex items-center justify-center leading-relaxed ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {liveStatusText}
            </p>

            {/* Mic Controls */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={isLiveListening ? stopLiveConversationRecording : startLiveConversationRecording}
                disabled={isLiveProcessing}
                className={`w-full sm:w-auto px-7 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isLiveListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 ring-4 ring-rose-500/20'
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 text-white shadow-indigo-600/25 hover:scale-[1.02]'
                }`}
              >
                {isLiveListening ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Speaking</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Talk to Gemini 3.8 Live</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-500" />}
              </button>
            </div>

            {/* Quick Text Input for Live Model */}
            <form onSubmit={handleSendLiveText} className="w-full mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder="Or send a message to Gemini 3.8 Live..."
                  className={`w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border transition-colors ${
                    darkMode
                      ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!typedMessage.trim() || isLiveProcessing}
                  className="absolute right-1.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white transition-opacity cursor-pointer"
                  title="Send to Live API"
                >
                  {isLiveProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Transcript Feed & Firestore Persistence */}
          <div
            className={`lg:col-span-7 flex flex-col rounded-3xl border transition-all overflow-hidden ${
              darkMode ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Header */}
            <div
              className={`p-4 border-b flex items-center justify-between flex-wrap gap-2 ${
                darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Live Conversation Transcript
                </h3>
                <span className="text-[10px] font-code px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  gemini-3.8-live
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const fullText = liveTranscript.map((t) => `${t.sender.toUpperCase()}: ${t.text}`).join('\n\n');
                    handleSaveToFirestore(fullText, 'Live Voice Session');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                  title="Persist complete transcript to Cloud Firestore"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{savedFirestoreId === 'Live Voice Session' ? 'Saved to Firestore!' : 'Save to Firestore'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Conversation Turns */}
            <div
              ref={transcriptContainerRef}
              className="flex-1 min-h-[320px] max-h-[500px] overflow-y-auto p-4 space-y-3.5 custom-scrollbar"
            >
              {liveTranscript.map((turn) => {
                const isUser = turn.sender === 'user';
                return (
                  <div
                    key={turn.id}
                    className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-code">
                      <span>{isUser ? 'You (Microphone)' : 'Gemini 3.8 Live API'}</span>
                      <span>•</span>
                      <span>{turn.time}</span>
                    </div>

                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#1a146b] text-white rounded-tr-xs shadow-xs'
                          : darkMode
                          ? 'bg-slate-800 text-slate-100 border border-white/10 rounded-tl-xs'
                          : 'bg-slate-100 text-slate-900 border border-slate-200/80 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      <p>{turn.text}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => copyText(turn.id, turn.text)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedId === turn.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>

                      {turn.audioChunks && turn.audioChunks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => playPcmAudioChunks(turn.audioChunks || [])}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Replay Audio</span>
                        </button>
                      )}

                      {onInjectToChat && (
                        <button
                          type="button"
                          onClick={() => onInjectToChat(turn.text)}
                          className="text-[10px] text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Send to Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Gemini 3.5 Microphone Audio Transcription */}
      {activeMode === 'transcribe-audio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Audio Recorder with model gemini-3.5-transcribe */}
          <div
            className={`lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border transition-all text-center relative overflow-hidden ${
              darkMode ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Mic className="w-3 h-3 text-purple-600" />
                Speech-to-Text • gemini-3.5-transcribe
              </span>
            </div>

            <div className="my-4">
              <div
                className={`w-32 h-32 rounded-full p-1.5 transition-all flex items-center justify-center ${
                  isRecordingTranscribe
                    ? 'bg-rose-500 shadow-xl shadow-rose-500/30 animate-pulse'
                    : isTranscribing
                    ? 'bg-purple-600 shadow-xl shadow-purple-500/30 animate-spin'
                    : 'bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10'
                }`}
              >
                <div className={`w-full h-full rounded-full flex flex-col items-center justify-center gap-1 ${
                  darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-inner'
                }`}>
                  {isTranscribing ? (
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  ) : isRecordingTranscribe ? (
                    <Square className="w-8 h-8 text-rose-500 fill-rose-500 animate-bounce" />
                  ) : (
                    <Mic className="w-8 h-8 text-purple-600" />
                  )}
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    {isRecordingTranscribe
                      ? `00:${transcribeElapsedSec.toString().padStart(2, '0')}`
                      : isTranscribing
                      ? 'Transcribing'
                      : 'Microphone'}
                  </span>
                </div>
              </div>
            </div>

            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Input Audio with Microphone
            </h3>
            <p className={`text-xs px-4 mb-4 mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Record your voice and convert it into verbatim text using model <span className="font-mono font-semibold text-purple-600">gemini-3.5-transcribe</span>.
            </p>

            {transcribeError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-3 text-left w-full">
                {transcribeError}
              </div>
            )}

            <button
              type="button"
              onClick={isRecordingTranscribe ? stopAudioTranscriptionRecording : startAudioTranscriptionRecording}
              disabled={isTranscribing}
              className={`w-full sm:w-auto px-7 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                isRecordingTranscribe
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 ring-4 ring-rose-500/20'
                  : 'bg-[#1a146b] hover:bg-[#312e81] text-white shadow-indigo-600/25 hover:scale-[1.02]'
              }`}
            >
              {isRecordingTranscribe ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop & Transcribe Audio</span>
                </>
              ) : isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transcribing Audio...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start Microphone Recording</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Transcribed Audio Output Card */}
          <div
            className={`lg:col-span-7 flex flex-col rounded-3xl border transition-all overflow-hidden ${
              darkMode ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between flex-wrap gap-2 ${
                darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Transcribed Text Output
                </h3>
              </div>
              {transcribedResult && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyText('transcribed', transcribedResult)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedId === 'transcribed' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToFirestore(transcribedResult, 'Audio Transcription')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{savedFirestoreId === 'Audio Transcription' ? 'Saved to Firestore!' : 'Save to Firestore'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-5 min-h-[300px] flex flex-col justify-between">
              {transcribedResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/30 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                    <p className="whitespace-pre-wrap">{transcribedResult}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-code pt-2 border-t border-slate-200 dark:border-white/10">
                    <span>Model: gemini-3.5-transcribe</span>
                    <span>Words: {transcribedResult.split(/\s+/).filter(Boolean).length}</span>
                  </div>

                  {onInjectToChat && (
                    <button
                      type="button"
                      onClick={() => onInjectToChat(transcribedResult)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Use Transcribed Text in Chat Studio</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8 my-auto">
                  <Mic className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    No transcription yet.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                    Press "Start Microphone Recording" on the left to capture and transcribe speech using model gemini-3.5-transcribe.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
