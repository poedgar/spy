import { Redirect, useLocalSearchParams } from 'expo-router';
import { isInviteCode, normalizeInviteCode } from '@/linking';

/** Target of marvelousgames://join/{code}: never joins directly, only pre-fills the join screen. */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const normalized = normalizeInviteCode(code ?? '');

  if (!isInviteCode(normalized)) return <Redirect href="/spy/join" />;

  return <Redirect href={{ pathname: '/spy/join', params: { code: normalized } }} />;
}
