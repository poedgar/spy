import { darkColors, lightColors } from '@/theme/tokens';

test('light and dark palettes define the same tokens', () => {
  expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
});

test('palettes are copied from the web theme', () => {
  expect(lightColors.primary).toBe('hsl(0, 0%, 9%)');
  expect(darkColors.background).toBe('hsl(0, 0%, 3.9%)');
  expect(lightColors.destructive).toBe('hsl(0, 84.2%, 60.2%)');
});
