import type { Locale } from '@/api/types';
import { uk } from './uk';

export type Replacements = Record<string, string | number>;

/** English strings are their own keys; `:name` placeholders are replaced. */
export function translate(locale: Locale, key: string, replace: Replacements = {}): string {
  let line = locale === 'uk' ? (uk[key] ?? key) : key;
  for (const [name, value] of Object.entries(replace)) line = line.split(`:${name}`).join(String(value));
  return line;
}
