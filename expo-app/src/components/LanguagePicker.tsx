import { Pressable, View } from 'react-native';
import type { Locale } from '@/api/types';
import { useBanner } from '@/banner/BannerProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Українська' },
];

export function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  const { showBanner } = useBanner();
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="muted">{t('Language')}</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            testID={`locale-${option.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: locale === option.value }}
            onPress={() =>
              setLocale(option.value).catch(() =>
                showBanner({ tone: 'error', message: t('Could not save your language. It will apply on this device only.') }),
              )
            }
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: locale === option.value ? colors.primary : colors.border,
              alignItems: 'center',
            }}
          >
            <AppText>{option.label}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
