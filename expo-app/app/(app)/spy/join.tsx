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
import { useI18n } from '@/i18n/I18nProvider';

type Form = { code: string };

export default function JoinGame() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const joinGame = useJoinGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<Form>({ defaultValues: { code: params.code ?? '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    setFormError(null);
    const normalized = normalizeInviteCode(code);
    if (!isInviteCode(normalized)) {
      setError('code', { type: 'format', message: t('Invite codes look like SPY-AB3D.') });
      return;
    }
    try {
      const game = await joinGame.mutateAsync(normalized);
      router.replace(`/games/${game.code}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setError('code', { type: 'server', message: t('No operation found with that invite code.') });
        return;
      }
      setFormError(applyServerErrors(error, setError, ['code']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Join Operation') }} />
      {params.code ? <AppText variant="heading">{t('Join operation :code?', { code: params.code })}</AppText> : null}
      <FormTextField
        control={control}
        name="code"
        label={t('Invite code')}
        placeholder="SPY-XXXX"
        testID="input-join-code"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <FormError message={formError} />
      <Button testID="btn-join-game" label={t('Join Operation')} loading={joinGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
