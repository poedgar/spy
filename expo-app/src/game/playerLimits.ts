import type { GameType } from '@/api/types';

/**
 * Mirrors GameType::minPlayers / maxPlayers / defaultMaxPlayers on the
 * server: the range a host can pick a game's minimum and maximum from.
 * Phrase is capped by the longest phrases (every player holds a word).
 */
export function playerLimits(type: GameType): { min: number; max: number; defaultMax: number } {
  const max = type === 'phrase' ? 12 : 20;

  return { min: 3, max, defaultMax: Math.min(12, max) };
}
