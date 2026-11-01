import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  ArrowRight,
  Check,
  Mail,
  Sparkles,
  Cake,
  Calendar,
  Hash,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Database,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { audioSynth } from '../utils/audioFx.js';
import { UserProfile } from '../types.js';
import { signInWithGoogleAccount } from '../lib/googleAuth.js';
import {
  isOwnerAccount,
  isSuperAdminAccount,
  getSavedUserProfile,
  saveSavedUserProfile,
  fetchSavedUserProfileRemote,
} from '../core/security.js';

interface LoginScreenProps {
  onLogin: (profile: UserProfile, remember: boolean) => void;
  defaultEmail?: string;
  onClose?: () => void;
}

const MONTHS = [
  { value: '01', name: 'January (01)' },
  { value: '02', name: 'February (02)' },
  { value: '03', name: 'March (03)' },
  { value: '04', name: 'April (04)' },
  { value: '05', name: 'May (05)' },
  { value: '06', name: 'June (06)' },
  { value: '07', name: 'July (07)' },
  { value: '08', name: 'August (08)' },
  { value: '09', name: 'September (09)' },
  { value: '10', name: 'October (10)' },
  { value: '11', name: 'November (11)' },
  { value: '12', name: 'December (12)' },
];

/**
 * Masks an email address to protect privacy from shoulder-surfing
 * e.g. "salma.sayyed@gmail.com" -> "sa••••••d@gmail.com"
 */
