import { getAuthUser } from './auth-session';
import {
    pathToRouteKey,
    routePermissionNames,
    resourceReadPermission,
    resourceWritePermission,
} from './access';

export function getAuthPermissions(user = getAuthUser()) {
    return user?.permissions ?? [];
}

export function getResourceScopes(user = getAuthUser()) {
    return user?.scopes ?? {};
}

export function getResourceScope(resource, user = getAuthUser()) {
    const scopes = getResourceScopes(user);
    if (scopes[resource]) {
        return scopes[resource];
    }
    return 'hierarchy';
}

export function isGlobalScope(resource, user = getAuthUser()) {
    return getResourceScope(resource, user) === 'global';
}

export function permissionsLoaded(user = getAuthUser()) {
    return Array.isArray(user?.permissions);
}

export function hasPermission(name, user = getAuthUser()) {
    return getAuthPermissions(user).includes(name);
}

export function hasRoutePermission(routeKey, user = getAuthUser()) {
    return routePermissionNames(routeKey).some((name) => hasPermission(name, user));
}

export function canManageRolePermissions(user = getAuthUser()) {
    return hasRoutePermission('role_permissions', user);
}

export function canWriteResource(resource, user = getAuthUser()) {
    if (!permissionsLoaded(user)) {
        return false;
    }
    return hasPermission(resourceWritePermission(resource), user);
}

export function canReadResource(resource, user = getAuthUser()) {
    if (!permissionsLoaded(user)) {
        return false;
    }
    return hasPermission(resourceReadPermission(resource), user)
        || hasPermission(resourceWritePermission(resource), user);
}

/**
 * Returns whether the user may access a route permission key.
 * Only call when {@link permissionsLoaded} is true.
 */
export function userCanAccessRoute(routeKey, user = getAuthUser()) {
    if (!routeKey) {
        return false;
    }
    return hasRoutePermission(routeKey, user);
}

export function userCanAccessPath(path, user = getAuthUser()) {
    return userCanAccessRoute(pathToRouteKey(path), user);
}

export function navItemVisible(item, user = getAuthUser()) {
    const routeKey = item.routeKey ?? pathToRouteKey(item.to);
    if (!routeKey) {
        return false;
    }
    return hasRoutePermission(routeKey, user);
}

export function roleRequiresDepartment(roleName, assignableRoles = []) {
    const match = assignableRoles.find((role) => role.name === roleName);
    if (match) {
        return Boolean(match.requires_department);
    }
    return false;
}
