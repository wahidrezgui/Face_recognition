import api from './client';

export function fetchUsers(params) {
    return api.get('/api/users', { params });
}

export function fetchUser(id) {
    return api.get(`/api/users/${id}`);
}

export function createUser(data) {
    return api.post('/api/users', data);
}

export function updateUser(data) {
    return api.post('/api/users/update', data);
}

export function deleteUser(data) {
    return api.post('/api/users/delete', data);
}
