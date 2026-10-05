import { useColorScheme } from 'react-native';
import { darkColors, fontSize, lightColors, radius, spacing } from './tokens';

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    fontSize,
  } as const;
}
