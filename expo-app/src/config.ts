import Constants from 'expo-constants';

// Release builds talk to the live server unless EXPO_PUBLIC_API_URL says
// otherwise; EAS builds don't see the local .env, only EAS env variables.
const DEFAULT_API_URL = __DEV__ ? 'http://localhost:8000' : 'https://marvelous-games.laravel.cloud';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
export const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? '';
export const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? 'mt1';
export const EAS_PROJECT_ID: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// "Continue with Google" via Firebase Authentication (public values from
// the Firebase console; empty = the button is hidden).
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};
/** The "Web client" OAuth id Firebase created; Google returns tokens for it. */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
