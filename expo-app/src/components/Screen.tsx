import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface Props {
  children: ReactNode;
  title?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

export function Screen({ children, title, scroll = true, refreshing = false, onRefresh, testID }: Props) {
  const { colors, spacing } = useTheme();
  const content = (
    <View style={{ gap: spacing.lg, padding: spacing.lg }}>
      {title ? <AppText variant="title">{title}</AppText> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView testID={testID} edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