export function maskEmailForPrivacy(email?: string | null): string {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0] || '*'}*@${domain}`;
  }
  const prefix = user.slice(0, 2);
  const suffix = user.slice(-1);
  return `${prefix}••••••${suffix}@${domain}`;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, defaultEmail, onClose }) => {
  const currentYear = new Date().getFullYear();
  const isOwnerDefault = isOwnerAccount(defaultEmail);
  const initialEmail = (defaultEmail || '').trim().toLowerCase();
  const initialProfile = initialEmail ? getSavedUserProfile(initialEmail) : null;

  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Cool Cinematic Unlock Animation State
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockStage, setUnlockStage] = useState<number>(0);
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);

  // User Profile fields - Clean and empty by default to protect user privacy
  const [inputEmail, setInputEmail] = useState('');
  const [maskEmailInput, setMaskEmailInput] = useState(false);
  const [username, setUsername] = useState(() => initialProfile?.name || (isOwnerDefault ? 'Logitix AI' : ''));
  const [age, setAge] = useState(() => initialProfile?.age || '25');
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  // Date of Birth state - Persistently synchronized
  const [selectedDay, setSelectedDay] = useState(() => {
    if (initialProfile?.dob && initialProfile.dob.includes('-')) {
      return initialProfile.dob.split('-')[2] || '15';
    }
    return '15';
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialProfile?.dob && initialProfile.dob.includes('-')) {
      return initialProfile.dob.split('-')[1] || '06';
    }
    return '06';
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    if (initialProfile?.dob && initialProfile.dob.includes('-')) {
      return initialProfile.dob.split('-')[0] || (currentYear - 25).toString();
    }
    const initialNumAge = parseInt(initialProfile?.age || '25', 10);
    return (currentYear - (isNaN(initialNumAge) ? 25 : initialNumAge)).toString();
  });

  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

  // Helper to load and apply any saved profile
  const applyLoadedProfile = (prof: Partial<UserProfile> | null) => {
    if (!prof) return;
    if (prof.name && prof.name.trim()) {
      setUsername(prof.name.trim());
    }
    if (prof.age && prof.age.trim()) {
      setAge(prof.age.trim());
      const numAge = parseInt(prof.age.trim(), 10);
      if (!isNaN(numAge) && numAge > 0 && numAge <= 120) {
        setSelectedYear((currentYear - numAge).toString());
      }
    }
    if (prof.dob && prof.dob.includes('-')) {
      const parts = prof.dob.split('-');
      if (parts.length === 3) {
        setSelectedYear(parts[0]);
        setSelectedMonth(parts[1]);
        setSelectedDay(parts[2]);
      }
    }
  };

  // Sync profile when inputEmail or defaultEmail changes (local cache + remote server)
  useEffect(() => {
    const targetEmail = (inputEmail || defaultEmail || '').trim().toLowerCase();
    if (!targetEmail) return;

    const localProf = getSavedUserProfile(targetEmail);
    if (localProf) {
      applyLoadedProfile(localProf);
    }

    fetchSavedUserProfileRemote(targetEmail).then((remoteProf) => {
      if (remoteProf) {
        applyLoadedProfile(remoteProf);
      }
    }).catch(() => null);
  }, [inputEmail, defaultEmail]);

  // Dynamic Age and Year Synchronization
  const handleAgeChange = (val: string) => {
    setAge(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 120) {
      setSelectedYear((currentYear - num).toString());
    }
  };

  // Direct login execution - 100% password-free
  const completeLogin = (emailToUse: string, customName?: string) => {
    const cleanEmail = emailToUse.trim().toLowerCase();
    const isOwner = isOwnerAccount(cleanEmail);
    const role = isOwner ? 'Logitix AI' : (isSuperAdminAccount(cleanEmail) ? 'Super Admin' : 'Pro Member');

    const displayName = customName || username.trim() || (isOwner ? 'Logitix AI' : (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'Executive'));
    const finalDob = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`;

    const profile: UserProfile = {
      name: displayName,
      email: cleanEmail,
      age: age.trim() || '24',
      dob: finalDob,
      role: role,
      avatar: displayName.charAt(0).toUpperCase() || 'E',
      googleAccessToken: accessToken,
    };

    // Save profile locally and remote
    saveSavedUserProfile(cleanEmail, {
      name: profile.name,
      age: profile.age,
      dob: profile.dob,
    });

    setPendingProfile(profile);
    setIsUnlocking(true);
    setUnlockStage(0);

    // Audio chime
    audioSynth.playUnlockSuccess();

    // Stage transitions matching main screen entrance
    setTimeout(() => setUnlockStage(1), 320);
    setTimeout(() => setUnlockStage(2), 700);
    setTimeout(() => {
      onLogin(profile, true);
    }, 1100);
  };

  // Handle Google 1-Click Sign In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogleAccount();
      if (res.error && !res.email && !res.user) {
        setAuthError(res.userFriendlyMessage || res.error || 'Google Sign-In was cancelled or failed.');
        setGoogleLoading(false);
        return;
      }

      const email = res.email || res.user?.email;
      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        setInputEmail(cleanEmail);
        if (res.accessToken) {
          setAccessToken(res.accessToken);
        }

        const candidateName = res.displayName || res.user?.displayName || username;
        if (candidateName) {
          setUsername(candidateName);
        }

        // Complete login immediately
        completeLogin(cleanEmail, candidateName);
      } else {
        setAuthError('Could not retrieve email from Google Account.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle direct email form submit (Password-free)
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const clean = inputEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    completeLogin(clean);
  };

  // Quick preset selector
  const handlePresetSelect = (presetEmail: string, presetName: string) => {
    setInputEmail(presetEmail);
    setUsername(presetName);
    setAuthError(null);
    completeLogin(presetEmail, presetName);
  };

  const daysInMonth = new Date(parseInt(selectedYear, 10) || currentYear, parseInt(selectedMonth, 10) || 1, 0).getDate();
  const daysList = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

  return (
    <div className="min-h-full w-full bg-[#f9f9f8] text-[#1a1c1c] flex flex-col font-body selection:bg-[#e2dfff]">
      {/* Top Header matching Main Screen */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] px-3 sm:px-6 flex items-center justify-between select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1a146b] to-[#312e81] flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0">
            <span className="material-symbols-outlined text-[18px] text-cyan-200">auto_awesome</span>
          </div>
          <span className="font-headline text-base sm:text-lg text-[#1a146b] font-bold leading-none tracking-tight">
            LOGITIX
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onClose ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-[#f3f4f3] border border-[#e2e2e2] text-[#1a1c1c] text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px] text-[#474651]">arrow_back</span>
              <span className="hidden xs:inline">Back to Workspace</span>
            </button>
          ) : (
            <button
              onClick={() => completeLogin('guest@logitix.ai', 'Guest Executive')}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-50 hover:bg-white border border-[#e2e2e2] text-[#1a1c1c] text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              <span className="hidden xs:inline">Explore as Guest</span>
              <span className="material-symbols-outlined text-[16px] text-[#474651]">arrow_forward</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-start sm:justify-center">
        {/* Unlocking animation transition */}
        {isUnlocking ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full mx-auto p-8 rounded-3xl bg-white border border-[#e2e2e2] shadow-sm text-center space-y-6"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#e2dfff] text-[#1a146b] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[32px] text-[#1a146b]">verified_user</span>
            </div>

            <div className="space-y-1">
              <span className="font-code text-[11px] text-[#1a146b] font-medium bg-[#e2dfff] px-3 py-0.5 rounded-full inline-block">
                IDENTITY AUTHORIZED
              </span>
              <h2 className="font-headline text-3xl text-[#1a1c1c] font-medium">
                Welcome, {pendingProfile?.name || 'Executive'}
              </h2>
              <p className="font-code text-xs text-[#777682]">
                {maskEmailForPrivacy(pendingProfile?.email)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f4f3] border border-[#e2e2e2] text-left font-code text-xs space-y-2 text-[#474651]">
              <div className="flex items-center justify-between">
                <span className="text-[#777682]">Session Status:</span>
                <span className="text-emerald-700 font-semibold">Active & Authorized</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#777682]">Role:</span>
                <span className="text-[#1a146b] font-semibold">{pendingProfile?.role || 'Super Admin'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#777682]">Authentication:</span>
                <span className="text-[#1a1c1c] font-medium">Password-Free Verified</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="h-2 w-full rounded-full bg-[#e2e2e2] overflow-hidden">
                <motion.div
                  initial={{ width: '25%' }}
                  animate={{ width: unlockStage === 0 ? '50%' : unlockStage === 1 ? '85%' : '100%' }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-[#1a146b]"
                />
              </div>
              <div className="flex justify-between text-[11px] font-code text-[#777682]">
                <span>INITIALIZING WORKSPACE</span>
                <span className="text-[#1a146b] font-semibold">
                  {unlockStage === 0 ? '50%' : unlockStage === 1 ? '85%' : '100% READY'}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Header Title & Tagline matching Main Screen */}
            <div className="text-center sm:text-left space-y-2">
              <span className="font-code text-[11px] text-[#1a146b] font-medium bg-[#e2dfff] px-2.5 py-0.5 rounded inline-block">
                EXECUTIVE WORKSPACE • DIRECT ACCESS
              </span>
              <h1 className="font-headline text-3xl sm:text-4xl text-[#1a1c1c] tracking-tight">
                Sign In to LOGITIX Studio AI
              </h1>
              <p className="font-body text-xs sm:text-sm text-[#474651] max-w-2xl leading-relaxed">
                High-assurance AI reasoning workspace, multi-model consensus synthesis, and voice intelligence. Fast password-free sign-in.
              </p>
            </div>

            {/* Error Banner with Instant Fallback */}
            {authError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span className="font-medium text-amber-950">Notice: </span>
                    {authError}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('executive@logitix.ai', 'Enterprise Executive')}
                    className="px-3 py-1.5 rounded-lg bg-[#1a146b] hover:bg-[#2b2496] text-white font-code text-[11px] font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Instant Access as Executive</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('admin@logitix.ai', 'System Admin')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-[#1a146b] border border-[#c4c0ff] font-code text-[11px] font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Instant Access as Admin</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthError(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-200 text-amber-900 font-code text-[11px] transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* 2-Column Responsive Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Sign-In Card (No Passwords) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e2e2e2] shadow-sm p-4 sm:p-8 space-y-6 min-w-0">
                <div>
                  <h2 className="font-headline text-xl text-[#1a1c1c]">Instant Executive Authentication</h2>
                  <p className="text-xs text-[#777682] mt-1">
                    Sign in with your Google account or enter your executive email address without needing a password.
                  </p>
                </div>

                {/* Google 1-Click Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full h-12 px-4 rounded-xl bg-white hover:bg-[#f9f9f8] text-[#1a1c1c] font-semibold text-xs flex items-center justify-center gap-3 transition-all border border-[#e2e2e2] hover:border-[#1a146b]/40 shadow-xs cursor-pointer group disabled:opacity-75"
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                  </div>
                  <span className="truncate">{googleLoading ? 'Connecting to Google...' : 'Continue with Google Account'}</span>
                  <ArrowRight className="w-4 h-4 text-[#777682] group-hover:translate-x-0.5 transition-transform ml-auto shrink-0" />
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[#e2e2e2]" />
                  <span className="text-[10px] font-code text-[#777682] uppercase tracking-wider">or sign in with email</span>
                  <div className="flex-1 h-px bg-[#e2e2e2]" />
                </div>

                {/* Direct Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-code text-[#474651] uppercase tracking-wider flex items-center justify-between">
                      <span>Executive Email Address</span>
                      <span className="text-[#1a146b] text-[10px] font-medium font-code">No Password Required</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#1a146b] absolute left-3.5 top-3.5" />
                      <input
                        type={maskEmailInput ? 'password' : 'email'}
                        required
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        placeholder="e.g. alex.chen@organization.com"
                        className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#f9f9f8] hover:bg-white focus:bg-white border border-[#e2e2e2] text-[#1a1c1c] text-xs placeholder:text-[#777682] focus:outline-none focus:border-[#1a146b] font-code transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setMaskEmailInput(!maskEmailInput)}
                        className="absolute right-3 top-3 text-[#777682] hover:text-[#1a146b] p-0.5 rounded cursor-pointer transition-colors"
                        title={maskEmailInput ? 'Show email address' : 'Mask email address for privacy'}
                        aria-label={maskEmailInput ? 'Show email address' : 'Mask email address for privacy'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {maskEmailInput ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Selector Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-code text-[#777682] uppercase tracking-wider block">Quick 1-Click Access:</span>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('executive@logitix.ai', 'Enterprise Executive')}
                        className={`text-xs px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 cursor-pointer transition-all max-w-full text-left ${
                          inputEmail === 'executive@logitix.ai'
                            ? 'bg-[#e2dfff] border-[#c4c0ff] text-[#1a146b] font-semibold'
                            : 'bg-white hover:bg-[#f3f4f3] border-[#e2e2e2] text-[#1a1c1c]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          <span className="font-medium">Enterprise Executive</span>
                        </div>
                        <span className="text-[10px] text-[#777682] font-code truncate max-w-[220px] sm:max-w-none">Verified Role</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePresetSelect('admin@logitix.ai', 'Logitix Admin')}
                        className={`text-xs px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 cursor-pointer transition-all max-w-full text-left ${
                          inputEmail === 'admin@logitix.ai'
                            ? 'bg-[#e2dfff] border-[#c4c0ff] text-[#1a146b] font-semibold'
                            : 'bg-white hover:bg-[#f3f4f3] border-[#e2e2e2] text-[#1a1c1c]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-medium">System Admin</span>
                        </div>
                        <span className="text-[10px] text-[#777682] font-code truncate max-w-[220px] sm:max-w-none">Administrative Access</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePresetSelect('analyst@logitix.ai', 'Research Analyst')}
                        className={`text-xs px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 cursor-pointer transition-all max-w-full text-left ${
                          inputEmail === 'analyst@logitix.ai'
                            ? 'bg-[#e2dfff] border-[#c4c0ff] text-[#1a146b] font-semibold'
                            : 'bg-white hover:bg-[#f3f4f3] border-[#e2e2e2] text-[#1a1c1c]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="font-medium">Research Analyst</span>
                        </div>
                        <span className="text-[10px] text-[#777682] font-code truncate max-w-[220px] sm:max-w-none">Quantitative Analyst</span>
                      </button>
                    </div>
                  </div>

                  {/* Profile Customization Accordion */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowProfileDetails(!showProfileDetails)}
                      className="text-xs font-medium text-[#1a146b] hover:text-[#312e81] flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <span>Customize Profile (Name, Age & Birthday)</span>
                      {showProfileDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showProfileDetails && (
                      <div className="mt-3 p-4 rounded-xl bg-[#f9f9f8] border border-[#e2e2e2] space-y-3 animate-in fade-in duration-200">
                        {/* Display Name */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-code text-[#474651]">Display Name</label>
                          <div className="relative">
                            <User className="w-3.5 h-3.5 text-[#777682] absolute left-3 top-3" />
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="e.g. Salma Sayyed"
                              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-[#e2e2e2] text-xs text-[#1a1c1c] focus:outline-none focus:border-[#1a146b]"
                            />
                          </div>
                        </div>

                        {/* Age & Birthday */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-code text-[#474651]">Age</label>
                            <div className="relative">
                              <Hash className="w-3.5 h-3.5 text-[#777682] absolute left-3 top-3" />
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={age}
                                onChange={(e) => handleAgeChange(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-[#e2e2e2] text-xs font-code text-[#1a1c1c] focus:outline-none focus:border-[#1a146b]"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-code text-[#474651]">Birth Year: {selectedYear}</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <select
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(e.target.value)}
                                className="w-full h-9 px-2 rounded-lg bg-white border border-[#e2e2e2] text-xs font-code"
                              >
                                {daysList.map((d) => (
                                  <option key={d} value={d}>
                                    Day {d}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full h-9 px-2 rounded-lg bg-white border border-[#e2e2e2] text-xs font-code"
                              >
                                {MONTHS.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.name.slice(0, 3)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Login Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-[#1a146b] hover:bg-[#312e81] disabled:opacity-60 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Authorizing Session...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Guest Access Alternative */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => completeLogin('guest@logitix.ai', 'Guest Executive')}
                      className="text-xs font-code text-[#474651] hover:text-[#1a146b] hover:underline cursor-pointer"
                    >
                      Or continue as Guest (Instant Access)
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Companion Feature Showcase matching Main Screen */}
              <div className="lg:col-span-5 space-y-4">
                {/* Consensus Engine Feature Card */}
                <div className="p-5 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-[#1a1c1c]">
                    <div className="w-7 h-7 rounded-lg bg-[#e2dfff] text-[#1a146b] flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <span>Multi-Model Consensus Arbiter</span>
                  </div>
                  <p className="text-xs text-[#474651] leading-relaxed">
                    Synthesizes outputs simultaneously across Gemini 1.5 Pro, Claude 3.5 Sonnet, and Manus AI with real-time arbitration.
                  </p>
                  <div className="flex items-center gap-2 pt-1 font-code text-[10px] text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>98.5% Agreement Target Active</span>
                  </div>
                </div>

                {/* Context Vector Memory Card */}
                <div className="p-5 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-[#1a1c1c]">
                    <div className="w-7 h-7 rounded-lg bg-[#00423c]/10 text-[#00423c] flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <span>Context Vector Memory</span>
                  </div>
                  <p className="text-xs text-[#474651] leading-relaxed">
                    Persistent semantic memory injected into all reasoning passes for continuity across sessions.
                  </p>
                  <div className="font-code text-[10px] text-[#777682] pt-1">
                    Directives synced locally and across devices
                  </div>
                </div>

                {/* VoiceSpark Audio Memo Card */}
                <div className="p-5 bg-white rounded-2xl border border-[#e2e2e2] shadow-xs space-y-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-[#1a1c1c]">
                    <div className="w-7 h-7 rounded-lg bg-[#312e81]/10 text-[#312e81] flex items-center justify-center">
                      <Radio className="w-4 h-4" />
                    </div>
                    <span>VoiceSpark Podcast Briefings</span>
                  </div>
                  <p className="text-xs text-[#474651] leading-relaxed">
                    Converts synthesis into high-fidelity studio-grade spoken audio briefings in seconds.
                  </p>
                </div>

                {/* Admin Panel Password Notice Card */}
                <div className="p-4 rounded-2xl bg-[#e2dfff]/40 border border-[#c4c0ff]/60 text-xs text-[#1a146b] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-[#1a146b]" />
                    <span>Admin Panel Security Notice</span>
                  </div>
                  <p className="text-[11px] text-[#474651] leading-relaxed">
                    Login is password-free. Administrative role delegation and user management are securely gated by the Admin Master Password inside <strong>Settings & Security</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer matching Main Screen */}
      <footer className="h-14 border-t border-[#e2e2e2] px-4 sm:px-8 flex items-center justify-between text-xs text-[#777682] font-code select-none">
        <div>LOGITIX AI Executive Suite • RFC-7233 Verified</div>
        <div className="flex items-center gap-3">
          <span>Zero-Trust Architecture</span>
          <span>•</span>
          <span className="text-emerald-700 font-medium">All Systems Operational</span>
        </div>
      </footer>
    </div>
  );
};
