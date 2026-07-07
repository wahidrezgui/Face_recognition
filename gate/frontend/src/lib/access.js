/** Path → route permission key (matches backend config/access.php). */
export const ROUTE_PATH_MAP = {
    '/dashboard': 'dashboard',
    '/departments': 'departments',
    '/bases': 'bases',
    '/companies': 'companies',
    '/companies-reporting': 'companies_reporting',
    '/companies-issues': 'companies_issues',
    '/employees': 'employees',
    '/reports': 'reports',
    '/issues': 'issues',
    '/exportReports': 'export_reports',
    '/unjustified': 'unjustified',
    '/justified': 'justified',
    '/IndividualReport': 'individual_report',
    '/badge': 'badge',
    '/settings': 'settings',
    '/users': 'users',
    '/role-permissions': 'role_permissions',
    '/gate': 'gate',
    '/gate/plate-search': 'gate_plate_search',
};

 

 

export function pathToRouteKey(path) {
    const normalized = path;
    return ROUTE_PATH_MAP[normalized] ?? null;
}

export function routePermissionName(routeKey) {
    return `route.${routeKey}`;
}

/** Canonical + legacy permission names for a route key. */
export function routePermissionNames(routeKey) {
    const names = [routePermissionName(routeKey)];
    const legacy =  routeKey  ?? [];
    return [...names, ...legacy];
}

export function resourceReadPermission(resource) {
    return `${resource}.read`;
}

export function resourceWritePermission(resource) {
    return `${resource}.write`;
}

export function resourceScopePermission(resource, level) {
    return `${resource}.scope.${level}`;
}

/** Preferred post-login landing paths — first permitted route wins. */
export const LOGIN_REDIRECT_PRIORITY = [
    '/dashboard',
    '/gate',
    '/employees',
    '/reports',
    '/departments',
    '/users',
    '/companies',
    '/issues',
    '/IndividualReport',
    '/settings',
    '/badge',
    '/bases',
    '/role-permissions',
    '/exportReports',
    '/companies-reporting',
    '/companies-issues',
    '/unjustified',
    '/justified',
    '/gate/plate-search',
];

export function userHasRouteAccess(routeKey, permissions) {
    if (!routeKey || !Array.isArray(permissions)) {
        return false;
    }
    return routePermissionNames(routeKey).some((name) => permissions.includes(name));
}

/** Resolve landing path from /me permissions (not role name). */
export function getDefaultRedirectPath(user) {
    const permissions = user?.permissions ?? [];
    if (permissions.length === 0) {
        return '/permission-denied';
    }

    for (const path of LOGIN_REDIRECT_PRIORITY) {
        const routeKey = ROUTE_PATH_MAP[path];
        if (userHasRouteAccess(routeKey, permissions)) {
            return path;
        }
    }

    for (const [path, routeKey] of Object.entries(ROUTE_PATH_MAP)) {
        if (userHasRouteAccess(routeKey, permissions)) {
            return path;
        }
    }

    return '/permission-denied';
}
