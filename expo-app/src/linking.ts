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
