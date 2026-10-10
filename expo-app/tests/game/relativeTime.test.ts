import { relativeTime } from '@/game/relativeTime';

const now = Date.parse('2026-10-10T12:00:00Z');
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString();

// Like Hermes on a phone, which has no Intl.RelativeTimeFormat: calling it
// there crashed the notifications screen.
const original = Intl.RelativeTimeFormat;
beforeAll(() => {
  (Intl as { RelativeTimeFormat?: unknown }).RelativeTimeFormat = undefined;
});
afterAll(() => {
  (Intl as { RelativeTimeFormat?: unknown }).RelativeTimeFormat = original;
});

test('english', () => {
  expect(relativeTime(ago(0), 'en', now)).toBe('just now');
  expect(relativeTime(ago(1), 'en', now)).toBe('1 minute ago');
  expect(relativeTime(ago(5), 'en', now)).toBe('5 minutes ago');
  expect(relativeTime(ago(60), 'en', now)).toBe('1 hour ago');
  expect(relativeTime(ago(180), 'en', now)).toBe('3 hours ago');
  expect(relativeTime(ago(1440), 'en', now)).toBe('yesterday');
  expect(relativeTime(ago(3 * 1440), 'en', now)).toBe('3 days ago');
  expect(relativeTime(null, 'en', now)).toBe('');
});

test('ukrainian, with its three plural forms', () => {
  expect(relativeTime(ago(0), 'uk', now)).toBe('щойно');
  expect(relativeTime(ago(1), 'uk', now)).toBe('1 хвилину тому');
  expect(relativeTime(ago(3), 'uk', now)).toBe('3 хвилини тому');
  expect(relativeTime(ago(5), 'uk', now)).toBe('5 хвилин тому');
  expect(relativeTime(ago(11), 'uk', now)).toBe('11 хвилин тому');
  expect(relativeTime(ago(21), 'uk', now)).toBe('21 хвилину тому');
  expect(relativeTime(ago(22 * 60), 'uk', now)).toBe('22 години тому');
  expect(relativeTime(ago(1440), 'uk', now)).toBe('вчора');
  expect(relativeTime(ago(5 * 1440), 'uk', now)).toBe('5 днів тому');
});
