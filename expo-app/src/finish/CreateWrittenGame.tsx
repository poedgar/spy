import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useCreateFinishGame } from '@/api/queries';
import type { CreateFinishGameInput, Locale, WrittenGameType } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { useGameNameSuggestion } from '@/game/useGameNameSuggestion';
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
const MAX_PLAYERS = 10;

/** Finish the Phrase and Interpret the Phrase create games the same way. */
export function CreateWrittenGame({ type }: { type: WrittenGameType }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const createGame = useCreateFinishGame(type);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, getValues, setValue } = useForm<CreateFinishGameInput>({
    defaultValues: { title: '', phrase_language: locale, max_players: MIN_PLAYERS },
  });

  const name = useGameNameSuggestion(type, () => getValues('title'), (title) => setValue('title', title));

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
      <Stack.Screen
        options={{ title: type === 'meaning' ? t('New Interpret the Phrase game') : t('New Finish the Phrase game') }}
      />
      <FormTextField control={control} name="title" label={t('Game title')} testID={`input-${type}-title`} />
      <Button
        testID="btn-roll-name"
        label={`🎲 ${t('Suggest another name')}`}
        variant="secondary"
        loading={name.rolling}
        onPress={name.roll}
      />

      <Controller
        control={control}
        name="phrase_language"
        render={({ field: { value, onChange } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">{t('Language of the phrases')}</AppText>
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
      <Button testID={`btn-create-${type}`} label={t('Create')} loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
