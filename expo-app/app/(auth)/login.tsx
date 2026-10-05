import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { email: string; password: string };

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({ defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      const result = await login(email.trim(), password);
      if (result) router.push({ pathname: '/two-factor', params: { challenge: result.challenge } });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email', 'password']));
    }
  });

  return (
    <Screen title="Log in">
      <FormTextField control={control} name="email" label="Email" testID="input-email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <FormTextField control={control} name="password" label="Password" testID="input-password" secureTextEntry autoComplete="password" />
      <FormError message={formError} />
      <Button testID="btn-login" label="Log in" loading={formState.isSubmitting} onPress={onSubmit} />
      <Link href="/forgot-password">
        <AppText variant="muted">Forgot your password?</AppText>
      </Link>
    </Screen>
  );
}
