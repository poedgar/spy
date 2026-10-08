/** "5 minutes ago" / "2 години тому", relative to `now`. */
export function relativeTime(iso: string | null, locale: string, now: number): string {
  if (!iso) return '';
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 60) return format.format(-minutes, 'minute');
  return minutes < 1440 ? format.format(-Math.round(minutes / 60), 'hour') : format.format(-Math.round(minutes / 1440), 'day');
}
