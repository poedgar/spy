import { useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Screen>
      <AppText>{code}</AppText>
    </Screen>
  );
}
