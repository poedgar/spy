import Echo from 'laravel-echo';
import type PusherClient from 'pusher-js/react-native';
import * as PusherModule from 'pusher-js/react-native';
import { API_URL, PUSHER_CLUSTER, PUSHER_KEY } from '@/config';

// pusher-js 8.6's React Native build exports `{ Pusher }` at runtime while
// its types declare a default export; a default import is then the module
// object, and `new` on it fails ("Object cannot be used as a constructor").
const Pusher =
  (PusherModule as unknown as { Pusher?: typeof PusherClient }).Pusher ??
  (PusherModule as unknown as { default: typeof PusherClient }).default;

export type EchoClient = Echo<'pusher'>;

export function createEcho(token: string): EchoClient {
  const client = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    channelAuthorization: {
      endpoint: `${API_URL}/api/broadcasting/auth`,
      transport: 'ajax',
      headersProvider: () => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' }),
    },
  });

  return new Echo({ broadcaster: 'pusher', key: PUSHER_KEY, client });
}
