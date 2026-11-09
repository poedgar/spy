import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateSongGame } from '@/api/queries';
import type { CreateSongGameInput } from '@/api/types';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useGameNameSuggestion } from '@/game/useGameNameSuggestion';
import { PlayerLimitsField } from '@/game/PlayerLimitsField';
import { playerLimits } from '@/game/playerLimits';
import { useI18n } from '@/i18n/I18nProvider';

export default function CreateSongGame() {
  const router = useRouter();
  const { t } = useI18n();
  const createGame = useCreateSongGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, getValues, setValue } = useForm<CreateSongGameInput>({
    defaultValues: { title: '', min_players: playerLimits('song').min, max_players: playerLimits('song').defaultMax },
  });

  const name = useGameNameSuggestion('song', () => getValues('title'), (title) => setValue('title', title));

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const game = await createGame.mutateAsync({ ...input, title: input.title.trim() });
      router.replace(`/games/${game.code}`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['title', 'min_players', 'max_players']));
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

      <PlayerLimitsField control={control} type='song' />

      <FormError message={formError} />
      <Button testID="btn-create-song" label={t('Create')} loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
