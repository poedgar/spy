import { useEffect, useRef, useState } from 'react';
import { AppText } from '@/components/AppText';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

/**
 * Counts down to the round's end. At zero it asks for a refetch; the
 * server applies the timer (vote / reveal) as it serves the lobby.
 */
export function RoundTimer({ endsAt, onExpire }: { endsAt: string; onExpire: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  const expired = useRef(false);
  const remaining = Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining > 0 || expired.current) return;
    expired.current = true;
    const later = setTimeout(onExpire, 1000);
    return () => clearTimeout(later);
  }, [remaining, onExpire]);

  const label = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <AppText
      testID="round-timer"
      accessibilityLabel={t('Time left in this round')}
      style={{ fontVariant: ['tabular-nums'], color: remaining <= 30 ? colors.destructive : colors.foreground }}
    >
      ⏱ {remaining > 0 ? label : t("Time's up")}
    </AppText>
  );
}
