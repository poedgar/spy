import { invitationHrefFrom, isInviteCode, normalizeInviteCode, roundHrefFrom } from '@/linking';

test('normalizes typed codes', () => {
  expect(normalizeInviteCode('  spy-ab3d ')).toBe('SPY-AB3D');
});

test('validates the server code charset', () => {
  expect(isInviteCode('SPY-AB3D')).toBe(true);
  expect(isInviteCode('SPY-AB1D')).toBe(false); // 1 is excluded
  expect(isInviteCode('SPY-ABCDE')).toBe(false);
  expect(isInviteCode('spy-ab3d')).toBe(false);
});

test('maps an invitation push payload to the spy home with a highlight', () => {
  expect(invitationHrefFrom({ type: 'invitation', invitation_id: 7, code: 'SPY-AB3D' })).toEqual({
    pathname: '/spy',
    params: { highlight: '7' },
  });
  expect(invitationHrefFrom({ type: 'invitation', invitation_id: 8, game_type: 'phrase' })).toEqual({
    pathname: '/phrase',
    params: { highlight: '8' },
  });
  expect(invitationHrefFrom({ type: 'other' })).toBeNull();
  expect(invitationHrefFrom(undefined)).toBeNull();
});

test('maps a round-start push payload to that game\'s lobby', () => {
  expect(roundHrefFrom({ type: 'round', code: 'SPY-AB3D' })).toBe('/games/SPY-AB3D');
  expect(roundHrefFrom({ type: 'round', code: 'not a code' })).toBeNull();
  expect(roundHrefFrom({ type: 'invitation', invitation_id: 7 })).toBeNull();
});
