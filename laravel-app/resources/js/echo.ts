import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'pusher'>;
    }
}

window.Pusher = Pusher;

const env = import.meta.env;
// Pusher's own service by default; set VITE_PUSHER_HOST (and port/scheme)
// to use a self-hosted Pusher-compatible server such as Laravel Reverb.
// Unset values arrive as empty strings, hence `||` rather than `??`.
const host = (env.VITE_PUSHER_HOST as string | undefined) || undefined;
const port = Number(env.VITE_PUSHER_PORT || 443);
const useTls = (env.VITE_PUSHER_SCHEME || 'https') === 'https';

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: env.VITE_PUSHER_APP_KEY,
    cluster: env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    forceTLS: useTls,
    ...(host
        ? {
              wsHost: host,
              wsPort: port,
              wssPort: port,
              enabledTransports: ['ws', 'wss'],
          }
        : {}),
});

export default window.Echo;
