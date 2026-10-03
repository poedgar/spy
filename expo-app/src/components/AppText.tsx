import { Text, type TextProps } from 'react-native';
import { useTheme } from '@/theme/useTheme';

type Variant = 'body' | 'muted' | 'heading' | 'title' | 'mono';

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const { colors, fontSize } = useTheme();
  const variants = {
    body: { color: colors.foreground, fontSize: fontSize.md },
    muted: { color: colors.mutedForeground, fontSize: fontSize.sm },
    heading: { color: colors.foreground, fontSize: fontSize.lg, fontWeight: '600' as const },
    title: { color: colors.foreground, fontSize: fontSize.xl, fontWeight: '700' as const },
    mono: { color: colors.foreground, fontSize: fontSize.mono, fontFamily: 'Courier', fontWeight: '700' as const },
  };
  return <Text style={[variants[variant], style]} {...props} />;
}
