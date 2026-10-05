import Constants from 'expo-constants';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
export const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? '';
export const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? 'mt1';
export const EAS_PROJECT_ID: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
