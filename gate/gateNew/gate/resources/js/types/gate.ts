export interface GateGate {
    id: number;
    name_ar: string;
    name_en: string;
}

export interface GateBase {
    id: number;
    name_ar: string;
    name_en: string;
    gates: GateGate[];
}

export interface DirectoryEmployee {
    id: number;
    military_number: number | null;
    qrcode: string;
    fullname_ar: string | null;
    fullname_en: string;
    photo: string | null;
    dep_id: number;
    department_ar: string | null;
    department_en: string | null;
    rank_ar: string | null;
    rank_en: string | null;
    status: number;
}

export type GateAlertType = 'expired' | 'expiring_soon' | 'remark';
export type GateAlertSeverity = 'danger' | 'warning' | 'info';

export interface GateAlert {
    type: GateAlertType;
    severity: GateAlertSeverity;
    expiry_date?: string;
    remarks?: string;
}

export interface EmployeeTiming {
    start_time: string;
    end_time: string;
}

export interface EmployeePreview {
    emp_id: number;
    military_number: number | null;
    qrcode: string;
    photo: string | null;
    fullname_en: string;
    fullname_ar: string | null;
    remarks: string | null;
    bloodtype: string | null;
    department_ar: string | null;
    department_en: string | null;
    rank_ar: string | null;
    rank_en: string | null;
    rank_category_ar: string | null;
    rank_category_en: string | null;
    base_ar: string | null;
    base_en: string | null;
    expiry_date: string | null;
    last_movement_type: 'in' | 'out' | null;
    access: number;
    timing: EmployeeTiming | null;
    alerts: GateAlert[];
    is_expired: boolean;
}

export type MovementType = 'Check-In' | 'Check-Out';

export interface MovementSubmitPayload {
    emp_id?: number;
    qrcode?: string;
    mvtype: MovementType;
    base_id: number;
    gate_id: number;
    platenumber?: string | null;
    automatic: boolean;
    client_request_id: string;
    mvdate?: string;
    mvtime?: string;
}

export interface MovementSubmitResult {
    success: boolean;
    duplicate: boolean;
}

export interface PlateMovementRow {
    id: number;
    platenumber: string | null;
    mvtype: MovementType;
    mvdate: string;
    mvtime: string;
    emp_id: number;
    employee_ar: string | null;
    employee_en: string | null;
    military_number: number | null;
    gate_ar: string | null;
    gate_en: string | null;
    base_ar: string | null;
    base_en: string | null;
}

export interface PaginatedPlateMovements {
    data: PlateMovementRow[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface PlateSearchResult {
    total: number;
    lastMovement: PlateMovementRow | null;
    data: PaginatedPlateMovements;
}

export interface PlateSearchFilters {
    platenumber: string;
    mvtype?: MovementType | '';
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
}
