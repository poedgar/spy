import type { AgeTier, GameMode, GameStatus, Player } from '@/api/types';

type T = (key: string, replace?: Record<string, string | number>) => string;

export const modeLabels = (t: T): Record<GameMode, string> => ({
  mole: t('The Mole'),
  codebreaker: t('Codebreaker'),
  counterintel: t('Counter-Intel'),
});

export const tierLabels = (t: T): Record<AgeTier, { label: string; description: string }> => ({
  children: { label: t('Children (5+)'), description: t('Simple, everyday places') },
  teens: { label: t('Teens'), description: t('Moderately complex places') },
  adults: { label: t('Adults'), description: t('Most complex and obscure places') },
});

export const statusLabels = (t: T): Record<GameStatus, string> => ({
  recruiting: t('Recruiting'),
  active: t('Round in progress'),
  voting: t('Voting'),
  completed: t('Round over'),
});

/** Mirrors Game::spyCountFor on the server. */
export function spyCountFor(players: number): number {
  if (players < 5) return 1;
  return players < 8 ? 2 : 1 + Math.floor((players - 2) / 3);
}

/** Codenames come from a small pool and can repeat, so the name tells operatives apart. */
export function operativeName(players: Player[] | undefined, userId: number | null, fallback: string): string {
  const user = players?.find((player) => player.user.id === userId)?.user;
  return user ? `${user.codename} (${user.name})` : fallback;
}
