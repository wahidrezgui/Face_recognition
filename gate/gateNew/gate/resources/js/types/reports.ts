export type ReportPresetKey =
    | 'reports'
    | 'issues'
    | 'justified'
    | 'unjustified'
    | 'export'
    | 'individual'
    | 'companiesReporting'
    | 'companiesIssues'
    | 'deactivatedEmployees'
    | 'expiredCards'
    | 'deactivatedUnreturnedCards'
    | 'companiesDeactivatedEmployees'
    | 'companiesExpiredCards'
    | 'companiesDeactivatedUnreturnedCards';

export type ReportDateMode = 'single' | 'range' | 'none';

export interface ReportColumn {
    field: string;
    headerKey: string;
    issueField?: 'hasEntryIssue' | 'hasExitIssue';
}

export interface ReportPreset {
    key: ReportPresetKey;
    dateMode: ReportDateMode;
    titleKey: string;
    descriptionKey: string;
    csvFileName: string;
    columns: ReportColumn[];
    issueHighlight: boolean;
    allowDeleteNote: boolean;
    isCompanyVariant: boolean;
    routeKey: string;
    /** Print output groups rows by department, then by employee within it. */
    groupByDepartmentAndEmployee?: boolean;
    /** CSV is streamed from a dedicated backend endpoint instead of built client-side. */
    serverCsvExport?: boolean;
    /** false hides the base/gate/movement-type pickers — irrelevant for plain employee-attribute presets. Defaults to true. */
    showMovementFilters?: boolean;
}

export interface ReportFilters {
    military_number: string;
    fullname_ar: string;
    gender: string;
    department_id: string;
    rank_ids: number[];
    base_ids: number[];
    gate_ids: number[];
    mvtype: string;
    date: string;
    from_date: string;
    to_date: string;
}

export interface CompanyReportFilters {
    dep_id: string;
    day: string;
    mvtype: string[];
}

export interface ReportRow {
    id: number;
    department?: string | null;
    rank?: string | null;
    rank_category?: string | null;
    military_number?: number | null;
    fullname_ar?: string | null;
    fullname_en?: string | null;
    gender?: string | null;
    mvdate?: string | null;
    mvtime?: string | null;
    mvtype?: string | null;
    gate?: string | null;
    base?: string | null;
    dakhool?: string | null;
    khorooj?: string | null;
    notes?: string | null;
    created_by?: string | null;
    notes_created_at?: string | null;
    hasEntryIssue?: boolean;
    hasExitIssue?: boolean;
    [key: string]: unknown;
}

export interface ReportDataResponse {
    data: ReportRow[];
    total: number;
}
