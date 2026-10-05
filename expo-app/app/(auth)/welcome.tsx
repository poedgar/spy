import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ gap: 8, marginTop: 96 }}>
        <AppText variant="title">SpyNet</AppText>
        <AppText variant="muted">Social-deduction party games. Find the mole before time runs out.</AppText>
      </View>
      <Button testID="btn-welcome-login" label="Log in" onPress={() => router.push('/login')} />
      <Button testID="btn-welcome-register" label="Create an account" variant="secondary" onPress={() => router.push('/register')} />
    </Screen>
  );
}
