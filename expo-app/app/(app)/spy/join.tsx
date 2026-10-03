import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/api/errors';
import { useJoinGame } from '@/api/queries';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { isInviteCode, normalizeInviteCode } from '@/linking';

type Form = { code: string };

export default function JoinGame() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const joinGame = useJoinGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<Form>({ defaultValues: { code: params.code ?? '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    setFormError(null);
    const normalized = normalizeInviteCode(code);
    if (!isInviteCode(normalized)) {
      setError('code', { type: 'format', message: 'Invite codes look like SPY-AB3D.' });
      return;
    }
    try {
      const game = await joinGame.mutateAsync(normalized);
      router.replace(`/games/${game.code}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setError('code', { type: 'server', message: 'No operation found with that invite code.' });
        return;
      }
      setFormError(applyServerErrors(error, setError, ['code']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Join Operation' }} />
      {params.code ? <AppText variant="heading">Join operation {params.code}?</AppText> : null}
      <FormTextField
        control={control}
        name="code"
        label="Invite code"
        placeholder="SPY-XXXX"
        testID="input-join-code"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <FormError message={formError} />
      <Button testID="btn-join-game" label="Join Operation" loading={joinGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
