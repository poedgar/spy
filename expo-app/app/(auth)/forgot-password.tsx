import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';

type Form = { email: string };

export default function ForgotPassword() {
  const { t } = useI18n();
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({ defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      setSent((await authApi.forgotPassword(email.trim())).message);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email']));
    }
  });

  return (
    <Screen title={t('Reset your password')}>
      <AppText variant="muted">
        {t("We'll email you a link. You'll finish resetting your password in your browser.")}
      </AppText>
      <FormTextField control={control} name="email" label={t('Email')} autoCapitalize="none" keyboardType="email-address" />
      <FormError message={formError} />
      {sent ? <AppText>{sent}</AppText> : null}
      <Button label={t('Send reset link')} loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
