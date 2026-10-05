import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export function Card({ children, style, testID }: { children: ReactNode; style?: ViewStyle; testID?: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
        style,
      ]}
    >
      {children}
    </View>
  );
}
