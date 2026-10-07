export const INVITE_CODE_PATTERN = /^SPY-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isInviteCode(value: string): boolean {
  return INVITE_CODE_PATTERN.test(value);
}

export function invitationHrefFrom(data: unknown): { pathname: '/spy'; params: { highlight: string } } | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, invitation_id: invitationId } = data as { type?: unknown; invitation_id?: unknown };
  if (type !== 'invitation' || typeof invitationId !== 'number') return null;
  return { pathname: '/spy', params: { highlight: String(invitationId) } };
}

/** A round-start push opens that game's lobby, where the role is waiting. */
export function roundHrefFrom(data: unknown): `/games/${string}` | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, code } = data as { type?: unknown; code?: unknown };
  if (type !== 'round' || typeof code !== 'string' || !isInviteCode(code)) return null;
  return `/games/${code}`;
}
