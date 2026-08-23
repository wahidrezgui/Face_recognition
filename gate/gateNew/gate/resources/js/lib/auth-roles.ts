import type { User } from '@/types';

export type ScopeLevel = 'global' | 'hierarchy' | 'self';

function resourceReadPermission(resource: string): string {
    return `${resource}.read`;
}

function resourceWritePermission(resource: string): string {
    return `${resource}.write`;
}

export function getAuthPermissions(user: User | null): string[] {
    return user?.permissions ?? [];
}

export function getResourceScopes(
    user: User | null,
): Partial<Record<string, ScopeLevel>> {
    return user?.scopes ?? {};
}

export function getResourceScope(
    resource: string,
    user: User | null,
): ScopeLevel {
    return getResourceScopes(user)[resource] ?? 'hierarchy';
}

export function isGlobalScope(resource: string, user: User | null): boolean {
    return getResourceScope(resource, user) === 'global';
}

export function permissionsLoaded(user: User | null): boolean {
    return Array.isArray(user?.permissions);
}

export function hasPermission(name: string, user: User | null): boolean {
    return getAuthPermissions(user).includes(name);
}

export function canWriteResource(resource: string, user: User | null): boolean {
    if (!permissionsLoaded(user)) {
        return false;
    }

    return hasPermission(resourceWritePermission(resource), user);
}

export function canReadResource(resource: string, user: User | null): boolean {
    if (!permissionsLoaded(user)) {
        return false;
    }

    return (
        hasPermission(resourceReadPermission(resource), user) ||
        hasPermission(resourceWritePermission(resource), user)
    );
}
