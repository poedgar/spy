import { Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { meApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth, useSignedInUser } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';

type Form = { name: string; email: string };

export default function Profile() {
  const { t } = useI18n();
  const user = useSignedInUser();
  const { setUser } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({
    defaultValues: { name: user.name, email: user.email ?? '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setStatus(null);
    setFormError(null);
    try {
      setUser(await meApi.update({ name: input.name.trim(), email: input.email.trim() }));
      setStatus(t('Profile updated.'));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'email']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Profile') }} />
      <FormTextField control={control} name="name" label={t('Name')} testID="input-profile-name" />
      <FormTextField control={control} name="email" label={t('Email')} testID="input-profile-email" autoCapitalize="none" keyboardType="email-address" />
      <FormError message={formError} />
      {status ? <AppText>{status}</AppText> : null}
      <Button testID="btn-save-profile" label={t('Save')} loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
