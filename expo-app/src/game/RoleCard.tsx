import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import type { Game, Round } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

/** The player's secret: hidden until they choose to look, so a neighbour can't read it. */
export function RoleCard({ game, round }: { game: Game; round: Round }) {
  const router = useRouter();
  const { t, place, locale } = useI18n();
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const isSpy = round.my_role === 'spy';
  const accent = isSpy ? colors.destructive : colors.online;

  return (
    <Card testID="role-card" style={revealed ? { borderColor: accent, borderWidth: 2 } : undefined}>
      <AppText variant="heading">
        {t('Round :number', { number: round.number })} ·{' '}
        {round.spy_count === 1 ? t('1 spy at the table') : t(':count spies at the table', { count: round.spy_count })}
      </AppText>

      {!revealed ? (
        <AppText variant="muted">{t('Your dossier is sealed. Reveal it when nobody can see your screen.')}</AppText>
      ) : isSpy ? (
        <View testID="role-spy" style={{ gap: 8 }}>
          <AppText variant="title" style={{ color: colors.destructive }}>
            {t('You are the spy')}
          </AppText>
          <AppText>{t('You do not know the location. Blend in, listen for clues, and avoid being voted out.')}</AppText>
          <AppText variant="muted">
            {t('Think you know where you are? Name the location to win the round, but a wrong guess loses it.')}
          </AppText>
          <Button
            testID="btn-guess-location"
            label={t('Guess the location')}
            variant="destructive"
            onPress={() =>
              router.push({ pathname: '/locations', params: { tier: game.age_tier ?? 'adults', guess: game.code } })
            }
          />
        </View>
      ) : (
        <View testID="role-loyalist" style={{ gap: 8 }}>
          <AppText style={{ color: colors.online, fontWeight: '600' }}>{t('You are a loyal operative')}</AppText>
          <AppText testID="secret-location" variant="title">
            {place(round.location)}
          </AppText>
          {round.location ? (
            <AppText variant="muted">({round.location[locale === 'uk' ? 'en' : 'uk']})</AppText>
          ) : null}
          <AppText variant="muted">
            {t('Ask and answer questions that prove you know this place without giving it away to the spy.')}
          </AppText>
        </View>
      )}

      <Button
        testID="btn-reveal-role"
        label={revealed ? t('Hide role') : t('Reveal my role')}
        variant="secondary"
        onPress={() => setRevealed((value) => !value)}
      />
    </Card>
  );
}
