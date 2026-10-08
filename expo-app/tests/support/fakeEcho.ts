type Handler = (payload: unknown) => void;

/** In-memory stand-in for a laravel-echo instance, with helpers to emit events. */
export function createFakeEcho() {
  const listeners = new Map<string, Handler>();
  let presence: { here?: Handler; joining?: Handler; leaving?: Handler } = {};

  const channel = (name: string) => ({
    listen(event: string, handler: Handler) {
      listeners.set(`${name}:${event}`, handler);
      return this;
    },
  });

  const presenceChannel = {
    here(handler: Handler) {
      presence.here = handler;
      return presenceChannel;
    },
    joining(handler: Handler) {
      presence.joining = handler;
      return presenceChannel;
    },
    leaving(handler: Handler) {
      presence.leaving = handler;
      return presenceChannel;
    },
  };

  const stateHandlers = new Set<(change: { previous: string; current: string }) => void>();
  const connection = {
    state: 'connected',
    bind: jest.fn((_event: string, handler: (change: { previous: string; current: string }) => void) => {
      stateHandlers.add(handler);
    }),
    unbind: jest.fn((_event: string, handler: (change: { previous: string; current: string }) => void) => {
      stateHandlers.delete(handler);
    }),
  };

  return {
    private: jest.fn((name: string) => channel(`private-${name}`)),
    join: jest.fn(() => presenceChannel),
    leave: jest.fn((name: string) => {
      for (const key of [...listeners.keys()]) if (key.startsWith(`private-${name}:`)) listeners.delete(key);
    }),
    disconnect: jest.fn(),
    connector: { pusher: { connect: jest.fn(), disconnect: jest.fn(), connection } },
    /** Simulates the socket going down or coming back. */
    setConnectionState(current: string) {
      const previous = connection.state;
      connection.state = current;
      for (const handler of [...stateHandlers]) handler({ previous, current });
    },
    emit(channelName: string, event: string, payload: unknown) {
      listeners.get(`${channelName}:${event}`)?.(payload);
    },
    presence: {
      here: (members: { id: number }[]) => presence.here?.(members),
      joining: (member: { id: number }) => presence.joining?.(member),
      leaving: (member: { id: number }) => presence.leaving?.(member),
    },
    reset() {
      listeners.clear();
      presence = {};
      stateHandlers.clear();
      connection.state = 'connected';
    },
  };
}

export type FakeEcho = ReturnType<typeof createFakeEcho>;
