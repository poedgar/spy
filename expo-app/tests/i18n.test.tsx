import { act, fireEvent, screen } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import { meApi } from '@/api/endpoints';
import { LOCALE_KEY } from '@/i18n/I18nProvider';
import AppLayout from '../app/(app)/_layout';
import Settings from '../app/(app)/settings/index';
import { fakeUser } from './support/fakes';
import { renderApp } from './support/renderApp';

jest.mock('@/api/endpoints');

const routes = { '(app)/_layout': AppLayout, '(app)/settings/index': Settings };

test('switching to Ukrainian translates the app and saves it on the account', async () => {
  jest.mocked(meApi.updateLocale).mockResolvedValue({ ...fakeUser, locale: 'uk' });
  await renderApp(routes, { initialUrl: '/settings', user: { ...fakeUser, locale: 'en' } });

  expect(await screen.findByText('Log out')).toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByTestId('locale-uk'));
  });

  expect(await screen.findByText('Вийти')).toBeOnTheScreen();
  expect(meApi.updateLocale).toHaveBeenCalledWith('uk');
  expect(await SecureStore.getItemAsync(LOCALE_KEY)).toBe('uk');
});

test('the account language is used from the start', async () => {
  await renderApp(routes, { initialUrl: '/settings', user: { ...fakeUser, locale: 'uk' } });

  expect(await screen.findByText('Профіль')).toBeOnTheScreen();
});
