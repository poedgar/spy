import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

/** Seconds per round; 0 means no timer. Mirrors Game::ROUND_TIMER_CHOICES on the server. */
export const ROUND_TIMER_CHOICES = [0, 180, 300, 480, 600] as const;

export function RoundTimerPicker({ value, onChange }: { value: number; onChange(seconds: number): void }) {
  const { t } = useI18n();
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="muted">{t('Round timer')}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {ROUND_TIMER_CHOICES.map((seconds) => (
          <Pressable
            key={seconds}
            testID={`timer-${seconds}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === seconds }}
            onPress={() => onChange(seconds)}
            style={{
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: value === seconds ? colors.primary : colors.border,
            }}
          >
            <AppText>{seconds === 0 ? t('No timer') : t(':minutes minutes', { minutes: seconds / 60 })}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
