import { Link, Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function GamePicker() {
  const router = useRouter();

  return (
    <Screen title="Choose a Game">
      <Stack.Screen
        options={{
          title: 'Games',
          headerRight: () => (
            <Link href="/settings" testID="btn-settings">
              <AppText>Settings</AppText>
            </Link>
          ),
        }}
      />
      <Pressable testID="tile-spy" accessibilityRole="button" onPress={() => router.push('/spy')}>
        <Card>
          <AppText variant="heading">Spy</AppText>
          <AppText variant="muted">A social-deduction party game. Find the mole before time runs out.</AppText>
        </Card>
      </Pressable>
      {[0, 1].map((i) => (
        <Card key={i} testID={`tile-coming-soon-${i}`} style={{ opacity: 0.5, borderStyle: 'dashed' }}>
          <AppText variant="heading">Coming Soon</AppText>
        </Card>
      ))}
    </Screen>
  );
}
