import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SpyNet',
  slug: 'spynet',
  scheme: 'spynet',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  // Template artwork — replace icon/splash with real artwork before submitting.
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.example.spynet',
    supportsTablet: false,
  },
  android: {
    package: 'com.example.spynet',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
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
