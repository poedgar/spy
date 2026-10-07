import { configureClient, request } from '@/api/client';
import { ApiError, NetworkError, ValidationError } from '@/api/errors';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

let token: string | null = null;
const onUnauthorized = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  onUnauthorized.mockReset();
  token = 'abc';
  configureClient({ getToken: () => token, onUnauthorized });
});

test('sends JSON with the bearer token to the versioned API', async () => {
  respond(200, { id: 1 });

  await expect(request('POST', '/games', { title: 'X' })).resolves.toEqual({ id: 1 });

  expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/games', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer abc' },
    body: '{"title":"X"}',
  });
});

test('omits the Authorization header when signed out', async () => {
  token = null;
  respond(200, {});

  await request('GET', '/me');

  expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});

test('returns undefined for 204', async () => {
  respond(204);

  await expect(request('POST', '/auth/logout')).resolves.toBeUndefined();
});

test('maps 422 to a ValidationError with field errors', async () => {
  respond(422, { message: 'Bad', errors: { code: ['This operation roster is already full.'] } });

  const error = await request<never>('POST', '/games/SPY-AAAA/join').catch((e: ValidationError) => e);

  expect(error).toBeInstanceOf(ValidationError);
  expect(error.fieldErrors).toEqual({ code: ['This operation roster is already full.'] });
});

test('a 401 with a token triggers onUnauthorized', async () => {
  respond(401, { message: 'Unauthenticated.' });

  await expect(request('GET', '/me')).rejects.toBeInstanceOf(ApiError);
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test('a 401 without a token does not trigger onUnauthorized', async () => {
  token = null;
  respond(401, { message: 'Unauthenticated.' });

  await expect(request('GET', '/me')).rejects.toBeInstanceOf(ApiError);
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test('5xx never exposes server text', async () => {
  respond(500, { message: 'SQLSTATE[HY000] secret' });

  await expect(request('GET', '/games/spy')).rejects.toMatchObject({
    status: 500,
    message: 'Something went wrong. Please try again.',
  });
});

test('network failure becomes a NetworkError', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

  await expect(request('GET', '/me')).rejects.toBeInstanceOf(NetworkError);
});
