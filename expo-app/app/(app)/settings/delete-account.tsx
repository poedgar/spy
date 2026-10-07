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
import { useI18n } from '@/i18n/I18nProvider';

type Form = { password: string };

export default function DeleteAccount() {
  const { t } = useI18n();
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
      <Stack.Screen options={{ title: t('Delete account') }} />
      <AppText variant="heading">{t('Delete your account')}</AppText>
      <AppText variant="muted">
        {t(
          'This permanently deletes your account, your operations roster places and your invitations, on the web and on every device. It cannot be undone.',
        )}
      </AppText>
      <FormTextField control={control} name="password" label={t('Confirm with your password')} testID="input-delete-password" secureTextEntry />
      <FormError message={formError} />
      <Button testID="btn-delete-account" label={t('Delete account permanently')} variant="destructive" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
