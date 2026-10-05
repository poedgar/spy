export interface ColorTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  online: string;
}

export const lightColors: ColorTokens = {
  background: 'hsl(0, 0%, 100%)',
  foreground: 'hsl(0, 0%, 3.9%)',
  card: 'hsl(0, 0%, 100%)',
  cardForeground: 'hsl(0, 0%, 3.9%)',
  primary: 'hsl(0, 0%, 9%)',
  primaryForeground: 'hsl(0, 0%, 98%)',
  secondary: 'hsl(0, 0%, 92.1%)',
  secondaryForeground: 'hsl(0, 0%, 9%)',
  muted: 'hsl(0, 0%, 96.1%)',
  mutedForeground: 'hsl(0, 0%, 45.1%)',
  accent: 'hsl(0, 0%, 96.1%)',
  accentForeground: 'hsl(0, 0%, 9%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
  destructiveForeground: 'hsl(0, 0%, 98%)',
  border: 'hsl(0, 0%, 92.8%)',
  input: 'hsl(0, 0%, 89.8%)',
  ring: 'hsl(0, 0%, 3.9%)',
  online: 'hsl(142, 71%, 45%)',
};

export const darkColors: ColorTokens = {
  background: 'hsl(0, 0%, 3.9%)',
  foreground: 'hsl(0, 0%, 98%)',
  card: 'hsl(0, 0%, 3.9%)',
  cardForeground: 'hsl(0, 0%, 98%)',
  primary: 'hsl(0, 0%, 98%)',
  primaryForeground: 'hsl(0, 0%, 9%)',
  secondary: 'hsl(0, 0%, 14.9%)',
  secondaryForeground: 'hsl(0, 0%, 98%)',
  muted: 'hsl(0, 0%, 16.08%)',
  mutedForeground: 'hsl(0, 0%, 63.9%)',
  accent: 'hsl(0, 0%, 14.9%)',
  accentForeground: 'hsl(0, 0%, 98%)',
  destructive: 'hsl(0, 84%, 60%)',
  destructiveForeground: 'hsl(0, 0%, 98%)',
  border: 'hsl(0, 0%, 14.9%)',
  input: 'hsl(0, 0%, 14.9%)',
  ring: 'hsl(0, 0%, 83.1%)',
  online: 'hsl(142, 69%, 58%)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12 } as const;
export const fontSize = { sm: 13, md: 15, lg: 18, xl: 22, mono: 15 } as const;
