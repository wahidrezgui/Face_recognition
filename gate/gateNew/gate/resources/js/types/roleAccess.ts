export interface AccessRouteMeta {
    path: string;
    label_ar: string;
    label_en: string;
}

export interface AccessResourceMeta {
    label_ar: string;
    label_en: string;
    scopable: boolean;
}

export interface AccessScopeLevelMeta {
    label_ar: string;
    label_en: string;
}

export interface AccessCatalogPayload {
    routes: Record<string, AccessRouteMeta>;
    resources: Record<string, AccessResourceMeta>;
    scopable_resources: string[];
    scope_levels: Record<string, AccessScopeLevelMeta>;
    super_admin_role: string;
}

export type ResourceLevel = 'none' | 'read' | 'write';
export type ScopeLevel = 'none' | 'global' | 'hierarchy' | 'self';

export interface RoleSummary {
    id: number;
    name: string;
    users_count: number;
    permissions_count: number;
    locked: boolean;
}

export interface RoleDetail {
    role: RoleSummary;
    permissions: string[];
    route_permissions: Record<string, boolean>;
    resource_permissions: Record<string, ResourceLevel>;
    resource_scopes: Record<string, ScopeLevel>;
    locked: boolean;
}

export interface UserSearchResult {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
}

export interface UserPermissionOverrides {
    user: UserSearchResult & { role: string | null };
    role_permissions: string[];
    direct_permissions: string[];
    route_permissions: Record<string, boolean>;
    resource_permissions: Record<string, ResourceLevel>;
    resource_scopes: Record<string, ScopeLevel>;
}
