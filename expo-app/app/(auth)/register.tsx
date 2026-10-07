import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { RegisterInput } from '@/api/types';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';

export default function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<RegisterInput>({
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      await register({ ...input, name: input.name.trim(), email: input.email.trim() });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'email', 'password', 'password_confirmation']));
    }
  });

  return (
    <Screen title={t('Create an account')}>
      <FormTextField control={control} name="name" label={t('Name')} testID="input-name" autoComplete="name" />
      <FormTextField control={control} name="email" label={t('Email')} testID="input-email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <FormTextField control={control} name="password" label={t('Password')} testID="input-password" secureTextEntry autoComplete="new-password" />
      <FormTextField control={control} name="password_confirmation" label={t('Confirm password')} testID="input-password-confirmation" secureTextEntry autoComplete="new-password" />
      <FormError message={formError} />
      <Button testID="btn-register" label={t('Create account')} loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
