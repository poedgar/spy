import { Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'muted' }) {
  const { colors, spacing, radius, fontSize } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tone === 'muted' ? colors.muted : colors.secondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
      }}
    >
      <Text style={{ color: tone === 'muted' ? colors.mutedForeground : colors.secondaryForeground, fontSize: fontSize.sm }}>
        {label}
      </Text>
    </View>
  );
}
