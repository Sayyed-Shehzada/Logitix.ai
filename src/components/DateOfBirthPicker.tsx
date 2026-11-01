import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateOfBirthPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dob: string, calculatedAge?: string) => void;
  className?: string;
  required?: boolean;
  darkMode?: boolean;
}

const MONTHS = [
  { value: '01', name: 'Jan (01)' },
  { value: '02', name: 'Feb (02)' },
  { value: '03', name: 'Mar (03)' },
  { value: '04', name: 'Apr (04)' },
  { value: '05', name: 'May (05)' },
  { value: '06', name: 'Jun (06)' },
  { value: '07', name: 'Jul (07)' },
  { value: '08', name: 'Aug (08)' },
  { value: '09', name: 'Sep (09)' },
  { value: '10', name: 'Oct (10)' },
  { value: '11', name: 'Nov (11)' },
  { value: '12', name: 'Dec (12)' },
];

export const DateOfBirthPicker: React.FC<DateOfBirthPickerProps> = ({
  value,
  onChange,
  className = '',
  required = false,
  darkMode = false,
}) => {
  // Parse initial YYYY-MM-DD
  const parseDob = (val: string) => {
    if (val && val.includes('-')) {
      const parts = val.split('-');
      if (parts.length === 3) {
        return {
          year: parts[0],
          month: parts[1].padStart(2, '0'),
          day: parts[2].padStart(2, '0'),
        };
      }
    }
    return { year: '2000', month: '01', day: '01' };
  };

  const initial = parseDob(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  // Sync internal state when prop value changes
  useEffect(() => {
    const parsed = parseDob(value);
    setYear(parsed.year);
    setMonth(parsed.month);
    setDay(parsed.day);
  }, [value]);

  // Generate Year list from 2026 down to 1920
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 107 }, (_, i) => (currentYear - i).toString());

  // Get max days in currently selected year & month
  const maxDays = new Date(parseInt(year, 10) || 2000, parseInt(month, 10) || 1, 0).getDate();
  const days = Array.from({ length: maxDays }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleUpdate = (newDay: string, newMonth: string, newYear: string) => {
    // Validate day bounds
    const daysInNewMonth = new Date(parseInt(newYear, 10) || 2000, parseInt(newMonth, 10) || 1, 0).getDate();
    let validatedDay = newDay;
    if (parseInt(newDay, 10) > daysInNewMonth) {
      validatedDay = daysInNewMonth.toString().padStart(2, '0');
    }

    setDay(validatedDay);
    setMonth(newMonth);
    setYear(newYear);

    const formattedDob = `${newYear}-${newMonth}-${validatedDay}`;

    // Calculate age
    const birthDate = new Date(formattedDob);
    let age = '';
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      let calcAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calcAge--;
      }
      if (calcAge >= 0) age = calcAge.toString();
    }

    onChange(formattedDob, age);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="grid grid-cols-3 gap-1.5">
        {/* Day Select */}
        <div className="relative">
          <select
            value={day}
            required={required}
            onChange={(e) => handleUpdate(e.target.value, month, year)}
            className={`w-full h-10 px-2 rounded-xl border text-xs focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer transition-all font-mono ${
              darkMode ? 'bg-white/5 border-white/10 text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-900 [color-scheme:light]'
            }`}
          >
            {days.map((d) => (
              <option key={d} value={d} className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                Day {d}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-3 text-[10px] text-slate-400">▼</div>
        </div>

        {/* Month Select */}
        <div className="relative">
          <select
            value={month}
            required={required}
            onChange={(e) => handleUpdate(day, e.target.value, year)}
            className={`w-full h-10 px-2 rounded-xl border text-xs focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer transition-all font-mono ${
              darkMode ? 'bg-white/5 border-white/10 text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-900 [color-scheme:light]'
            }`}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value} className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-3 text-[10px] text-slate-400">▼</div>
        </div>

        {/* Year Select */}
        <div className="relative">
          <select
            value={year}
            required={required}
            onChange={(e) => handleUpdate(day, month, e.target.value)}
            className={`w-full h-10 px-2 rounded-xl border text-xs focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer transition-all font-mono ${
              darkMode ? 'bg-white/5 border-white/10 text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-900 [color-scheme:light]'
            }`}
          >
            {years.map((y) => (
              <option key={y} value={y} className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                {y}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-3 text-[10px] text-slate-400">▼</div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-[10px] font-mono pt-0.5">
        <span className={`flex items-center gap-1 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
          <Calendar className="w-3 h-3 text-purple-500" />
          Selected: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{year}-{month}-{day}</strong>
        </span>
      </div>
    </div>
  );
};
