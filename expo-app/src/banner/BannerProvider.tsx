import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';

interface Banner {
  message: string;
  tone?: 'info' | 'error';
  onPress?: () => void;
}

const BannerContext = createContext<{ showBanner(banner: Banner): void } | null>(null);

export function BannerProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const { colors, spacing, radius, fontSize } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const showBanner = useCallback((next: Banner) => setBanner(next), []);
  const value = useMemo(() => ({ showBanner }), [showBanner]);

  return (
    <BannerContext.Provider value={value}>
      {children}
      {banner ? (
        <Pressable
          testID="banner"
          accessibilityRole="alert"
          onPress={() => {
            setBanner(null);
            banner.onPress?.();
          }}
          style={[
            styles.banner,
            {
              top: insets.top + spacing.sm,
              marginHorizontal: spacing.lg,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: banner.tone === 'error' ? colors.destructive : colors.primary,
            },
          ]}
        >
          <Text
            style={{
              color: banner.tone === 'error' ? colors.destructiveForeground : colors.primaryForeground,
              fontSize: fontSize.md,
            }}
          >
            {banner.message}
          </Text>
        </Pressable>
      ) : null}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  const context = useContext(BannerContext);
  if (!context) throw new Error('useBanner must be used inside BannerProvider');
  return context;
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 0, right: 0, zIndex: 100, elevation: 6 },
});
