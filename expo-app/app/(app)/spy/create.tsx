import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useCreateGame } from '@/api/queries';
import type { CreateGameInput, GameMode } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useTheme } from '@/theme/useTheme';

const MODES: { value: GameMode; label: string }[] = [
  { value: 'mole', label: 'Mole' },
  { value: 'codebreaker', label: 'Codebreaker' },
  { value: 'counterintel', label: 'Counterintel' },
];
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;

export default function CreateGame() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const createGame = useCreateGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<CreateGameInput>({
    defaultValues: { title: '', game_mode: 'mole', max_players: 6, mission_briefing: '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const game = await createGame.mutateAsync({ ...input, title: input.title.trim(), mission_briefing: input.mission_briefing.trim() });
      router.replace(`/games/${game.code}`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['title', 'game_mode', 'max_players', 'mission_briefing']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Create Operation' }} />
      <FormTextField control={control} name="title" label="Operation title" placeholder="Operation title" testID="input-game-title" />

      <Controller
        control={control}
        name="game_mode"
        render={({ field: { value, onChange } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">Mode</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {MODES.map((mode) => (
                <Pressable
                  key={mode.value}
                  testID={`mode-${mode.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === mode.value }}
                  onPress={() => onChange(mode.value)}
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: value === mode.value ? colors.primary : colors.border,
                    alignItems: 'center',
                  }}
                >
                  <AppText>{mode.label}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="max_players"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">Max operatives</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Button testID="btn-players-minus" label="−" variant="secondary" onPress={() => onChange(Math.max(MIN_PLAYERS, value - 1))} />
              <AppText testID="players-count" variant="heading">{String(value)}</AppText>
              <Button testID="btn-players-plus" label="+" variant="secondary" onPress={() => onChange(Math.min(MAX_PLAYERS, value + 1))} />
            </View>
            {error ? <AppText style={{ color: colors.destructive }}>{error.message}</AppText> : null}
          </View>
        )}
      />

      <FormTextField
        control={control}
        name="mission_briefing"
        label="Mission briefing"
        testID="input-mission-briefing"
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, textAlignVertical: 'top' }}
      />
      <FormError message={formError} />
      <Button testID="btn-create-game" label="Create Operation" loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
