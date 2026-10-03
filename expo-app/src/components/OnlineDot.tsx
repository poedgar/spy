import { View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export function OnlineDot({ online }: { online: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={online ? 'Online' : 'Offline'}
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? colors.online : colors.border }}
    />
  );
}
