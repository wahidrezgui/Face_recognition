import api from './client';

export function fetchEmployees(params) {
    return api.get('/api/employees', { params });
}

export function fetchEmployeesByDepartment(params) {
    return api.get('/api/employees/by-department', { params });
}

export function fetchLatestEmployees(params) {
    return api.get('/api/employees/latest', { params });
}

export function searchEmployees(params) {
    return api.get('/api/employees/search', { params });
}

export function fetchGateDirectory() {
    return api.get('/api/employees/gate-directory');
}

export function fetchEmployee(id, params) {
    return api.get(`/api/employees/${id}`, { params });
}

export function fetchGatePreview(id, params) {
    return api.get(`/api/employees/${id}/gate-preview`, { params });
}

export function fetchGuest(id) {
    return api.get(`/api/guests/${id}`);
}

export function createEmployee(data) {
    return api.post('/api/employees', data);
}

export function updateEmployee(data) {
    return api.post('/api/employees/update', data);
}

export function deleteEmployee(data) {
    return api.post('/api/employees/delete', data);
}

export function approveEmployee(data) {
    return api.post('/api/employees/approve', data);
}

export function importEmployees(data) {
    return api.post('/api/employees/import', data);
}

export function searchByMilitary(data) {
    return api.post('/api/employees/search-military', data);
}

export function addEmployeeNote(data) {
    return api.post('/api/employees/notes', data);
}

export function deleteEmployeeNote(data) {
    return api.delete('/api/employees/notes', { data });
}

export function createCar(data) {
    return api.post('/api/employees/cars', data);
}

export function updateCar(data) {
    return api.post('/api/employees/cars/update', data);
}

export function deleteCar(data) {
    return api.post('/api/employees/cars/delete', data);
}

export function searchByPlate(params) {
    return api.get('/api/employees/cars/search-plate', { params });
}

export function fetchBadgeInfo(id) {
    return api.get(`/api/badges/${id}`);
}

export function updateBadge(data) {
    return api.post('/api/badges/update', data);
}

export function fetchBadgePreview(id) {
    return api.get(`/api/badges/${id}/preview`);
}

export function fetchCheckTimes(id, params) {
    return api.get(`/api/check-times/${id}`, { params });
}

export function createCheckTime(data) {
    return api.post('/api/check-times', data);
}

export function updateCheckTime(data) {
    return api.post('/api/check-times/update', data);
}

export function deleteCheckTime(data) {
    return api.post('/api/check-times/delete', data);
}
