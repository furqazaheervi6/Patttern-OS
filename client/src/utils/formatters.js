import { format, parseISO, isToday, isYesterday } from 'date-fns';

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  } catch {
    return dateStr;
  }
}

export function formatFullDate(dateStr) {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(isoStr) {
  if (!isoStr) return 'Never';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return isoStr;
  }
}

export function formatEventTime(event) {
  if (!event?.start) return '';
  const dt = event.start.dateTime || event.start.date;
  if (!dt) return '';
  try {
    if (event.start.date) return format(parseISO(dt), 'MMM d');
    return format(new Date(dt), 'EEE MMM d, h:mm a');
  } catch {
    return dt;
  }
}

/** Return today's date as YYYY-MM-DD in the user's local timezone. */
export function localDateStr(d) {
  const date = d || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function pillarName(key) {
  const names = {
    physical: 'Physical', mental: 'Mental', financial: 'Financial', spiritual: 'Spiritual',
    social: 'Social', purpose: 'Purpose', awareness: 'Awareness',
  };
  return names[key] || key;
}

export function pillarIcon(key) {
  const icons = {
    physical: '🏋️', mental: '🧠', financial: '💰', spiritual: '🕊️',
    social: '🤝', purpose: '🧭', awareness: '👁️',
  };
  return icons[key] || '◎';
}

export function pillarColor(key) {
  const colors = {
    physical: '#22C55E',
    mental: '#60A5FA',
    financial: '#FBBF24',
    spiritual: '#C084FC',
    social: '#F472B6',
    purpose: '#F97316',
    awareness: '#14B8A6',
  };
  return colors[key] || '#64748B';
}
