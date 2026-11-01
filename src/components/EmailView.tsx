import React, { useState, useRef } from 'react';
import { Mail, Send, Check, Sparkles, Mic, Trash2, Search, ArrowRight, Loader2 } from 'lucide-react';
import { EmailMessage } from '../types.js';

interface EmailViewProps {
  emails: EmailMessage[];
  onSendEmail: (to: string, cc: string, subject: string, body: string) => void;
  onClearSentEmails?: () => void;
  onDeleteEmail?: (id: string) => void;
  darkMode?: boolean;
}

export const EmailView: React.FC<EmailViewProps> = ({
  emails,
  onSendEmail,
  onClearSentEmails,
  onDeleteEmail,
}) => {
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'drafts' | 'sent'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(emails[0] || null);

  // Email Prompt Search Bar State
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Email Fields State
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [autoTypedToast, setAutoTypedToast] = useState(false);

  const folderEmails = emails.filter((e) => e.folder === activeFolder);

  // Helper to extract clean email address
  const extractEmailAddress = (str?: string): string => {
    if (!str) return '';
    const match = str.match(/<([^>]+)>/);
    if (match) return match[1];
    const directMatch = str.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
    if (directMatch) return directMatch[0];
    return str;
  };

  // Populate composer fields when email is clicked
  const handleSelectAndPopulateEmail = (email: EmailMessage) => {
    setSelectedEmail(email);
    const recipient = email.folder === 'inbox' ? extractEmailAddress(email.from) || email.to : email.to || extractEmailAddress(email.from);
    setTo(recipient);
    setCc(email.cc || '');
    setSubject(email.subject || '');
    setBody(email.body || email.snippet || '');

    setAutoTypedToast(true);
    setTimeout(() => setAutoTypedToast(false), 3000);
  };

  // Handle deleting an individual email
  const handleDeleteItem = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    if (onDeleteEmail) {
      onDeleteEmail(emailId);
    }
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
    }
  };

  // Clear composer form fields
  const handleClearComposer = () => {
    setTo('');
    setCc('');
    setSubject('');
    setBody('');
    setSelectedEmail(null);
  };

  // Start Whisper Audio Recording
  const startWhisperRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const options = MediaRecorder.isTypeSupported('audio/webm')
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
        setIsListening(false);
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        }

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 200) return;

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
            if (data.text) {
              setPromptInput(data.text);
              handleGenerateFromPrompt(data.text);
            }
            setIsTranscribing(false);
          };
        } catch (err) {
          console.error('Whisper transcription error:', err);
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250);
      setIsListening(true);

      recordingTimerRef.current = setTimeout(() => {
        stopWhisperRecording();
      }, 15000);
    } catch (err) {
      console.warn('Microphone error:', err);
      setIsListening(false);
    }
  };

  const stopWhisperRecording = () => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    } else {
      setIsListening(false);
    }
  };

  // Voice Speech Recognition Handler
  const handleVoiceInput = () => {
    if (isListening) {
      stopWhisperRecording();
    } else {
      startWhisperRecording();
    }
  };

  // Generate Email Draft from Prompt Search Bar
  const handleGenerateFromPrompt = async (customPrompt?: string) => {
    const textToUse = customPrompt || promptInput;
    if (!textToUse.trim()) return;

    setIsGenerating(true);

    try {
      // Send query to AI engine to parse intent
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Parse and generate an email draft from this user request: "${textToUse}".
Return ONLY a valid JSON object with keys "to", "cc", "subject", "body".
Rules:
- If recipient email or contact is NOT explicitly specified, leave "to" as an empty string "".
- If carbon copy (Cc) is NOT explicitly specified, leave "cc" as an empty string "".
- If subject is NOT explicitly specified, extract a clean brief subject or leave as "".
- Output ONLY JSON without markdown syntax.`,
          activeModel: 'gemini-3.1-flash-lite',
        }),
      });

      const data = await res.json();
      const content = data.reply || data.response || '';

      // Clean JSON string
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setTo(parsed.to || '');
        setCc(parsed.cc || '');
        setSubject(parsed.subject || '');
        setBody(parsed.body || '');
      } else {
        // Fallback simple parsing
        const lower = textToUse.toLowerCase();
        let extractedTo = '';
        let extractedCc = '';

        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
        const matches = textToUse.match(emailRegex) || [];

        if (matches.length > 0) extractedTo = matches[0];
        if (matches.length > 1) extractedCc = matches[1];

        setTo(extractedTo);
        setCc(extractedCc);
        setSubject(textToUse.slice(0, 35));
        setBody(`Hello,\n\nI am writing regarding ${textToUse}.\n\nBest regards`);
      }
    } catch {
      // Simple fallback if offline or parse error
      setSubject('Email regarding ' + textToUse.slice(0, 25));
      setBody(`Hello,\n\n${textToUse}\n\nBest regards`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() && !subject.trim() && !body.trim()) return;

    // Send email via Nexa backend store
    onSendEmail(to, cc, subject, body);

    // Open native/browser default email client (Gmail, Outlook, Apple Mail)
    let mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (cc.trim()) {
      mailtoUrl += `&cc=${encodeURIComponent(cc)}`;
    }
    try {
      window.open(mailtoUrl, '_blank');
    } catch {
      // Ignored if iframe security policy restricts opening popup windows
    }

    setSentSuccess(true);
    setTo('');
    setCc('');
    setSubject('');
    setBody('');
    setPromptInput('');
    setTimeout(() => setSentSuccess(false), 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Logitix Email Assistant
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compose and dispatch emails directly or open in your default Mail app.
          </p>
        </div>

        {/* Folder Tabs */}
        <div className="flex items-center gap-1.5">
          {(['inbox', 'drafts', 'sent'] as const).map((folder) => (
            <button
              key={folder}
              onClick={() => {
                setActiveFolder(folder);
                const first = emails.find((e) => e.folder === folder);
                setSelectedEmail(first || null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                activeFolder === folder
                  ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Email List + Prompt Search Bar & Form */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Email Sidebar List */}
        <div className="md:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              {activeFolder} ({folderEmails.length})
            </span>
            {activeFolder === 'sent' && folderEmails.length > 0 && onClearSentEmails && (
              <button
                onClick={onClearSentEmails}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline transition-all"
              >
                <Trash2 className="w-3 h-3" /> Clear Sent History
              </button>
            )}
          </div>

          {folderEmails.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-500 text-xs backdrop-blur-2xl">
              No emails in {activeFolder}
            </div>
          ) : (
            folderEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleSelectAndPopulateEmail(email)}
                className={`group relative p-3.5 rounded-2xl border cursor-pointer transition-all backdrop-blur-2xl ${
                  selectedEmail?.id === email.id
                    ? 'bg-white/10 border-cyan-500/40 shadow-lg text-white'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300'
                }`}
                title="Click to load and edit in composer form"
              >
                <div className="flex items-center justify-between mb-1 pr-6">
                  <span className="text-xs font-semibold truncate max-w-[170px]">
                    {email.to ? `To: ${email.to}` : email.from}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">{email.date}</span>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteItem(e, email.id)}
                  title="Delete email"
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-80 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {email.cc && <div className="text-[10px] text-slate-400 truncate mb-1">Cc: {email.cc}</div>}
                <h4 className="text-xs font-medium text-blue-400 truncate pr-4">{email.subject}</h4>
                <p className="text-[11px] text-slate-400 truncate mt-1">{email.snippet}</p>

                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400/80 font-mono">
                  <span>Click to load into composer</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Area: Prompt Search Bar + Dynamic Composer */}
        <div className="md:col-span-7 space-y-4">
          {/* Top Search Bar: "Type or say what kind of email you want" */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-2xl space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Email Prompt Assistant
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateFromPrompt();
              }}
              className="relative flex items-center"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Type or say what kind of email you want..."
                className="w-full h-11 pl-10 pr-24 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500/80 focus:outline-none focus:border-purple-500/50 transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={isTranscribing}
                  title={
                    isListening
                      ? 'Click to Stop Listening'
                      : isTranscribing
                      ? 'Transcribing audio with Whisper...'
                      : 'Say what email you want'
                  }
                  className={`p-1.5 rounded-lg transition-all ${
                    isListening
                      ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30'
                      : isTranscribing
                      ? 'text-purple-400 bg-purple-500/10'
                      : 'hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !promptInput.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
          </div>

          {/* Email Form */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 shadow-xl backdrop-blur-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-300">
                  Email Message Editor
                </h3>
                {autoTypedToast && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono animate-pulse">
                    ✨ Loaded from selection
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(to || cc || subject || body) && (
                  <button
                    type="button"
                    onClick={handleClearComposer}
                    className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded-lg border border-white/10 hover:bg-white/5 font-mono"
                  >
                    Clear Form
                  </button>
                )}
                {sentSuccess && (
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Email Dispatched!
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-3">
              {/* To Field */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">To (Recipient)</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="e.g. recipient@example.com"
                  className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500/50 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              {/* Cc Field */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Cc (Carbon Copy)</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="e.g. cc@example.com (Optional)"
                  className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500/50 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              {/* Subject Field */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Project Update & Submission"
                  className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500/50 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              {/* Body Field */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Message Body</label>
                <textarea
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500/50 focus:outline-none focus:border-purple-500/50 custom-scrollbar font-sans leading-relaxed transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-xs flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all shadow-md shadow-purple-500/20 border border-white/10"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Email via Logitix Agent</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

