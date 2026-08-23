/**
 * Laravel sets the `XSRF-TOKEN` cookie on every response (its standard mechanism for
 * SPA-style fetch requests, independent of any JS HTTP client). Inertia's own `router.*`
 * helpers read and send it automatically; a raw `fetch()` call — used here because the
 * badge designer save endpoints return JSON rather than an Inertia redirect — needs to
 * attach it explicitly as `X-XSRF-TOKEN`.
 */
function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

    return match ? decodeURIComponent(match[1]) : null;
}

async function csrfFetch<T>(
    method: 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: unknown,
): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': readCookie('XSRF-TOKEN') ?? '',
        },
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(
            `Request to ${url} failed with status ${response.status}`,
        );
    }

    return response.json();
}

export function csrfPost<T>(url: string, body: unknown): Promise<T> {
    return csrfFetch<T>('POST', url, body);
}

export function csrfPut<T>(url: string, body: unknown): Promise<T> {
    return csrfFetch<T>('PUT', url, body);
}

export function csrfDelete<T>(url: string, body?: unknown): Promise<T> {
    return csrfFetch<T>('DELETE', url, body);
}
