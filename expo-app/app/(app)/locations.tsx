import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuessLocation, useLocations } from '@/api/queries';
import type { AgeTier, Place } from '@/api/types';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { TextField } from '@/components/TextField';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { tierLabels } from '@/game/labels';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

const TIERS: AgeTier[] = ['children', 'teens', 'adults'];

/**
 * The location guide. Opened with ?guess=<code> by a spy, tapping a place
 * stakes the round on it.
 */
export default function Locations() {
  const params = useLocalSearchParams<{ tier?: AgeTier; guess?: string }>();
  const router = useRouter();
  const { t, place } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const { showBanner } = useBanner();
  const [tier, setTier] = useState<AgeTier>(params.tier ?? 'adults');
  const [search, setSearch] = useState('');
  const guide = useLocations(tier);
  const guessing = params.guess;
  const guess = useGuessLocation(guessing ?? '');

  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    const data = guide.data;
    if (!data) return [];
    const matches = data.locations.filter(
      (location) => !term || location.en.toLowerCase().includes(term) || location.uk.toLowerCase().includes(term),
    );
    return Object.entries(data.categories)
      .map(([key, name]) => ({
        key,
        title: place({ id: 0, category: key, ...name }),
        data: matches.filter((location) => location.category === key).sort((a, b) => place(a).localeCompare(place(b))),
      }))
      .filter((section) => section.data.length > 0);
  }, [guide.data, search, place]);

  const stake = (location: Place) =>
    Alert.alert(t('Guess the location'), t('Stake the round on :place', { place: place(location) }) + '?', [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Guess the location'),
        style: 'destructive',
        onPress: () =>
          guess.mutate(location.id, {
            onSuccess: ({ correct }) => {
              showBanner({
                tone: correct ? 'info' : 'error',
                message: correct ? t('Correct! The spies win the round.') : t('Wrong guess. The loyalists win the round.'),
              });
              router.back();
            },
            onError: (error) =>
              showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Something went wrong.') }),
          }),
      },
    ]);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: guessing ? t('Guess the location') : t('Location guide') }} />
      <SectionList
        testID="locations-list"
        sections={sections}
        keyExtractor={(location) => String(location.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <AppText variant="muted">
              {guessing
                ? t('You get one guess. Right and the spies win; wrong and the loyalists do.')
                : t('Every place a round can be set in. A game draws from its age group and every younger one.')}
            </AppText>
            {guessing ? null : (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {TIERS.map((value) => (
                  <Pressable
                    key={value}
                    testID={`tier-${value}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: tier === value }}
                    onPress={() => setTier(value)}
                    style={{
                      flex: 1,
                      padding: spacing.sm,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: tier === value ? colors.primary : colors.border,
                      alignItems: 'center',
                    }}
                  >
                    <AppText>{tierLabels(t)[value].label}</AppText>
                  </Pressable>
                ))}
              </View>
            )}
            <TextField
              testID="input-location-search"
              label={t('Search :count locations…', { count: guide.data?.locations.length ?? 0 })}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {guide.isLoading ? <AppText variant="muted">{t('Loading…')}</AppText> : null}
            {guide.data && sections.length === 0 ? (
              <AppText variant="muted">{t('No locations match your search.')}</AppText>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <AppText variant="muted" style={{ marginTop: spacing.md, fontWeight: '600', textTransform: 'uppercase' }}>
            {section.title} ({section.data.length})
          </AppText>
        )}
        renderItem={({ item }) =>
          guessing ? (
            <Pressable
              testID={`location-${item.id}`}
              accessibilityRole="button"
              disabled={guess.isPending}
              onPress={() => stake(item)}
              style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border }}
            >
              <AppText>{place(item)}</AppText>
            </Pressable>
          ) : (
            <AppText testID={`location-${item.id}`} style={{ paddingVertical: spacing.xs }}>
              {place(item)}
            </AppText>
          )
        }
      />
    </SafeAreaView>
  );
}
