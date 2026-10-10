import type { ExpoConfig } from 'expo/config';

// Store identifiers belong to your Apple/Google developer accounts: set
// APP_BUNDLE_ID (e.g. com.yourname.marvelousgames) for release builds. The default
// is a placeholder that only works for local development.
const bundleId = process.env.APP_BUNDLE_ID ?? 'com.poedgar.marvelousgames';

const config: ExpoConfig = {
  name: 'Marvelous Games',
  slug: 'marvelousgames',
  scheme: 'marvelousgames',
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
    // Voice chat needs only the microphone; the WebRTC plugin asks for more.
    blockedPermissions: ['android.permission.CAMERA', 'android.permission.SYSTEM_ALERT_WINDOW'],
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
    // Voice chat in game lobbies (LiveKit over WebRTC).
    '@livekit/react-native-expo-plugin',
    [
      '@config-plugins/react-native-webrtc',
      { microphonePermission: 'Marvelous Games uses the microphone for voice chat with the other players.' },
    ],
  ],
  extra: {
    eas: { projectId: 'a3026ce8-16cf-44e5-9f26-5e95e56a8bbf' },
  },
};

export default config;
