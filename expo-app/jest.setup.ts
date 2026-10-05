// Importing RNTL registers its built-in Jest matchers (toBeOnTheScreen, ...).
import '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

jest.mock('@/config', () => ({
  API_URL: 'https://api.test',
  PUSHER_KEY: 'test-key',
  PUSHER_CLUSTER: 'mt1',
  EAS_PROJECT_ID: 'test-project',
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

beforeEach(() => {
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store.clear();
});
