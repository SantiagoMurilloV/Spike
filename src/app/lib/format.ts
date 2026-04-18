import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * "15 de abril de 2026" — long, human date in Spanish.
 */
export function formatLongDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * "15 abr" — short date, good for dense lists.
 */
export function formatShortDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return format(d, "d MMM", { locale: es });
}

/**
 * "hace 3 horas" — relative time from now.
 */
export function formatRelative(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/**
 * Hours+minutes formatter for match durations, e.g. 95 → "1h 35m".
 */
export function formatDuration(minutes: number | undefined | null): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
