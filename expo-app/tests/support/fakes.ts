import type { Game, User } from '@/api/types';

export const fakeUser: User = { id: 1, name: 'Ada', codename: 'SHADOW_FOX', email: 'ada@example.com' };
export const otherUser: User = { id: 2, name: 'Bob', codename: 'NIGHT_HAWK' };

export function fakeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 10,
    code: 'SPY-AB3D',
    title: 'Operation Nightfall',
    game_type: 'spy',
    game_mode: 'mole',
    max_players: 6,
    mission_briefing: 'Find the mole.',
    status: 'recruiting',
    host_id: fakeUser.id,
    player_count: 1,
    created_at: null,
    host: fakeUser,
    players: [{ id: 100, user: fakeUser, is_host: true, status: 'ready', joined_at: null }],
    ...overrides,
  };
}
