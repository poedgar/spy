import type { ExpoConfig } from 'expo/config';

// Store identifiers belong to your Apple/Google developer accounts: set
// APP_BUNDLE_ID (e.g. com.yourname.spynet) for release builds. The default
// is a placeholder that only works for local development.
const bundleId = process.env.APP_BUNDLE_ID ?? 'com.example.spynet';

const config: ExpoConfig = {
  name: 'Marvelous Games',
  slug: 'spynet',
  scheme: 'spynet',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  // The app's mask mark (Lucide "venetian-mask", ISC), as on the web app.
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: false,
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#171717',
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-notifications', { defaultChannel: 'invitations' }],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#0a0a0a' },
      },
    ],
  ],
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
