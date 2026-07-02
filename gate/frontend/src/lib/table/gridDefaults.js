export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_REPORT_PAGE_SIZE = 55;
export const DEFAULT_REPORT_PAGE_SIZE_OPTIONS = [10, 20, 30, 55];

export function arabicTextComparator(valueA, valueB) {
    if (valueA == null && valueB == null) {
        return 0;
    }
    if (valueA == null) {
        return -1;
    }
    if (valueB == null) {
        return 1;
    }
    return String(valueA).localeCompare(String(valueB), 'ar');
}

export function createDefaultColDef(overrides = {}) {
    return {
        resizable: true,
        sortable: true,
        flex: 1,
        minWidth: 100,
        cellStyle: { textAlign: 'right', direction: 'rtl' },
        headerClass: 'ag-right-aligned-header',
        comparator: arabicTextComparator,
        ...overrides,
    };
}

export function createPaginatorTemplate() {
    return {
        '640px': 'PrevPageLink CurrentPageReport NextPageLink',
        '960px': 'FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink',
        '1300px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
        default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink JumpToPageDropdown',
    };
}

export function createEmptyOverlayTemplate(message = 'لا توجد بيانات.') {
    return (
        '<span class="ag-overlay-no-rows-center">'
        + '<i class="pi pi-inbox gate-grid-empty-icon" aria-hidden="true"></i>'
        + `<span>${message}</span>`
        + '</span>'
    );
}

export function buildActionColumn(options = {}) {
    const {
        headerName = 'الإجراءات',
        showDelete = true,
        width = 110,
        pinned = null,
    } = options;

    return {
        headerName,
        field: '__actions',
        colId: 'actions',
        sortable: false,
        filter: false,
        resizable: false,
        width,
        minWidth: width,
        maxWidth: width,
        pinned,
        cellRenderer: 'GridActionsCell',
        cellRendererParams: {
            showDelete,
        },
    };
}

export const ROLE_BADGE_CLASSES = {
    Admin: 'bg-purple-100 text-purple-800',
    'Local Admin': 'bg-indigo-100 text-indigo-800',
    'Gate Pass Provider': 'bg-green-100 text-green-800',
    'Gate Guard': 'bg-blue-100 text-blue-800',
    'Super Admin': 'bg-amber-100 text-amber-800',
    Reporting: 'bg-slate-100 text-slate-800',
};

export function roleBadgeRenderer(params) {
    const role = params.data?.role || params.value || '—';
    const badgeClass = ROLE_BADGE_CLASSES[role] || 'bg-slate-100 text-slate-800';
    return `<span class="rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}">${role}</span>`;
}

export function pillBadgeRenderer(params) {
    const value = params.value || '—';
    return `<span class="rounded-full bg-slate-100 px-2 py-1 text-xs">${value}</span>`;
}

export function ssoStatusBadgeRenderer(params) {
    const { sso_linked: linked, sso_pending: pending } = params.data ?? {};

    if (linked) {
        return '<span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">مرتبط</span>';
    }

    if (pending) {
        return '<span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">بانتظار التفعيل</span>';
    }

    return '<span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">—</span>';
}
