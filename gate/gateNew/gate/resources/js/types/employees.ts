import type { DepartmentNode } from './organization';

export interface Rank {
    id: number;
    rank_id: number;
    name_en: string;
    name_ar: string;
    rankvalue: number;
    category?: { id: number; name_en: string; name_ar: string } | null;
}

export interface Nationality {
    id: number;
    name_en: string | null;
    name_ar: string | null;
}

export interface Gender {
    id: number;
    name_en: string;
    name_ar: string;
}

export interface Zone {
    id: number;
    base_id: number;
    name_en: string;
    name_ar: string | null;
    color: string;
    pattern_type: string;
    pattern_color: string | null;
}

export interface BaseWithZones {
    id: number;
    name_en: string;
    name_ar: string;
    zones: Zone[];
}

export interface EmployeeCar {
    id: number;
    emp_id: number;
    plate_number: string;
    car_description: string | null;
    active: number;
}

export interface EmployeeMovement {
    id: number;
    emp_id: number;
    mvtype: string;
    mvdate: string;
    mvtime: string;
    created_byname: string | null;
    base?: { id: number; name_ar: string; name_en: string } | null;
    gate?: { id: number; name_ar: string; name_en: string } | null;
}

export interface Employee {
    id: number;
    status: number;
    photo: string | null;
    qrcode: string;
    gender_id: number;
    military_number: number | null;
    phone_number: number | null;
    fullname_en: string;
    fullname_ar: string | null;
    dep_id: number;
    rank_id: number;
    nationality_id: number;
    qid: string | null;
    created_by_id: number | null;
    dep_parent_id: number;
    default_base: number | null;
    is_employee?: number;
    housing: boolean;
    active: number | null;
    expiry_date: string | null;
    remarks: string | null;
    bloodtype: string | null;
    Job_Arabic: string | null;
    Job_En: string | null;
    StartTime: string | null;
    EndTime: string | null;
    Escort: string | null;
    device: string | null;
    department?: DepartmentNode | null;
    rank?: Rank | null;
    nationality?: Nationality | null;
    gender?: Gender | null;
    cars?: EmployeeCar[];
    zones?: Zone[];
}

export interface StatusCard {
    status: number;
    labelAr: string;
    labelEn: string;
    count: number;
}

export interface PaginatedEmployees {
    data: Employee[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface EmployeeFilters {
    military_number?: string;
    fullname_ar?: string;
    plate_number?: string;
    base_id?: string;
    zone_id?: string;
    status?: string;
    nationality_id?: string;
    dep_id?: string;
    housing?: string;
    expired_only?: string;
    deactivated_only?: string;
    page?: string;
    per_page?: string;
    sort_field?: string;
    sort_order?: string;
}
