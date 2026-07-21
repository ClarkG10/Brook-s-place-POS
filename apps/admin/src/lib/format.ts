/** Shared, locale-aware formatting helpers for the admin app. */

/** "Jul 22, 3:45 PM" */
export function dateTime(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "Jul 22, 2026" */
export function dateOnly(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "3:45 PM" */
export function timeOnly(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Compact relative time, e.g. "just now", "5m ago", "2h ago", else date. */
export function relativeTime(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return dateOnly(v);
}

/** Quantity with unit, trimming trailing zeros (e.g. "200 ml", "1.5 L"). */
export function qty(value: number, unit?: string | null): string {
  const n = Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
  return unit ? `${n} ${unit}` : n;
}
