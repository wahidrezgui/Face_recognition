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
    return api.post('/api/employees', data, {
        transformRequest: [(payload, headers) => {
            if (payload instanceof FormData) {
                delete headers['Content-Type'];
            }
            return payload;
        }],
    });
}

export function updateEmployee(data) {
    return api.post('/api/employees/update', data, {
        transformRequest: [(payload, headers) => {
            if (payload instanceof FormData) {
                delete headers['Content-Type'];
            }
            return payload;
        }],
    });
}

export function deleteEmployee(data) {
    return api.post('/api/employees/delete', data);
}

export function approveEmployee(data) {
    return api.post('/api/employees/approve', data);
}

export function bulkApproveEmployees(data) {
    return api.post('/api/employees/approve', data);
}

export function bulkDeleteEmployees(data) {
    return api.post('/api/employees', data);
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

export function fetchBadge2(id) {
    return api.get(`/api/badges2/${id}`);
}

export function fetchDepartmentBadge(depId) {
    return api.get(`/api/badges/${depId}`);
}

export function fetchDepartmentBadgeBack(depId) {
    return api.get(`/api/badges2/${depId}`);
}

export async function fetchDepartmentBadgeDesign(depId) {
    const [frontResponse, backResponse] = await Promise.all([
        fetchDepartmentBadge(depId),
        fetchDepartmentBadgeBack(depId),
    ]);

    return {
        front: frontResponse.data?.data ?? frontResponse.data,
        back: backResponse.data?.data ?? backResponse.data,
    };
}

export function updateBadge(data) {
    return api.post('/api/badges/update', data);
}

export function updateBadge2(data) {
    return api.post('/api/badges2/update', data);
}

export function fetchBadgePreview(id) {
    return api.get(`/api/badges/${id}/preview`);
}

export function fetchBadgeBackPreview(id) {
    return api.get(`/api/badges2/${id}/preview`);
}

export function fetchBulkBadgePreview({ guestIds, sides = ['front', 'back'] }) {
    return api.post('/api/badges/bulk-preview', {
        guest_ids: guestIds,
        sides,
    });
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
