import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, Mic, X, FileText, Loader2, Square, Volume2, Sparkles, Camera } from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal.js';
import { ChatAttachment } from '../types.js';

interface InputBoxProps {
  onSendMessage: (text: string, attachments: ChatAttachment[]) => void;
  isLoading: boolean;
  darkMode?: boolean;
  isExpanded?: boolean;
}

export const InputBox: React.FC<InputBoxProps> = ({ onSendMessage, isLoading, darkMode = false, isExpanded = false }) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  
  // Realtime Audio Levels for Visualizer Waveform (9 Equalizer Bars)
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 30, 45, 60, 45, 30, 15, 25, 10]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording & Audio Context Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Web Audio Visualizer & Silence Detector Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  // Clean up recording stream & audio nodes on unmount
  useEffect(() => {
    return () => {
      stopAudioVisualizer();
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Setup Web Audio Analyser for High-Fidelity Waveform Visualizer & Auto Silence Stop
  const setupAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silentFrames = 0;

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Pick 9 key frequency bins for visualizer bars
        const step = Math.floor(bufferLength / 9) || 1;
        const newLevels = [];
        let totalVolume = 0;

        for (let i = 0; i < 9; i++) {
          const val = dataArray[i * step] || 0;
          totalVolume += val;
          // Scale height between 12% and 95%
          const percent = Math.min(95, Math.max(12, Math.round((val / 255) * 100)));
          newLevels.push(percent);
        }

        setAudioLevels(newLevels);

        // Silence auto-stop: if ambient volume is quiet for ~2.5 seconds
        if (totalVolume < 30) {
          silentFrames++;
          if (silentFrames > 120) {
            stopWhisperRecording();
            return;
          }
        } else {
          silentFrames = 0;
        }

        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      animFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch (e) {
      console.warn('Audio visualizer init error:', e);
    }
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  };

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(inputText, attachments);
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      filesArr.forEach((f: File) => {
        const isImage = f.type.startsWith('image/');
        const sizeStr = `${(f.size / 1024).toFixed(1)} KB`;
        if (isImage) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setAttachments((prev) => [
              ...prev,
              {
                name: f.name,
                size: sizeStr,
                url: dataUrl,
                type: f.type,
                isPhoto: true,
              },
            ]);
          };
          reader.readAsDataURL(f);
        } else {
          setAttachments((prev) => [
            ...prev,
            {
              name: f.name,
              size: sizeStr,
              type: f.type,
              isPhoto: false,
            },
          ]);
        }
      });
    }
  };

  const handleCapturePhoto = (photo: ChatAttachment) => {
    setAttachments((prev) => [...prev, photo]);
  };

  // High-Quality Microphone Recording with Whisper Model Transcribe
  const startWhisperRecording = async () => {
    setMicError(null);
    try {
      let stream: MediaStream;
      try {
        // First try high quality stream with echo cancellation & noise suppression
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        // Fallback to basic audio stream request
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      setupAudioVisualizer(stream);

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? { mimeType: 'audio/mp4' }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        stopAudioVisualizer();

        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        }

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 250) {
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
            if (data.text && data.text.trim()) {
              setInputText((prev) => (prev ? `${prev} ${data.text.trim()}` : data.text.trim()));
            }
            setIsTranscribing(false);
          };
        } catch (err) {
          console.error('Whisper transcription error:', err);
          setIsTranscribing(false);
          fallbackSpeechRecognition();
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      // Max 20 seconds recording cap
      recordingTimerRef.current = setTimeout(() => {
        stopWhisperRecording();
      }, 20000);
    } catch (err: any) {
      console.warn('Microphone permission or capture error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setMicError('Microphone permission was blocked. Please click the lock icon in your browser address bar to allow microphone access.');
      } else {
        setMicError('Microphone not accessible. Please ensure a microphone is connected and allowed.');
      }
    }
  };

  const stopWhisperRecording = () => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    stopAudioVisualizer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    } else {
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopWhisperRecording();
    } else {
      startWhisperRecording();
    }
  };

  // Browser Native Speech Recognition Fallback
  const fallbackSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Microphone access blocked. Please allow mic in browser site settings.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      setIsRecording(true);

      recordingTimerRef.current = setTimeout(() => {
        try { recognition.stop(); } catch {}
        setIsRecording(false);
      }, 10000);

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputText(transcript.trim());
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition fallback error:', e);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  return (
    <div className={`w-full mx-auto px-2.5 sm:px-4 pb-2.5 sm:pb-4 z-10 transition-all duration-300 ${
      isExpanded ? 'max-w-5xl' : 'max-w-3xl'
    }`}>
      {/* File & Photo attachments badge list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-xl transition-all ${
                att.isPhoto || att.url
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                  : 'bg-white/10 border-white/10 text-white text-xs'
              }`}
            >
              {att.url ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-7 h-7 rounded-lg object-cover border border-white/20 shadow-xs"
                />
              ) : (
                <FileText className="w-3.5 h-3.5 text-blue-400" />
              )}
              <div className="flex flex-col text-left">
                <span className="truncate max-w-[140px] text-xs font-medium">{att.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {att.isPhoto ? 'Photo • ' : ''}{att.size}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                className="p-1 hover:text-white rounded-md hover:bg-white/10 transition-colors ml-1 cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mic Error Toast Notice */}
      {micError && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium flex items-center justify-between backdrop-blur-xl">
          <span>{micError}</span>
          <button onClick={() => setMicError(null)} className="hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Glass / White Input Container */}
      <div className={`relative rounded-2xl border p-2.5 transition-all focus-within:ring-1 ${
        darkMode
          ? 'bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl focus-within:border-white/20 focus-within:ring-white/10'
          : 'bg-white border-slate-200 shadow-xl focus-within:border-blue-400 focus-within:ring-blue-400/20'
      }`}>
        <div className="flex items-end gap-3">
          {/* File Attachment, Camera & Mic Buttons */}
          <div className="flex items-center gap-1 pb-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Attach File (Documents, Images, PDFs)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Click Photo Button (Camera) */}
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer group ${
                darkMode
                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
              title="Click Photos (Take Photo with Camera)"
            >
              <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            {/* High Precision Mic Toggle Button */}
            <button
              onClick={toggleRecording}
              disabled={isTranscribing}
              className={`p-2.5 rounded-xl transition-all relative cursor-pointer ${
                isRecording
                  ? 'bg-red-500/30 text-red-300 border border-red-500/50 shadow-lg shadow-red-500/30 ring-2 ring-red-500/20'
                  : isTranscribing
                  ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20'
                  : darkMode
                  ? 'text-slate-300 bg-white/5 hover:text-white hover:bg-white/10 border border-white/10'
                  : 'text-slate-600 bg-slate-100 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
              title={
                isRecording
                  ? 'Click to Stop Dictation (Gemini 3.5 Transcribe)'
                  : isTranscribing
                  ? 'Transcribing audio with Gemini 3.5 Transcribe...'
                  : 'Click to Speak (Microphone dictation with Gemini 3.5 Transcribe)'
              }
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              ) : isRecording ? (
                <Square className="w-4 h-4 text-red-400 fill-red-400 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Text Area or Dynamic Equalizer Audio Visualizer */}
          {isRecording ? (
            <div className="flex-1 min-h-[42px] flex items-center justify-between px-3 py-1 bg-red-500/10 rounded-xl border border-red-500/25 shadow-inner">
              <div className="flex items-center gap-2 text-xs text-red-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>Recording Voice... (Speak or tap red square to finish)</span>
              </div>

              {/* 9-Bar Realtime Frequency Equalizer Visualizer */}
              <div className="flex items-center gap-1 h-6 px-2">
                {audioLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-gradient-to-t from-red-500 via-purple-400 to-blue-400 rounded-full transition-all duration-75 shadow-sm"
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isTranscribing
                  ? '⚡ Transcribing voice with Whisper AI...'
                  : 'Ask LOGITIX anything...'
              }
              className={`flex-1 bg-transparent text-sm resize-none focus:outline-none py-2 custom-scrollbar min-h-[32px] max-h-[140px] ${
                darkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer ${
              inputText.trim() || attachments.length > 0
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-purple-500/30 hover:scale-105 active:scale-95'
                : darkMode
                  ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Bottom Shortcut Hint & Voice Status Caption */}
        <div className="mt-1.5 text-center text-[10px] text-slate-500 font-mono tracking-tight flex items-center justify-center gap-2">
          {isRecording ? (
            <span className="text-red-400 font-semibold animate-pulse flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Voice recording active — auto-stops on silence or tap square button
            </span>
          ) : isTranscribing ? (
            <span className="text-purple-400 font-semibold animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-300 animate-spin" /> Whisper AI converting speech to accurate text...
            </span>
          ) : (
            <span>Press Enter to send • Click Camera to snap photo • Click Mic to dictate</span>
          )}
        </div>
      </div>

      {/* Camera Photo Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapturePhoto={handleCapturePhoto}
        darkMode={darkMode}
      />
    </div>
  );
};
