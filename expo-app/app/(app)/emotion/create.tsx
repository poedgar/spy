import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useCreateEmotionGame } from '@/api/queries';
import type { CreateEmotionGameInput } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useGameNameSuggestion } from '@/game/useGameNameSuggestion';
import { emotionLevelLabels } from '@/emotion/labels';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

// Tables start at the minimum; the host raises it for bigger groups.
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

export default function CreateEmotionGame() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const levels = emotionLevelLabels(t);
  const createGame = useCreateEmotionGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, getValues, setValue } = useForm<CreateEmotionGameInput>({
    defaultValues: { title: '', emotion_level: 1, max_players: MIN_PLAYERS },
  });

  const name = useGameNameSuggestion('emotion', () => getValues('title'), (title) => setValue('title', title));

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const game = await createGame.mutateAsync({ ...input, title: input.title.trim() });
      router.replace(`/games/${game.code}`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['title', 'emotion_level', 'max_players']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('New Name the Emotion game') }} />
      <FormTextField control={control} name="title" label={t('Game title')} testID="input-emotion-title" />
      <Button
        testID="btn-roll-name"
        label={`🎲 ${t('Suggest another name')}`}
        variant="secondary"
        loading={name.rolling}
        onPress={name.roll}
      />

      <Controller
        control={control}
        name="emotion_level"
        render={({ field: { value, onChange } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">{t('Difficulty')}</AppText>
            {([1, 2, 3] as const).map((level) => (
              <Pressable
                key={level}
                testID={`emotion-level-${level}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: value === level }}
                onPress={() => onChange(level)}
                style={{
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  borderWidth: value === level ? 2 : 1,
                  borderColor: value === level ? colors.primary : colors.border,
                }}
              >
                <AppText>{levels[level].label}</AppText>
                <AppText variant="muted">{levels[level].description}</AppText>
              </Pressable>
            ))}
          </View>
        )}
      />

      <Controller
        control={control}
        name="max_players"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">{t('Players')}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Button
                testID="btn-players-minus"
                label="−"
                variant="secondary"
                onPress={() => onChange(Math.max(MIN_PLAYERS, value - 1))}
              />
              <AppText testID="players-count" variant="heading">
                {String(value)}
              </AppText>
              <Button
                testID="btn-players-plus"
                label="+"
                variant="secondary"
                onPress={() => onChange(Math.min(MAX_PLAYERS, value + 1))}
              />
            </View>
            {error ? <AppText style={{ color: colors.destructive }}>{error.message}</AppText> : null}
          </View>
        )}
      />

      <FormError message={formError} />
      <Button testID="btn-create-emotion" label={t('Create')} loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
