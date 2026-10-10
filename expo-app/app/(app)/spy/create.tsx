import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useCreateGame } from '@/api/queries';
import type { AgeTier, CreateGameInput, GameMode } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { modeLabels, spyCountFor, tierLabels } from '@/game/labels';
import { RoundTimerPicker } from '@/game/RoundTimerPicker';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

const MODES: GameMode[] = ['mole', 'codebreaker', 'counterintel'];
const TIERS: AgeTier[] = ['children', 'teens', 'adults'];
// Tables start at the minimum; the host raises it for bigger groups.
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;

export default function CreateGame() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const createGame = useCreateGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, getValues, setValue } = useForm<CreateGameInput>({
    defaultValues: {
      title: '',
      game_mode: 'mole',
      age_tier: 'adults',
      max_players: MIN_PLAYERS,
      mission_briefing: '',
      round_seconds: 0,
    },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const game = await createGame.mutateAsync({ ...input, title: input.title.trim(), mission_briefing: input.mission_briefing.trim() });
      router.replace(`/games/${game.code}`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['title', 'game_mode', 'age_tier', 'max_players', 'mission_briefing', 'round_seconds']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Create Operation') }} />
      <FormTextField
        control={control}
        name="title"
        label={t('Operation title')}
        placeholder={t('Operation title')}
        testID="input-game-title"
      />

      <Controller
        control={control}
        name="game_mode"
        render={({ field: { value, onChange } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">{t('Game mode')}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {MODES.map((mode) => (
                <Pressable
                  key={mode}
                  testID={`mode-${mode}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === mode }}
                  onPress={() => {
                    onChange(mode);
                    // Codebreaker is the race-the-clock mode: suggest a timer.
                    if (mode === 'codebreaker' && !getValues('round_seconds')) setValue('round_seconds', 480);
                  }}
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: value === mode ? colors.primary : colors.border,
                    alignItems: 'center',
                  }}
                >
                  <AppText>{modeLabels(t)[mode]}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="age_tier"
        render={({ field: { value, onChange } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">{t('Player age group')}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {TIERS.map((tier) => (
                <Pressable
                  key={tier}
                  testID={`tier-${tier}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === tier }}
                  onPress={() => onChange(tier)}
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: value === tier ? colors.primary : colors.border,
                    alignItems: 'center',
                  }}
                >
                  <AppText>{tierLabels(t)[tier].label}</AppText>
                  <AppText variant="muted" style={{ textAlign: 'center' }}>
                    {tierLabels(t)[tier].description}
                  </AppText>
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
            <AppText variant="muted">
              {t('Operatives')} ·{' '}
              {spyCountFor(value) === 1
                ? t('1 spy when full')
                : t(':count spies when full', { count: spyCountFor(value) })}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Button testID="btn-players-minus" label="−" variant="secondary" onPress={() => onChange(Math.max(MIN_PLAYERS, value - 1))} />
              <AppText testID="players-count" variant="heading">{String(value)}</AppText>
              <Button testID="btn-players-plus" label="+" variant="secondary" onPress={() => onChange(Math.min(MAX_PLAYERS, value + 1))} />
            </View>
            {error ? <AppText style={{ color: colors.destructive }}>{error.message}</AppText> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="round_seconds"
        render={({ field: { value, onChange } }) => <RoundTimerPicker value={value ?? 0} onChange={onChange} />}
      />

      <FormTextField
        control={control}
        name="mission_briefing"
        label={t('Mission briefing (optional)')}
        placeholder={t('A rogue operative has intercepted intelligence files.')}
        testID="input-mission-briefing"
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, textAlignVertical: 'top' }}
      />
      <FormError message={formError} />
      <Button testID="btn-create-game" label={t('Create Operation')} loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
