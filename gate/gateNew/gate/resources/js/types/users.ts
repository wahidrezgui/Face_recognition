import type { Role } from './auth';
import type { DepartmentNode } from './organization';

// Named ManagedUser, not User — types/auth.ts already exports a User type for the
// authenticated actor, re-exported via types/index.ts's `export *`; a second same-named
// export would be an ambiguous-export TypeScript error at build time.
export interface ManagedUser {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
    military_number: number | null;
    dep_id: number | null;
    default_base: number;
    cnx: number;
    is_sso_linked: boolean;
    is_sso_pending: boolean;
    created_at: string | null;
    roles: Role[];
    department?: DepartmentNode | null;
}

export interface PaginatedUsers {
    data: ManagedUser[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface UserFilters {
    search?: string;
    military_number?: string;
    dep_id?: string;
    role?: string;
    sso_status?: string;
    page?: string;
    per_page?: string;
    sort_field?: string;
    sort_order?: string;
}
