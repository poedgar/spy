import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useCreatePhraseGame } from '@/api/queries';
import type { CreatePhraseGameInput, Locale } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

const LANGUAGES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Українська' },
];
// Tables start at the minimum; the host raises it for bigger groups.
const MIN_PLAYERS = 3;
// Every player needs a word of their own, and the pools' longest phrases cap this.
const MAX_PLAYERS = 10;

export default function CreatePhraseGame() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const createGame = useCreatePhraseGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<CreatePhraseGameInput>({
    defaultValues: { title: '', phrase_language: locale, max_players: MIN_PLAYERS },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const game = await createGame.mutateAsync({ ...input, title: input.title.trim() });
      router.replace(`/games/${game.code}`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['title', 'phrase_language', 'max_players']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('New Phrase game') }} />
      <FormTextField control={control} name="title" label={t('Game title')} testID="input-phrase-title" />

      <Controller
        control={control}
        name="phrase_language"
        render={({ field: { value, onChange } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">{t('Phrase language')}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {LANGUAGES.map((language) => (
                <Pressable
                  key={language.value}
                  testID={`phrase-language-${language.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === language.value }}
                  onPress={() => onChange(language.value)}
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: value === language.value ? colors.primary : colors.border,
                    alignItems: 'center',
                  }}
                >
                  <AppText>{language.label}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="max_players"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">{t('Players')}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Button
                testID="btn-players-minus"
                label="−"
                variant="secondary"
                onPress={() => onChange(Math.max(MIN_PLAYERS, value - 1))}
              />
              <AppText testID="players-count" variant="heading">
                {String(value)}
              </AppText>
              <Button
                testID="btn-players-plus"
                label="+"
                variant="secondary"
                onPress={() => onChange(Math.min(MAX_PLAYERS, value + 1))}
              />
            </View>
            {error ? <AppText style={{ color: colors.destructive }}>{error.message}</AppText> : null}
          </View>
        )}
      />

      <FormError message={formError} />
      <Button testID="btn-create-phrase" label={t('Create')} loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
