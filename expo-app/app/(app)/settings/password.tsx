import { Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { meApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { current_password: string; password: string; password_confirmation: string };

export default function Password() {
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, reset, formState } = useForm<Form>({
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setStatus(null);
    setFormError(null);
    try {
      await meApi.updatePassword(input);
      reset();
      setStatus('Password updated.');
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['current_password', 'password', 'password_confirmation']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Password' }} />
      <FormTextField control={control} name="current_password" label="Current password" testID="input-current-password" secureTextEntry autoComplete="current-password" />
      <FormTextField control={control} name="password" label="New password" testID="input-new-password" secureTextEntry autoComplete="new-password" />
      <FormTextField control={control} name="password_confirmation" label="Confirm new password" testID="input-new-password-confirmation" secureTextEntry autoComplete="new-password" />
      <FormError message={formError} />
      {status ? <AppText>{status}</AppText> : null}
      <Button testID="btn-save-password" label="Update password" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
