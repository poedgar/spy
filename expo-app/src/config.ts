import Constants from 'expo-constants';

// Release builds talk to the live server unless EXPO_PUBLIC_API_URL says
// otherwise; EAS builds don't see the local .env, only EAS env variables.
const DEFAULT_API_URL = __DEV__ ? 'http://localhost:8000' : 'https://marvelous-games.laravel.cloud';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
export const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? '';
export const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? 'mt1';
export const EAS_PROJECT_ID: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
