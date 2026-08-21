const DAY = 86_400_000;

/** Gmail-style timestamps: minutes today, then a date. */
export function formatRelative(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = now - then;

  if (diff < 0) {
    const ahead = -diff;
    if (ahead < 3_600_000) return `in ${Math.max(1, Math.round(ahead / 60_000))}m`;
    if (ahead < DAY) return `in ${Math.round(ahead / 3_600_000)}h`;
    return `in ${Math.round(ahead / DAY)}d`;
  }
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;

  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export function formatPercent(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

export function formatLimit(value: number | 'unlimited'): string {
  return value === 'unlimited' ? 'Unlimited' : formatNumber(value);
}
