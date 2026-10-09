import { uk } from '@/i18n/uk';

// Node built-ins, typed by hand: the app itself has no Node types.
const { readdirSync, readFileSync, statSync } = jest.requireActual('fs') as {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: 'utf8'): string;
  statSync(path: string): { isDirectory(): boolean };
};
const { join } = jest.requireActual('path') as { join(...parts: string[]): string };

/**
 * Every English string the app translates must have a Ukrainian line, or a
 * Ukrainian player sees English: English strings are their own keys, so a
 * missing one fails silently at runtime.
 */
function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((name: string) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !path.endsWith(join('i18n', 'uk.ts')) ? [path] : [];
  });
}

// tests/i18n/coverage.test.ts → the app root.
const root = join(expect.getState().testPath ?? '', '..', '..', '..');
const call = /\b(?:t|localMessage)\(\s*(['"])((?:(?!\1)[^\\]|\\.)+)\1/g;

test('every translated string has a Ukrainian line', () => {
  const keys = new Set<string>();
  for (const file of [...sources(join(root, 'app')), ...sources(join(root, 'src'))]) {
    for (const match of readFileSync(file, 'utf8').matchAll(call)) keys.add(match[2].replace(/\\'/g, "'"));
  }

  expect([...keys].filter((key) => !(key in uk))).toEqual([]);
});

test('Ukrainian lines keep every placeholder of their English key', () => {
  const placeholders = (text: string): string[] => [...(text.match(/:[a-zA-Z_]+/g) ?? [])].sort();
  const broken = Object.entries(uk).filter(([english, line]) =>
    placeholders(english).some((name) => !placeholders(line).includes(name)),
  );

  expect(broken).toEqual([]);
});
