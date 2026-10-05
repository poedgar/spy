import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { code: string };

export default function TwoFactor() {
  const { challenge } = useLocalSearchParams<{ challenge: string }>();
  const { completeTwoFactor } = useAuth();
  const [useRecovery, setUseRecovery] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, reset, formState } = useForm<Form>({ defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    setFormError(null);
    try {
      await completeTwoFactor(challenge, useRecovery ? { recovery_code: code.trim() } : { code: code.trim() });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['code']));
    }
  });

  return (
    <Screen title="Two-factor authentication">
      <AppText variant="muted">
        {useRecovery ? 'Enter one of your emergency recovery codes.' : 'Enter the code from your authenticator app.'}
      </AppText>
      <FormTextField
        control={control}
        name="code"
        label={useRecovery ? 'Recovery code' : 'Code'}
        testID="input-2fa-code"
        autoCapitalize="none"
        keyboardType={useRecovery ? 'default' : 'number-pad'}
        autoComplete="one-time-code"
      />
      <FormError message={formError} />
      <Button testID="btn-2fa-submit" label="Continue" loading={formState.isSubmitting} onPress={onSubmit} />
      <Pressable
        onPress={() => {
          setUseRecovery(!useRecovery);
          reset({ code: '' });
        }}
      >
        <AppText variant="muted">{useRecovery ? 'Use an authentication code' : 'Use a recovery code'}</AppText>
      </Pressable>
    </Screen>
  );
}
