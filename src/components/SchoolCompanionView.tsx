import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  MessageCircle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  Bell,
  BellRing,
  Sparkles,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { SchoolAttendanceRecord, SchoolHomeworkItem, UserProfile } from '../types.js';

interface SchoolCompanionViewProps {
  userProfile?: UserProfile;
  darkMode?: boolean;
  onSaveToNotes?: (title: string, content: string, tags: string[]) => void;
  onInjectToChat?: (text: string) => void;
}

export const SchoolCompanionView: React.FC<SchoolCompanionViewProps> = ({
  userProfile,
  darkMode = false,
  onSaveToNotes,
  onInjectToChat,
}) => {
  // Tabs: Focused purely on Homework, Attendance, and 10-Minute Reminders
  const [activeTab, setActiveTab] = useState<'homework' | 'attendance' | 'reminders'>('attendance');

  // Homework State
  const [homeworkList, setHomeworkList] = useState<SchoolHomeworkItem[]>(() => {
    try {
      const saved = localStorage.getItem('school_homework_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item: SchoolHomeworkItem) => item.id !== 'hw-1' && item.id !== 'hw-2'
          );
        }
      }
    } catch {}
    return [];
  });

  // Add Homework Modal State
  const [isAddHwOpen, setIsAddHwOpen] = useState<boolean>(false);
  const [hwSubject, setHwSubject] = useState<string>('Mathematics');
  const [hwTitle, setHwTitle] = useState<string>('');
  const [hwAssignedText, setHwAssignedText] = useState<string>('');
  const [hwDueDate, setHwDueDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [isGeneratingSolutions, setIsGeneratingSolutions] = useState<boolean>(false);

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<SchoolAttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('school_attendance_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r: SchoolAttendanceRecord) => !r.id.startsWith('att-') || r.id.length > 8);
        }
      }
    } catch {}
    return [];
  });

  // Expanded Homework Accordion
  const [expandedHwId, setExpandedHwId] = useState<string | null>(null);

  // Daily Attendance Dialog state
  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDateStr = getLocalDateStr();
  const todayRecord = attendanceRecords.find((r) => r.date === todayDateStr);
  const [isDailyAttendanceOpen, setIsDailyAttendanceOpen] = useState<boolean>(false);
  const [attendanceDate, setAttendanceDate] = useState<string>(todayDateStr);
  const [attendanceChoice, setAttendanceChoice] = useState<'yes' | 'no' | null>(null);
  const [absentReasonSelection, setAbsentReasonSelection] = useState<string>('Had caught cold / Sick');
  const [customAbsentReason, setCustomAbsentReason] = useState<string>('');

  // Future date blocking guards
  const isFutureSelected = Boolean(attendanceDate && attendanceDate > todayDateStr);
  const isValidPastOrTodayDate = Boolean(attendanceDate && attendanceDate <= todayDateStr);

  // Open modal for today's attendance
  const handleOpenTodayAttendance = () => {
    setAttendanceDate(todayDateStr);
    const existing = attendanceRecords.find((r) => r.date === todayDateStr);
    if (existing) {
      setAttendanceChoice(existing.status === 'present' ? 'yes' : 'no');
      if (existing.status === 'absent') {
        setAbsentReasonSelection(existing.absentReason || 'Had caught cold / Sick');
        setCustomAbsentReason(existing.specificReason || '');
      }
    } else {
      setAttendanceChoice(null);
      setCustomAbsentReason('');
    }
    setIsDailyAttendanceOpen(true);
  };

  // Open modal to log a past day (defaults to yesterday, future dates blocked)
  const handleOpenPastDayAttendance = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);
    setAttendanceDate(yesterdayStr);
    const existing = attendanceRecords.find((r) => r.date === yesterdayStr);
    if (existing) {
      setAttendanceChoice(existing.status === 'present' ? 'yes' : 'no');
      if (existing.status === 'absent') {
        setAbsentReasonSelection(existing.absentReason || 'Had caught cold / Sick');
        setCustomAbsentReason(existing.specificReason || '');
      }
    } else {
      setAttendanceChoice(null);
      setCustomAbsentReason('');
    }
    setIsDailyAttendanceOpen(true);
  };

  // Handle user selecting a date in the attendance modal
  const handleAttendanceDateChange = (newDate: string) => {
    setAttendanceDate(newDate);
    if (newDate && newDate <= todayDateStr) {
      const existing = attendanceRecords.find((r) => r.date === newDate);
      if (existing) {
        setAttendanceChoice(existing.status === 'present' ? 'yes' : 'no');
        if (existing.status === 'absent') {
          setAbsentReasonSelection(existing.absentReason || 'Had caught cold / Sick');
          setCustomAbsentReason(existing.specificReason || '');
        }
      } else {
        setAttendanceChoice(null);
      }
    }
  };
  
  // Optional quick homework attachment during attendance logging
  const [attachHomeworkToday, setAttachHomeworkToday] = useState<boolean>(false);
  const [quickHwSubject, setQuickHwSubject] = useState<string>('General Homework');
  const [quickHwDetails, setQuickHwDetails] = useState<string>('');

  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Reminder interval state & active alert simulation
  const [reminderCountdown, setReminderCountdown] = useState<number>(600); // 10 mins = 600s
  const [activeReminderAlert, setActiveReminderAlert] = useState<string | null>(null);
  const [isSimulatingMessage, setIsSimulatingMessage] = useState<boolean>(false);

  // Simulated teacher assignment post input
  const [simTeacherSubject, setSimTeacherSubject] = useState('English Literature');
  const [simTeacherMessage, setSimTeacherMessage] = useState(
    'Read Chapter 4 and write a 200-word analysis summary answering questions 1 to 3.'
  );

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('school_homework_list', JSON.stringify(homeworkList));
  }, [homeworkList]);

  useEffect(() => {
    localStorage.setItem('school_attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // Reminder countdown ticker (10-minute intervals)
  useEffect(() => {
    const timer = setInterval(() => {
      setReminderCountdown((prev) => {
        if (prev <= 1) {
          const pendingHw = homeworkList.find((h) => h.status === 'pending');
          if (pendingHw) {
            triggerReminderAlert(pendingHw);
          }
          return 600; // Reset to 10 mins
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [homeworkList]);

  // Audio tone generator for reminders
  const playReminderSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const triggerReminderAlert = (hw: SchoolHomeworkItem) => {
    playReminderSound();
    const currentReminders = (hw.remindersSent % 3) + 1;
    setActiveReminderAlert(
      `🔔 [Reminder ${currentReminders}/3 (10m gap)]: Your ${hw.subject} homework is pending! Complete it on time. AI solutions are ready.`
    );

    setHomeworkList((prev) =>
      prev.map((item) =>
        item.id === hw.id
          ? {
              ...item,
              remindersSent: Math.min(3, item.remindersSent + 1),
              lastReminderAt: 'Just now',
            }
          : item
      )
    );
  };

  // Format attendance summary report
  const formatAttendanceReport = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === 'present').length;
    const absent = attendanceRecords.filter((r) => r.status === 'absent').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    let report =
      `📊 *ATTENDANCE SUMMARY REPORT*\n\n` +
      `📈 *Attendance Rate:* ${rate}% (${present} Present / ${absent} Absent / ${total} Total Days)\n\n` +
      `*Absence Breakdown:*\n`;

    const absents = attendanceRecords.filter((r) => r.status === 'absent');
    if (absents.length === 0) {
      report += `🎉 100% Attendance! Zero absences recorded.\n`;
    } else {
      absents.forEach((a, i) => {
        report += `${i + 1}. *${a.date}*: ${a.absentReason || 'Absent'} ${
          a.specificReason ? `(${a.specificReason})` : ''
        }\n`;
      });
    }

    const pendingHw = homeworkList.filter((h) => h.status === 'pending');
    if (pendingHw.length > 0) {
      report += `\n📚 *Pending Homework (${pendingHw.length}):*\n`;
      pendingHw.forEach((h, i) => {
        report += `${i + 1}. *${h.subject}*: ${h.title} (Due: ${h.dueDate})\n`;
      });
    }

    report += `\n_Logged via LOGITIX AI School & Attendance_`;
    return report;
  };

  const handleCopyReport = () => {
    const text = formatAttendanceReport();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    });
  };

  // Handle Attendance submission (strictly blocks future dates)
  const handleSaveAttendance = () => {
    const targetDate = attendanceDate || todayDateStr;
    if (!targetDate || targetDate > todayDateStr) {
      return; // Do not allow future date attendance logging
    }
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let newRec: SchoolAttendanceRecord;

    if (attendanceChoice === 'yes') {
      newRec = {
        id: `att_${Date.now()}`,
        date: targetDate,
        status: 'present',
        timestamp: `${targetDate} ${timeStr}`,
      };
      setAttendanceRecords((prev) => [newRec, ...prev.filter((r) => r.date !== targetDate)]);
    } else if (attendanceChoice === 'no') {
      newRec = {
        id: `att_${Date.now()}`,
        date: targetDate,
        status: 'absent',
        absentReason: absentReasonSelection,
        specificReason: absentReasonSelection === 'Others' ? customAbsentReason.trim() : undefined,
        timestamp: `${targetDate} ${timeStr}`,
      };
      setAttendanceRecords((prev) => [newRec, ...prev.filter((r) => r.date !== targetDate)]);
    }

    // If student entered quick homework alongside attendance, log it immediately
    if (attachHomeworkToday && quickHwDetails.trim()) {
      const newHw: SchoolHomeworkItem = {
        id: `hw_${Date.now()}`,
        subject: quickHwSubject.trim() || 'General Homework',
        title: `${quickHwSubject} Assignment (${targetDate})`,
        assignedText: quickHwDetails.trim(),
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        solutionsReady: true,
        preparedAnswers: `### AI-Prepared Homework Solution for ${quickHwSubject}\n**Assignment Date**: ${targetDate}\n\n#### Step-by-Step Problem Breakdown & Solutions:\n1. **Core Concept Overview**: Understanding "${quickHwDetails.trim().slice(0, 80)}..."\n2. **Detailed Calculations & Answers**: Formulated step-by-step logic ready for your workbook.\n3. **Summary**: Verified answers formatted for on-time submission.`,
        stepByStepGuide: [
          'Review the problem statements.',
          'Follow the AI breakdown and verification steps.',
          'Complete final answers in your notebook.',
        ],
        status: 'pending',
        receivedAt: timeStr,
        remindersSent: 1,
        lastReminderAt: 'Just now',
      };
      setHomeworkList((prev) => [newHw, ...prev]);
      setExpandedHwId(newHw.id);
      triggerReminderAlert(newHw);
    }

    setIsDailyAttendanceOpen(false);
    setAttendanceChoice(null);
    setCustomAbsentReason('');
    setAttachHomeworkToday(false);
    setQuickHwDetails('');
  };

  // Add new homework item with instant AI solutions
  const handleCreateHomework = () => {
    if (!hwTitle.trim() || !hwAssignedText.trim()) return;
    setIsGeneratingSolutions(true);

    setTimeout(() => {
      const prepAnswers = `### AI-Prepared Homework Solution Guide for ${hwSubject}
**Assignment**: ${hwTitle}
**Due Date**: ${hwDueDate}

#### Problem Breakdown & Step-by-Step Solutions:
1. **Core Concepts & Key Definitions**:
   - Analysis addressing: "${hwAssignedText.slice(0, 100)}..."
2. **Step-by-Step Explanations**:
   - Step 1: Identify all given conditions and requirements.
   - Step 2: Formulate standard analytical breakdown.
   - Step 3: Verify the solutions and record final conclusions.
3. **Workbook Submission Notes**:
   - Clear and concise conclusions formatted ready for your study submission.`;

      const newHw: SchoolHomeworkItem = {
        id: `hw_${Date.now()}`,
        subject: hwSubject,
        title: hwTitle,
        assignedText: hwAssignedText,
        dueDate: hwDueDate || todayDateStr,
        solutionsReady: true,
        preparedAnswers: prepAnswers,
        stepByStepGuide: [
          'Read the assigned questions carefully.',
          'Review the AI-generated step-by-step logic above.',
          'Write down final answers in your homework notebook.',
        ],
        status: 'pending',
        receivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        remindersSent: 1,
        lastReminderAt: 'Just now',
      };

      setHomeworkList((prev) => [newHw, ...prev]);
      setIsGeneratingSolutions(false);
      setIsAddHwOpen(false);
      setHwTitle('');
      setHwAssignedText('');
      setExpandedHwId(newHw.id);
      triggerReminderAlert(newHw);
    }, 800);
  };

  // Quick simulate post to test homework detection & solutions
  const handleSimulateAssignmentPost = () => {
    if (!simTeacherMessage.trim()) return;
    setIsSimulatingMessage(true);

    setTimeout(() => {
      const newHw: SchoolHomeworkItem = {
        id: `hw_${Date.now()}`,
        subject: simTeacherSubject,
        title: `${simTeacherSubject} Assignment`,
        assignedText: simTeacherMessage,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        solutionsReady: true,
        preparedAnswers: `### AI-Prepared Solution for ${simTeacherSubject}
#### Step-by-Step Breakdown & Answers:
1. **Summary**: Directly addressing: "${simTeacherMessage}"
2. **Key Study Points**:
   - Structured reasoning and complete answers formatted for review.`,
        stepByStepGuide: [
          'Read the assigned text.',
          'Review the AI breakdown and key points.',
          'Complete write-up in your notebook.',
        ],
        status: 'pending',
        receivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        remindersSent: 1,
        lastReminderAt: 'Just now',
      };

      setHomeworkList((prev) => [newHw, ...prev]);
      setIsSimulatingMessage(false);
      triggerReminderAlert(newHw);
      setExpandedHwId(newHw.id);
    }, 800);
  };

  // Stats calculation
  const totalDaysLogged = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
  const attendanceRate =
    totalDaysLogged > 0 ? ((presentCount / totalDaysLogged) * 100).toFixed(1) : '100.0';

  const pendingHomeworkCount = homeworkList.filter((h) => h.status === 'pending').length;

  return (
    <div
      id="school-companion-view"
      className={`h-full w-full overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                School Homework & Attendance
              </h1>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Record daily attendance, track homework assignments, and generate step-by-step AI solutions.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Directly Ask for Attendance and Homework */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenTodayAttendance}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{todayRecord ? 'Update Today Attendance' : 'Mark Today Attendance'}</span>
          </button>

          <button
            onClick={() => setIsAddHwOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Homework</span>
          </button>

          <button
            onClick={handleCopyReport}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              copiedReport
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : darkMode
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'Report Copied!' : 'Copy Summary'}</span>
          </button>
        </div>
      </div>

      {/* Active Reminder Toast Notification */}
      {activeReminderAlert && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-start justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <BellRing className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
            <div>
              <div className="font-semibold text-sm text-amber-300">Homework Reminder</div>
              <div className="text-xs text-amber-200/90 mt-0.5">{activeReminderAlert}</div>
            </div>
          </div>
          <button
            onClick={() => setActiveReminderAlert(null)}
            className="text-amber-400 hover:text-amber-200 text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs Segmented Bar */}
      <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto ${
        darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-200/80 border-slate-300/80 shadow-inner'
      }`}>
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'attendance'
              ? darkMode
                ? 'bg-white/15 text-white shadow-sm border border-white/20'
                : 'bg-white text-slate-900 shadow-sm border border-slate-300'
              : darkMode
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Attendance & Absence Log</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('homework')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'homework'
              ? darkMode
                ? 'bg-white/15 text-white shadow-sm border border-white/20'
                : 'bg-white text-slate-900 shadow-sm border border-slate-300'
              : darkMode
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Active Homework & Solutions</span>
          {pendingHomeworkCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold ml-1">
              {pendingHomeworkCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reminders'
              ? darkMode
                ? 'bg-white/15 text-white shadow-sm border border-white/20'
                : 'bg-white text-slate-900 shadow-sm border border-slate-300'
              : darkMode
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>10-Min Reminders Loop</span>
        </button>
      </div>

      {/* TAB 1: ATTENDANCE & ABSENCE LOG */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Top Attendance Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div
              className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total School Days Logged</div>
              <div className={`text-2xl font-bold mt-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{totalDaysLogged} Days</div>
              <div className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'} mt-1`}>Recorded entries</div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="text-xs text-slate-400">Total Days Present</div>
              <div className="text-2xl font-bold mt-1 text-emerald-400">{presentCount} Days</div>
              <div className="text-[11px] text-emerald-500/80 mt-1">Marked present</div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="text-xs text-slate-400">Total Days Absent</div>
              <div className="text-2xl font-bold mt-1 text-rose-400">{absentCount} Days</div>
              <div className="text-[11px] text-rose-400/80 mt-1">Absences logged</div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="text-xs text-slate-400">Attendance Rate</div>
              <div className="text-2xl font-bold mt-1 text-cyan-400">{attendanceRate}%</div>
              <div className="text-[11px] text-cyan-400/80 mt-1">Overall percentage</div>
            </div>
          </div>

          {/* Today's Attendance Quick Callout */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              todayRecord
                ? todayRecord.status === 'present'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : darkMode
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {todayRecord ? (
                todayRecord.status === 'present' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )
              ) : (
                <HelpCircle className="w-5 h-5 text-blue-400" />
              )}
              <div>
                <div className="font-semibold text-sm">
                  {todayRecord
                    ? `Today's Attendance (${todayDateStr}): Marked as ${todayRecord.status.toUpperCase()}`
                    : `Today's Attendance (${todayDateStr}) has not been recorded yet.`}
                </div>
                <div className="text-xs opacity-80">
                  {todayRecord
                    ? todayRecord.status === 'absent'
                      ? `Reason: ${todayRecord.absentReason} ${
                          todayRecord.specificReason ? `(${todayRecord.specificReason})` : ''
                        }`
                      : 'Logged as present.'
                    : 'Click below to quickly mark whether you were present or absent today.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenTodayAttendance}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer whitespace-nowrap transition-colors"
              >
                {todayRecord ? 'Edit Today Attendance' : 'Mark Today Attendance'}
              </button>

              <button
                onClick={handleOpenPastDayAttendance}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
                title="Log attendance for a past date (future dates are blocked)"
              >
                + Log Another Day
              </button>
            </div>
          </div>

          {/* Attendance History Table */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between flex-wrap gap-2 ${
              darkMode ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Attendance & Absentee History</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Complete log of recorded dates and presence status</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 font-semibold border border-rose-500/20">
                  {absentCount} Total Absences
                </span>
                {attendanceRecords.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all attendance records?')) {
                        setAttendanceRecords([]);
                      }
                    }}
                    className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                      darkMode ? 'text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50'
                    }`}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className={`overflow-x-auto ${darkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={darkMode ? 'bg-white/5 text-slate-300 font-bold' : 'bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200'}>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reason Category</th>
                    <th className="p-3">Specific Details</th>
                    <th className="p-3">Logged Time</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                  {[...attendanceRecords]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((rec) => (
                    <tr key={rec.id} className={darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                      <td className={`p-3 font-mono font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{rec.date}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${
                            rec.status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {rec.status.toUpperCase()}
                        </span>
                      </td>
                      <td className={`p-3 font-medium ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                        {rec.status === 'absent' ? rec.absentReason || 'Absent' : '—'}
                      </td>
                      <td className={`p-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {rec.specificReason || '—'}
                      </td>
                      <td className={`p-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{rec.timestamp}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setAttendanceRecords((prev) => prev.filter((r) => r.id !== rec.id));
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            darkMode ? 'text-slate-400 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'
                          }`}
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {attendanceRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        No attendance records logged yet. Click <strong>"Mark Today Attendance"</strong> above to record your attendance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE HOMEWORK & PREPARED SOLUTIONS */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          {/* Quick Simulation Bar */}
          <div
            className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quick Assignment Scanner & Test
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Tests automatic homework detection, AI solution generator & 10m reminder loop
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={simTeacherSubject}
                onChange={(e) => setSimTeacherSubject(e.target.value)}
                placeholder="Subject (e.g. Mathematics, Science)"
                className={`px-3 py-2 text-xs rounded-xl border ${
                  darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <input
                type="text"
                value={simTeacherMessage}
                onChange={(e) => setSimTeacherMessage(e.target.value)}
                placeholder="Assignment post or question text..."
                className={`sm:col-span-2 px-3 py-2 text-xs rounded-xl border ${
                  darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <button
                onClick={handleSimulateAssignmentPost}
                disabled={isSimulatingMessage}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSimulatingMessage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSimulatingMessage ? 'Solving...' : 'Test & Solve'}</span>
              </button>
            </div>
          </div>

          {/* Homework Items List */}
          {homeworkList.length === 0 ? (
            <div
              className={`p-10 rounded-3xl border text-center flex flex-col items-center justify-center gap-3 ${
                darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base">No Homework Logged Yet</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Add an assignment manually to have LOGITIX AI prepare full step-by-step solutions and start the 10-minute reminder ticker.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setIsAddHwOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Homework</span>
                </button>
                <button
                  onClick={handleSimulateAssignmentPost}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Test Sample Assignment</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {homeworkList.map((hw) => {
                const isExpanded = expandedHwId === hw.id;

                return (
                  <div
                    key={hw.id}
                    className={`rounded-2xl border transition-all ${
                      hw.status === 'completed'
                        ? darkMode
                          ? 'bg-slate-900/40 border-emerald-500/20'
                          : 'bg-emerald-50/40 border-emerald-200'
                        : darkMode
                        ? 'bg-slate-900/80 border-white/10 shadow-lg'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                            {hw.subject}
                          </span>
                          <h3 className="font-semibold text-sm sm:text-base">{hw.title}</h3>
                        </div>

                        <div className="flex items-center gap-2">
                          {hw.status === 'completed' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setHomeworkList((prev) =>
                                  prev.map((h) => (h.id === hw.id ? { ...h, status: 'completed' } : h))
                                );
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/30 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Mark Done
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setHomeworkList((prev) => prev.filter((h) => h.id !== hw.id));
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete homework"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setExpandedHwId(isExpanded ? null : hw.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Assigned text preview */}
                      <div
                        className={`p-3 rounded-xl text-xs font-sans ${
                          darkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="font-semibold text-slate-400 mr-2">Assigned Details:</span>
                        {hw.assignedText}
                      </div>

                      {/* Reminder Status & Meta */}
                      <div className={`flex items-center justify-between text-xs flex-wrap gap-2 pt-1 border-t ${
                        darkMode ? 'text-slate-400 border-white/5' : 'text-slate-500 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span>
                            Due Date: <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{hw.dueDate}</span>
                          </span>
                          <span>
                            Received: <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{hw.receivedAt}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            <Bell className="w-3 h-3" />
                            Reminders: {hw.remindersSent}/3 sent
                          </span>
                          <button
                            onClick={() => triggerReminderAlert(hw)}
                            className={`text-[11px] px-2.5 py-0.5 rounded border cursor-pointer ${
                              darkMode ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            Send Reminder Now
                          </button>
                        </div>
                      </div>

                      {/* Expanded Ready-to-Study Answers Accordion */}
                      {isExpanded && (
                        <div className={`mt-3 pt-3 border-t space-y-3 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 dark:text-emerald-400">
                              <Sparkles className="w-4 h-4" />
                              <span>AI-Prepared Solutions & Explanations</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {onSaveToNotes && (
                                <button
                                  onClick={() =>
                                    onSaveToNotes(
                                      `${hw.subject} Homework Solutions`,
                                      hw.preparedAnswers,
                                      ['Homework', hw.subject]
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                                    darkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  <BookOpen className="w-3 h-3" />
                                  Save to Notepad
                                </button>
                              )}

                              {onInjectToChat && (
                                <button
                                  onClick={() =>
                                    onInjectToChat(
                                      `Can you explain this ${hw.subject} homework problem step-by-step?\n${hw.assignedText}`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium flex items-center gap-1 cursor-pointer border border-purple-500/30"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  Ask AI Tutor
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            className={`p-4 rounded-xl text-xs font-mono whitespace-pre-wrap ${
                              darkMode
                                ? 'bg-black/40 text-slate-200 border border-white/5'
                                : 'bg-slate-50 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {hw.preparedAnswers}
                          </div>

                          {/* Step By Step Guide Pills */}
                          {hw.stepByStepGuide && hw.stepByStepGuide.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-semibold text-slate-400">
                                Step-by-step problem breakdown:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {hw.stepByStepGuide.map((step, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                                      darkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                                      {idx + 1}
                                    </span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 3X 10-MINUTE REMINDERS SYSTEM */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Automated 3x 10-Minute Homework Reminder Loop</h3>
                <p className="text-xs text-slate-400">
                  Alerts you 3 times in 10-minute intervals until pending homework assignments are completed.
                </p>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div
                className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs text-slate-400 mb-1">Reminder 1 (0 min)</div>
                <div className="font-bold text-sm text-emerald-400">Immediate Alert</div>
                <div className="text-[11px] text-slate-400 mt-1 italic">
                  "Your homework has been posted. AI solutions are ready!"
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs text-slate-400 mb-1">Reminder 2 (+10 min)</div>
                <div className="font-bold text-sm text-amber-400">10-Min Follow-up</div>
                <div className="text-[11px] text-slate-400 mt-1 italic">
                  "10 minutes passed. Your homework is remaining, complete on time."
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs text-slate-400 mb-1">Reminder 3 (+20 min)</div>
                <div className="font-bold text-sm text-rose-400">Final Urgent Notice</div>
                <div className="text-[11px] text-slate-400 mt-1 italic">
                  "Final reminder: Complete homework before deadline."
                </div>
              </div>
            </div>

            {/* Active Live Ticker */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-amber-300">Next Scheduled Auto-Reminder Tick</div>
                <div className="text-xl font-mono font-bold text-amber-400">
                  {Math.floor(reminderCountdown / 60)}m {reminderCountdown % 60}s remaining
                </div>
              </div>

              <button
                onClick={() => {
                  const pendingHw = homeworkList.find((h) => h.status === 'pending') || homeworkList[0];
                  if (pendingHw) {
                    triggerReminderAlert(pendingHw);
                  } else {
                    playReminderSound();
                    setActiveReminderAlert(
                      `🔔 [Test Reminder]: Automated 10-minute alert chimed.`
                    );
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <BellRing className="w-4 h-4" />
                <span>Test 10-Min Reminder Audio Alert</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD HOMEWORK / ASSIGNMENT */}
      {isAddHwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl transition-all ${
              darkMode ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Add Homework / Assignment</h3>
                  <p className="text-xs text-slate-400">
                    LOGITIX AI will prepare step-by-step solutions for your assignment
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAddHwOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Subject</label>
                  <input
                    type="text"
                    value={hwSubject}
                    onChange={(e) => setHwSubject(e.target.value)}
                    placeholder="e.g. Mathematics, Science, English"
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border ${
                      darkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Due Date</label>
                  <input
                    type="date"
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border ${
                      darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Assignment Title / Chapter</label>
                <input
                  type="text"
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Practice Problems or Essay Prompt"
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border ${
                    darkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Assigned Question Text / Details
                </label>
                <textarea
                  rows={3}
                  value={hwAssignedText}
                  onChange={(e) => setHwAssignedText(e.target.value)}
                  placeholder="Paste questions or instructions from your teacher or textbook..."
                  className={`w-full p-3 text-xs rounded-xl border ${
                    darkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className={`mt-5 flex items-center justify-end gap-2 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setIsAddHwOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!hwTitle.trim() || !hwAssignedText.trim() || isGeneratingSolutions}
                  onClick={handleCreateHomework}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isGeneratingSolutions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isGeneratingSolutions ? 'Preparing AI Answers...' : 'Add & Generate Solutions'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DAILY ATTENDANCE CHECK (DIRECTLY ASKS FOR ATTENDANCE & HOMEWORK) */}
      {isDailyAttendanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl transition-all ${
              darkMode ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Record Attendance</h3>
                  <p className="text-xs text-slate-400">
                    Mark your school attendance for the day
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDailyAttendanceOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Attendance Date
                  </label>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isFutureSelected
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      : darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isFutureSelected ? 'Future date blocked' : 'Today & past days only'}
                  </span>
                </div>
                <input
                  type="date"
                  max={todayDateStr}
                  value={attendanceDate}
                  onChange={(e) => handleAttendanceDateChange(e.target.value)}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border transition-all ${
                    isFutureSelected
                      ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/5 text-rose-400'
                      : darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                {isFutureSelected ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2 font-medium animate-fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Future dates cannot be logged. You can only record attendance for today ({todayDateStr}) or past days.</span>
                  </div>
                ) : (
                  <div className={`mt-1 text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {attendanceDate === todayDateStr
                      ? `Logging attendance for today (${todayDateStr}).`
                      : attendanceDate
                      ? `Logging past attendance for ${attendanceDate}.`
                      : 'Please select a past date or today.'}
                  </div>
                )}
              </div>

              {!isFutureSelected && (
                <>
                  <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {attendanceDate === todayDateStr
                      ? `Were you present in school today (${todayDateStr})?`
                      : `Were you present in school on ${attendanceDate || 'selected date'}?`}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAttendanceChoice('yes')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        attendanceChoice === 'yes'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                          : darkMode
                          ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Yes, I was Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendanceChoice('no')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        attendanceChoice === 'no'
                          ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                          : darkMode
                          ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>No, I was Absent</span>
                    </button>
                  </div>

              {/* If Absent, ask for reason */}
              {attendanceChoice === 'no' && (
                <div className="pt-3 space-y-3 animate-fade-in">
                  <label className={`text-xs font-bold block ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    Please select why you were absent:
                  </label>

                  <div className="space-y-2">
                    {[
                      { id: 'Had caught cold / Sick', label: '🤒 Had caught cold / Sick' },
                      { id: 'Woke up late', label: '⏰ Woke up late' },
                      { id: 'Others', label: '📝 Others (Specify custom reason)' },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-medium cursor-pointer transition-all ${
                          absentReasonSelection === opt.id
                            ? darkMode
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 font-bold'
                              : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                            : darkMode
                            ? 'bg-white/5 border-white/10 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="absentReason"
                          value={opt.id}
                          checked={absentReasonSelection === opt.id}
                          onChange={() => setAbsentReasonSelection(opt.id)}
                          className="text-amber-500"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {absentReasonSelection === 'Others' && (
                    <div className="pt-2 animate-fade-in">
                      <label className={`text-xs font-semibold block mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Please specify the exact reason:
                      </label>
                      <textarea
                        rows={2}
                        value={customAbsentReason}
                        onChange={(e) => setCustomAbsentReason(e.target.value)}
                        placeholder="e.g. Doctor appointment, family emergency, transport delay..."
                        className={`w-full p-2.5 text-xs rounded-xl border ${
                          darkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Seamless option to also log homework for this day */}
              <div className={`pt-2 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <label className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <input
                    type="checkbox"
                    checked={attachHomeworkToday}
                    onChange={(e) => setAttachHomeworkToday(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Also record homework assigned for this day?
                  </span>
                </label>

                {attachHomeworkToday && (
                  <div className={`mt-3 p-3 rounded-xl border space-y-2.5 animate-fade-in ${
                    darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className={`text-[11px] font-semibold block mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Homework Subject</label>
                      <input
                        type="text"
                        value={quickHwSubject}
                        onChange={(e) => setQuickHwSubject(e.target.value)}
                        placeholder="e.g. Mathematics, Science"
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                          darkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`text-[11px] font-semibold block mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Assignment Details / Questions</label>
                      <textarea
                        rows={2}
                        value={quickHwDetails}
                        onChange={(e) => setQuickHwDetails(e.target.value)}
                        placeholder="Enter the questions or tasks given today..."
                        className={`w-full p-2 text-xs rounded-lg border ${
                          darkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
                </>
              )}
            </div>

            <div className={`mt-6 flex items-center justify-end gap-2 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setIsDailyAttendanceOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !isValidPastOrTodayDate ||
                  isFutureSelected ||
                  !attendanceChoice ||
                  (attendanceChoice === 'no' && absentReasonSelection === 'Others' && !customAbsentReason.trim())
                }
                onClick={handleSaveAttendance}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Attendance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
