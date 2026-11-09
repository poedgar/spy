import { type Control, useController } from 'react-hook-form';
import { View } from 'react-native';
import type { GameType } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';
import { playerLimits } from './playerLimits';

interface PlayerLimitsValues {
  min_players: number;
  max_players: number;
}

/**
 * The host's two player counts: how many a round needs to start, and how
 * many the table holds. Each pulls the other along so min never exceeds max.
 */
export function PlayerLimitsField<T extends PlayerLimitsValues>({
  control,
  type,
  label,
}: {
  control: Control<T>;
  type: GameType;
  /** Defaults to "Players"; gets the current maximum, e.g. for Spy's spy count. */
  label?: (max: number) => string;
}) {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const limits = playerLimits(type);
  const typed = control as unknown as Control<PlayerLimitsValues>;
  const min = useController({ control: typed, name: 'min_players' });
  const max = useController({ control: typed, name: 'max_players' });

  const setMin = (value: number) => {
    const next = Math.min(limits.max, Math.max(limits.min, value));
    min.field.onChange(next);
    if (next > max.field.value) max.field.onChange(next);
  };
  const setMax = (value: number) => {
    const next = Math.min(limits.max, Math.max(limits.min, value));
    max.field.onChange(next);
    if (next < min.field.value) min.field.onChange(next);
  };
  const error = min.fieldState.error ?? max.fieldState.error;

  const stepper = (testPrefix: string, value: number, onChange: (value: number) => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      <Button testID={`btn-${testPrefix}-minus`} label="−" variant="secondary" onPress={() => onChange(value - 1)} />
      <AppText testID={`${testPrefix}-count`} variant="heading">
        {String(value)}
      </AppText>
      <Button testID={`btn-${testPrefix}-plus`} label="+" variant="secondary" onPress={() => onChange(value + 1)} />
    </View>
  );

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="muted">{label ? label(max.field.value) : t('Players')}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="muted">{t('Minimum to start')}</AppText>
          {stepper('min-players', min.field.value, setMin)}
        </View>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="muted">{t('Maximum')}</AppText>
          {stepper('players', max.field.value, setMax)}
        </View>
      </View>
      {error ? <AppText style={{ color: colors.destructive }}>{error.message}</AppText> : null}
    </View>
  );
}
