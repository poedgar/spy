import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import { API_URL, PUSHER_CLUSTER, PUSHER_KEY } from '@/config';

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
