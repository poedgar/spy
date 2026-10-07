export const INVITE_CODE_PATTERN = /^SPY-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isInviteCode(value: string): boolean {
  return INVITE_CODE_PATTERN.test(value);
}

/** The game's home screen, where its pending invitations are listed. */
export function homePathFor(gameType: unknown): '/spy' | '/phrase' {
  return gameType === 'phrase' ? '/phrase' : '/spy';
}

export function invitationHrefFrom(
  data: unknown,
): { pathname: '/spy' | '/phrase'; params: { highlight: string } } | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, invitation_id: invitationId, game_type: gameType } = data as {
    type?: unknown;
    invitation_id?: unknown;
    game_type?: unknown;
  };
  if (type !== 'invitation' || typeof invitationId !== 'number') return null;
  return { pathname: homePathFor(gameType), params: { highlight: String(invitationId) } };
}

/** A round-start push opens that game's lobby, where the role is waiting. */
export function roundHrefFrom(data: unknown): `/games/${string}` | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, code } = data as { type?: unknown; code?: unknown };
  if (type !== 'round' || typeof code !== 'string' || !isInviteCode(code)) return null;
  return `/games/${code}`;
}
