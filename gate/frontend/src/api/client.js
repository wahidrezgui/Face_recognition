import axios from 'axios';

const api = axios.create({
    baseURL: '/',
    withCredentials: true,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
});

function readCookie(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    if (!match) {
        return null;
    }

    const raw = match[1];
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export async function ensureCsrfCookie(force = false) {
    if (!force && readCookie('XSRF-TOKEN')) {
        return;
    }

    await api.get('/sanctum/csrf-cookie');

    for (let attempt = 0; attempt < 10; attempt += 1) {
        if (readCookie('XSRF-TOKEN')) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error('CSRF cookie was not set. Clear site cookies for gate.local and retry.');
}

export function resetCsrfCookie() {
    // Next POST will fetch a fresh /sanctum/csrf-cookie.
}

api.interceptors.request.use((config) => {
    const token = readCookie('XSRF-TOKEN');
    if (token) {
        config.headers['X-XSRF-TOKEN'] = token;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 419) {
            const { config } = error;
            if (config._csrfRetried) {
                return Promise.reject(error);
            }

            config._csrfRetried = true;
            await ensureCsrfCookie(true);
            return api.request(config);
        }

        const onLoginPage = window.location.pathname === '/' || window.location.pathname === '';
        const onGatePage = window.location.pathname.startsWith('/gate');
        const isAuthMe = error.config?.url?.includes('/api/auth/me');
        if (error.response?.status === 401 && !onLoginPage && !isAuthMe) {
            if (onGatePage && typeof navigator !== 'undefined' && !navigator.onLine) {
                return Promise.reject(error);
            }
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export function isNetworkError(error) {
    return !error.response && (
        error.code === 'ERR_NETWORK'
        || error.code === 'ECONNABORTED'
        || error.message === 'Network Error'
    );
}

export default api;
