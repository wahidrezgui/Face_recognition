import api, { ensureCsrfCookie, resetCsrfCookie } from './client';
import { getDefaultRedirectPath } from '../lib/access';
import { loginResponseSchema, meResponseSchema } from '../schemas/auth';

export async function fetchAuthProviders() {
    const { data } = await api.get('/api/auth/providers');
    return data;
}

export async function fetchKeycloakPending() {
    const { data } = await api.get('/api/auth/keycloak/pending');
    return data;
}

export async function dismissKeycloakPending() {
    await ensureCsrfCookie(true);
    const { data } = await api.post('/api/auth/keycloak/pending/dismiss');
    return data;
}

export async function login(credentials) {
    await ensureCsrfCookie(true);
    const { data } = await api.post('/api/auth/login', credentials);
    if (data.status === 'success') {
        return loginResponseSchema.parse(data);
    }
    return data;
}

export async function logout() {
    await ensureCsrfCookie(true);
    try {
        const { data } = await api.post('/api/auth/logout');
        return data;
    } finally {
        resetCsrfCookie();
    }
}

export async function fetchMe() {
    const response = await api.get('/api/auth/me', {
        validateStatus: (status) => status === 200 || status === 401,
    });

    if (response.status === 401) {
        const error = new Error('Unauthenticated');
        error.response = response;
        throw error;
    }

    return meResponseSchema.parse(response.data);
}

export async function changePassword(payload) {
    await ensureCsrfCookie();
    const { data } = await api.patch('/api/auth/password', payload);
    return data;
}

export function syncLegacyStorage(user) {
    if (!user) {
        return;
    }
    const roleName = user.roles?.[0]?.name ?? '';
    localStorage.setItem('user_email', user.email ?? '');
    localStorage.setItem('user_name', `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim());
    localStorage.setItem('account_id', String(user.id ?? ''));
    localStorage.setItem('dep_id', String(user.dep_id ?? ''));
    localStorage.setItem('base_default', String(user.default_base ?? ''));
    localStorage.setItem('roles', roleName);
}

export function clearLegacyStorage() {
    ['user_email', 'user_name', 'account_id', 'dep_id', 'base_default', 'roles'].forEach((key) => {
        localStorage.removeItem(key);
    });
}

export function getRedirectPathForUser(user) {
    return getDefaultRedirectPath(user);
}
