export const queryKeys = {
    auth: {
        me: ['auth', 'me'],
    },
    departments: {
        detail: (id) => ['departments', 'detail', String(id)],
    },
    departmentHome: {
        stats: (depId) => ['department-home', 'stats', String(depId)],
        reports: (depId) => ['department-home', 'reports', String(depId)],
        latestEmployees: (depId) => ['department-home', 'latest-employees', String(depId)],
    },
    adminDashboard: {
        stats: ['admin-dashboard', 'stats'],
        reports: ['admin-dashboard', 'reports'],
    },
    dashboard: {
        stats: (scopeKey) => ['dashboard', 'stats', String(scopeKey)],
        reports: (scopeKey) => ['dashboard', 'reports', String(scopeKey)],
    },
};
