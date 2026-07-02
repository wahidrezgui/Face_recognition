import api from './client';

export function fetchDepartments(params) {
    return api.get('/api/departments', { params });
}

export function fetchAllDepartments() {
    return api.get('/api/departments/all');
}

export function fetchDepartmentTree(parentId) {
    return api.get(`/api/departments/${parentId}/children`);
}

export function fetchDepartment(id) {
    return api.get(`/api/departments/${id}`);
}

export function createDepartment(data) {
    return api.post('/api/departments', data);
}

export function updateDepartment(data) {
    return api.post('/api/departments/update', data);
}

export function deleteDepartment(data) {
    return api.post('/api/departments/delete', data);
}

export function fetchCompanies(parentId) {
    return api.get(`/api/companies/${parentId}`);
}

export function createCompany(data) {
    return api.post('/api/companies', data);
}

export function updateCompany(data) {
    return api.post('/api/companies/update', data);
}

export function fetchCompanyInfo(id, params) {
    return api.get(`/api/companies/${id}/info`, { params });
}

export function fetchBases(params) {
    return api.get('/api/bases', { params });
}

export function fetchBase(id) {
    return api.get(`/api/bases/${id}`);
}

export function createBase(data) {
    return api.post('/api/bases', data);
}

export function updateBase(data) {
    return api.post('/api/bases/update', data);
}

export function deleteBase(data) {
    return api.post('/api/bases/delete', data);
}

export function fetchGates() {
    return api.get('/api/gates');
}

export function fetchGate(id) {
    return api.get(`/api/gates/${id}`);
}

export function createGate(data) {
    return api.post('/api/gates', data);
}

export function updateGate(data) {
    return api.post('/api/gates/update', data);
}

export function deleteGate(data) {
    return api.post('/api/gates/delete', data);
}

export function assignBase(data) {
    return api.post('/api/departments/assign-base', data);
}

export function createZone(data) {
    return api.post('/api/zones', data);
}

export function updateZone(data) {
    return api.post('/api/zones/update', data);
}

export function deleteZone(data) {
    return api.post('/api/zones/delete', data);
}

export function fetchZones() {
    return api.get('/api/lookups/zones');
}

export function fetchZone(id) {
    return api.get(`/api/lookups/zones/${id}`);
}
