import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, testID }: Props) {
  const { colors, spacing, radius, fontSize } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryForeground },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.bg,
        opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
      })}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={{ color: palette.fg, fontSize: fontSize.md, fontWeight: '600' }}>{label}</Text>
      )}
    </Pressable>
  );
}
