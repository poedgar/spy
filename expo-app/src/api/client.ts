import { API_URL } from '@/config';
import { ApiError, NetworkError, ValidationError } from './errors';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
let locale: string | null = null;

/** Sent as Accept-Language, so server messages match the app's language. */
export function setRequestLocale(next: string | null): void {
  locale = next;
}

export function configureClient(options: { getToken: () => string | null; onUnauthorized: () => void }): void {
  getToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (locale) headers['Accept-Language'] = locale;

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (response.ok) return data as T;

  if (response.status === 401) {
    // Only a request that carried a token means "your session ended".
    if (token) onUnauthorized();
    throw new ApiError(401, data?.message ?? 'Unauthenticated.');
  }

  if (response.status === 422) {
    throw new ValidationError(data?.message ?? 'Please check the form.', data?.errors ?? {});
  }

  const message =
    response.status >= 500 ? 'Something went wrong. Please try again.' : (data?.message ?? 'Request failed.');
  throw new ApiError(response.status, message);
}
