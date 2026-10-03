import { Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { meApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { password: string };

export default function DeleteAccount() {
  const { signOutLocally } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({ defaultValues: { password: '' } });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await meApi.destroy(password);
      await signOutLocally();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['password']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Delete account' }} />
      <AppText variant="heading">Delete your account</AppText>
      <AppText variant="muted">
        This permanently deletes your account, your operations roster places and your invitations, on the web and on
        every device. It cannot be undone.
      </AppText>
      <FormTextField control={control} name="password" label="Confirm with your password" testID="input-delete-password" secureTextEntry />
      <FormError message={formError} />
      <Button testID="btn-delete-account" label="Delete account permanently" variant="destructive" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
