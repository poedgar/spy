import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { useCreateSongGame } from '@/api/queries';
import type { CreateSongGameInput } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useGameNameSuggestion } from '@/game/useGameNameSuggestion';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

// Tables start at the minimum; the host raises it for bigger groups.
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

export default function CreateSongGame() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const createGame = useCreateSongGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, getValues, setValue } = useForm<CreateSongGameInput>({
    defaultValues: { title: '', max_players: MIN_PLAYERS },
  });

  const name = useGameNameSuggestion('song', () => getValues('title'), (title) => setValue('title', title));

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const game = await createGame.mutateAsync({ ...input, title: input.title.trim() });
      router.replace(`/games/${game.code}`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['title', 'max_players']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('New Sing It Out game') }} />
      <FormTextField control={control} name="title" label={t('Game title')} testID="input-song-title" />
      <Button
        testID="btn-roll-name"
        label={`🎲 ${t('Suggest another name')}`}
        variant="secondary"
        loading={name.rolling}
        onPress={name.roll}
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
      <Button testID="btn-create-song" label={t('Create')} loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
