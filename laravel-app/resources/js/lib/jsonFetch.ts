/**
 * JSON requests to the app's own endpoints (outside Inertia visits).
 * Laravel refreshes the XSRF-TOKEN cookie on every response and accepts it
 * back as X-XSRF-TOKEN, which satisfies its CSRF check for POSTs.
 */
function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export async function jsonFetch<T>(
    url: string,
    options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
    const response = await fetch(url, {
        method: options.method ?? 'GET',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
            ...(options.body !== undefined
                ? { 'Content-Type': 'application/json' }
                : {}),
        },
        body:
            options.body !== undefined
                ? JSON.stringify(options.body)
                : undefined,
    });

    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
            message?: string;
        } | null;
        throw new Error(data?.message ?? `HTTP ${response.status}`);
    }

    return (await response.json()) as T;
}
