import api from './client';

export function fetchAllStats() {
    return api.get('/api/stats');
}

export function fetchStats(id) {
    return api.get(`/api/stats/${id}`);
}

export function fetchNotification(id) {
    return api.get(`/api/notifications/${id}`);
}

export function fetchDashboardReports(id) {
    return api.get(`/api/dashboard-reports/${id}`);
}

export function fetchSaReports() {
    return api.get('/api/stats/super-admin/reports');
}
