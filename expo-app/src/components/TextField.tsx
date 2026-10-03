import { TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export function TextField({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  const { colors, spacing, radius, fontSize } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="muted">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? colors.destructive : colors.input,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.foreground,
            fontSize: fontSize.md,
          },
          style,
        ]}
        {...props}
      />
      {error ? <AppText style={{ color: colors.destructive }}>{error}</AppText> : null}
    </View>
  );
}
