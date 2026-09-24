/** Formatting for dates, sizes and numbers, following the device locale. */

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** List timestamps: "14:05" today, "Yesterday", weekday this week, else a date. */
export function listDate(ts: number, now = Date.now()): string {
  const today = startOfDay(now);
  if (ts >= today) return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (ts >= today - DAY) return 'Yesterday';
  if (ts >= today - 6 * DAY) return new Date(ts).toLocaleDateString(undefined, { weekday: 'short' });
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Full timestamp for the reader: "Tue, 3 Mar 2026, 14:05". */
export function fullDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "5m ago", "3h ago", "2d ago". */
export function timeAgo(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(ts);
}

/** "in 2h", "in 3 days" for scheduled sends. */
export function timeUntil(ts: number, now = Date.now()): string {
  const diff = ts - now;
  if (diff <= 0) return 'now';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)} days`;
}

export function bytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const value = n / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function count(n: number): string {
  return n.toLocaleString();
}

/** Compact counts for tight spaces: 1.2k, 34k, 1.1M. */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function percent(part: number, total: number): string {
  if (!total) return '0%';
  const value = (part / total) * 100;
  return `${value >= 10 || value === 0 ? Math.round(value) : value.toFixed(1)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}
