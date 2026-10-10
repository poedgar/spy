// Hermes (the app's JavaScript engine) has no Intl.RelativeTimeFormat, so
// the wording is spelled out here for the app's two languages.

type Unit = 'minute' | 'hour' | 'day';

const ENGLISH: Record<Unit, [string, string]> = {
  minute: ['minute', 'minutes'],
  hour: ['hour', 'hours'],
  day: ['day', 'days'],
};

const UKRAINIAN: Record<Unit, [string, string, string]> = {
  minute: ['хвилину', 'хвилини', 'хвилин'],
  hour: ['годину', 'години', 'годин'],
  day: ['день', 'дні', 'днів'],
};

/** Ukrainian plural form: 1 хвилину, 2–4 хвилини, 5+ (and 11–14) хвилин. */
function ukrainianForm(count: number): 0 | 1 | 2 {
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit === 1 && lastTwo !== 11) return 0;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return 1;
  return 2;
}

/** "5 minutes ago" / "2 години тому", relative to `now`. */
export function relativeTime(iso: string | null, locale: string, now: number): string {
  if (!iso) return '';
  const ukrainian = locale.startsWith('uk');
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

  if (minutes < 1) return ukrainian ? 'щойно' : 'just now';

  const [count, unit]: [number, Unit] =
    minutes < 60 ? [minutes, 'minute'] : minutes < 1440 ? [Math.round(minutes / 60), 'hour'] : [Math.round(minutes / 1440), 'day'];

  if (unit === 'day' && count === 1) return ukrainian ? 'вчора' : 'yesterday';

  return ukrainian
    ? `${count} ${UKRAINIAN[unit][ukrainianForm(count)]} тому`
    : `${count} ${ENGLISH[unit][count === 1 ? 0 : 1]} ago`;
}
