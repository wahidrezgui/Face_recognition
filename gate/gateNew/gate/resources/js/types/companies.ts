import type { DepartmentBase } from './organization';

export interface Company {
    id: number;
    name_ar: string;
    name_en: string | null;
    parent_id: number;
    is_company: number;
    start_time: string | null;
    end_time: string | null;
    bases?: DepartmentBase[];
}

export interface PaginatedCompanies {
    data: Company[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface CompanyFilters {
    search?: string;
    page?: string;
    per_page?: string;
}
