export interface ActivityLogActor {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
}

export interface ActivityLogEmployee {
    id: number;
    fullname_ar: string | null;
    fullname_en: string;
    military_number: number | null;
}

export interface ActivityLogRow {
    id: number;
    emp_id: number | null;
    task: string;
    created_by_id: number | null;
    ip_address: string | null;
    created_at: string | null;
    created_by: ActivityLogActor | null;
    employee: ActivityLogEmployee | null;
}

export interface PaginatedActivityLog {
    data: ActivityLogRow[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface ActivityLogFilters {
    created_by_id?: string;
    employee_search?: string;
    task?: string;
    from_date?: string;
    to_date?: string;
    ip_address?: string;
    page?: string;
    per_page?: string;
}
