import api, { ensureCsrfCookie } from './client';

export async function fetchRoleAccessCatalog() {
    const { data } = await api.get('/api/role-access/catalog');
    return data;
}

export async function fetchRolesAccess() {
    const { data } = await api.get('/api/role-access/roles');
    return data;
}

export async function fetchRoleAccess(roleId) {
    const { data } = await api.get(`/api/role-access/roles/${roleId}`);
    return data;
}

export async function updateRolePermissions(roleId, payload) {
    await ensureCsrfCookie();
    const { data } = await api.put(`/api/role-access/roles/${roleId}/permissions`, payload);
    return data;
}

export async function assignUserToRole(roleId, userId) {
    await ensureCsrfCookie();
    const { data } = await api.post(`/api/role-access/roles/${roleId}/users`, { user_id: userId });
    return data;
}

export async function removeUserFromRole(roleId, userId) {
    await ensureCsrfCookie();
    const { data } = await api.delete(`/api/role-access/roles/${roleId}/users/${userId}`);
    return data;
}
