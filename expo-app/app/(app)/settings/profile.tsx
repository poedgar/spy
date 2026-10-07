import { Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Switch, View } from 'react-native';
import { meApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth, useSignedInUser } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

type Form = { name: string; email: string; codename: string; email_notifications: boolean };

export default function Profile() {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const user = useSignedInUser();
  const { setUser } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({
    defaultValues: {
      name: user.name,
      email: user.email ?? '',
      codename: user.codename,
      email_notifications: user.email_notifications !== false,
    },
  });

  const onSubmit = handleSubmit(async (input) => {
    setStatus(null);
    setFormError(null);
    try {
      setUser(
        await meApi.update({
          name: input.name.trim(),
          email: input.email.trim(),
          codename: input.codename.trim(),
          email_notifications: input.email_notifications,
        }),
      );
      setStatus(t('Profile updated.'));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'email', 'codename', 'email_notifications']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Profile') }} />
      <FormTextField control={control} name="name" label={t('Name')} testID="input-profile-name" />
      <FormTextField
        control={control}
        name="email"
        label={t('Email')}
        testID="input-profile-email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <FormTextField
        control={control}
        name="codename"
        label={t('Codename')}
        testID="input-profile-codename"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <AppText variant="muted">{t('How other players see you. 3 to 24 letters, digits or underscores.')}</AppText>
      <Controller
        control={control}
        name="email_notifications"
        render={({ field: { value, onChange } }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <AppText style={{ flex: 1 }}>{t('Email me when someone invites me to a game')}</AppText>
            <Switch testID="toggle-email-notifications" value={value} onValueChange={onChange} />
          </View>
        )}
      />
      <FormError message={formError} />
      {status ? <AppText>{status}</AppText> : null}
      <Button testID="btn-save-profile" label={t('Save')} loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
