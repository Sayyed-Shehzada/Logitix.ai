/**
 * Format any Date or timestamp string into strict 12-hour system (e.g. "10:45 AM", "2:15 PM")
 */
export function format12HourTime(timeInput?: Date | string | number): string {
  if (!timeInput) {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (timeInput instanceof Date) {
    return timeInput.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (typeof timeInput === 'number') {
    return new Date(timeInput).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const str = String(timeInput).trim();

  // If it's already 12h format with AM/PM, return as is
  if (/am|pm/i.test(str)) {
    return str;
  }

  // Check if string matches 24-hour time "HH:MM" or "HH:MM:SS"
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour is 12 AM
    return `${hours}:${minutes} ${ampm}`;
  }

  // If string contains a full date string or date time, try parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return str;
}
