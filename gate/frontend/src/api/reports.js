import api from './client';

export function fetchAttendanceReport(params) {
    return api.get('/api/reports/attendance', { params });
}

export function fetchIssuesReport(params) {
    return api.get('/api/reports/issues', { params });
}

export function fetchCompaniesReport(params) {
    return api.get('/api/reports/companies', { params });
}

export function fetchCompaniesIssuesReport(params) {
    return api.get('/api/reports/companies/issues', { params });
}

export function fetchDepartmentReports(params) {
    return api.get('/api/reports/departments', { params });
}

export function fetchIndividualReport(params) {
    return api.get('/api/reports/individual', { params });
}

export function submitAdvancedReport(data) {
    return api.post('/api/reports/advanced', data);
}

export function fetchLateEmployeesPercentage(params) {
    return api.get('/api/reports/late-employees-percentage', { params });
}
