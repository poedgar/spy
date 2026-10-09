/**
 * Android notification channels. Every channelId the server sends
 * (app/Notifications/GameNotification::toExpoPush) must be created here:
 * Android silently drops pushes for a channel the app never created.
 */
export const ANDROID_CHANNELS = [
  { id: 'invitations', name: 'Invitations' },
  { id: 'game', name: 'Game updates' },
] as const;
