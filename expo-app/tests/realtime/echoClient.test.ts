// The real client, not the fake the other tests use: building it must work
// with the installed pusher-js (its React Native export shape has changed).
jest.unmock('@/realtime/echo');
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock'));

test('the realtime client can be created', () => {
  const { createEcho } = jest.requireActual<typeof import('@/realtime/echo')>('@/realtime/echo');

  const echo = createEcho('test-token');

  expect(echo.connector.pusher.key).toBe('test-key');
  echo.disconnect();
});
