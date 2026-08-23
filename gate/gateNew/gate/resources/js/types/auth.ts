export type Role = {
    name: string;
};

export type User = {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
    dep_id: number | null;
    default_base: number;
    roles: Role[];
    permissions: string[];
    scopes: Partial<Record<string, 'global' | 'hierarchy' | 'self'>>;
    [key: string]: unknown;
};

export type Auth = {
    user: User | null;
};
