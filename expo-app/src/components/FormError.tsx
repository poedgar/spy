import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export function FormError({ message }: { message?: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <AppText testID="form-error" accessibilityRole="alert" style={{ color: colors.destructive }}>
      {message}
    </AppText>
  );
}
