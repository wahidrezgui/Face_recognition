import { trans } from 'laravel-vue-i18n';
import { computed, onMounted, reactive, ref } from 'vue';
import {
    companiesData,
    data as reportData,
    exportCsv as exportCsvRoute,
    addNote as addNoteAction,
    deleteNote as deleteNoteAction,
} from '@/actions/App/Http/Controllers/Inertia/ReportController';
import { reportPresets } from '@/config/reportPresets';
import { csrfDelete, csrfPost } from '@/lib/csrfFetch';
import { exportReportCsv } from '@/lib/reports/exportCsv';
import { printReport } from '@/lib/reports/printReport';
import type { ReportPresetKey, ReportRow } from '@/types/reports';
import { useLocale } from './useLocale';
import { useToast } from './useToast';

const DEFAULT_PER_PAGE = 25;
/** Matches ReportFilterRequest's per_page cap - client-side fetch-all export/print
 *  (every preset except "export", which streams from a dedicated endpoint with no cap) can't
 *  exceed this in one request. */
const MAX_CLIENT_EXPORT_ROWS = 5000;

function buildQueryUrl(base: string, params: Record<string, unknown>): string {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') {
            continue;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => query.append(`${key}[]`, String(item)));
            continue;
        }

        query.append(key, String(value));
    }

    const qs = query.toString();

    return qs ? `${base}?${qs}` : base;
}

export function useReportPage(presetKey: ReportPresetKey) {
    const preset = computed(() => reportPresets[presetKey]);
    const { locale } = useLocale();
    const toast = useToast();

    const filters = reactive<Record<string, unknown>>({
        military_number: '',
        fullname_ar: '',
        gender: '',
        department_id: '',
        rank_ids: [] as number[],
        base_ids: [] as number[],
        gate_ids: [] as number[],
        mvtype: preset.value.isCompanyVariant ? [] : '',
        date: new Date().toISOString().slice(0, 10),
        from_date: '',
        to_date: '',
        dep_id: '',
        day: new Date().toISOString().slice(0, 10),
    });
    const departmentTree = ref<Record<string, boolean> | null>(null);

    const rows = ref<ReportRow[]>([]);
    const total = ref(0);
    const page = ref(1);
    const perPage = ref(DEFAULT_PER_PAGE);
    const loading = ref(false);
    const searched = ref(false);

    const selectedRow = ref<ReportRow | null>(null);
    const detailOpen = ref(false);

    function currentFilterPayload(
        overrides: Record<string, unknown> = {},
    ): Record<string, unknown> {
        if (preset.value.isCompanyVariant) {
            return {
                preset: preset.value.key,
                dep_id: filters.dep_id,
                day: filters.day,
                mvtype: filters.mvtype,
                page: page.value,
                per_page: perPage.value,
                ...overrides,
            };
        }

        return {
            preset: preset.value.key,
            military_number: filters.military_number,
            fullname_ar: filters.fullname_ar,
            gender: filters.gender,
            department_id: filters.department_id,
            rank_ids: filters.rank_ids,
            base_ids: filters.base_ids,
            gate_ids: filters.gate_ids,
            mvtype: filters.mvtype,
            date: preset.value.dateMode === 'single' ? filters.date : undefined,
            from_date:
                preset.value.dateMode === 'range'
                    ? filters.from_date
                    : undefined,
            to_date:
                preset.value.dateMode === 'range' ? filters.to_date : undefined,
            page: page.value,
            per_page: perPage.value,
            ...overrides,
        };
    }

    async function fetchRows(
        overrides: Record<string, unknown> = {},
    ): Promise<{ data: ReportRow[]; total: number }> {
        const base = preset.value.isCompanyVariant
            ? companiesData.url()
            : reportData.url();
        const url = buildQueryUrl(base, currentFilterPayload(overrides));
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            throw new Error(
                `Report fetch failed with status ${response.status}`,
            );
        }

        return response.json();
    }

    async function search(targetPage = 1): Promise<void> {
        page.value = targetPage;
        loading.value = true;
        searched.value = true;

        try {
            const result = await fetchRows();
            rows.value = result.data;
            total.value = result.total;
        } catch {
            toast.error(trans('reports.toast.loadFailed'));
        } finally {
            loading.value = false;
        }
    }

    function onPageChange(event: { page: number; rows: number }): void {
        perPage.value = event.rows;
        void search(event.page + 1);
    }

    // Plain attribute presets (deactivated employees, expired cards, unreturned cards —
    // and their company variants) have no date/movement filter to wait on, so the filter
    // bar is a narrowing tool, not a gate: load the full unfiltered list immediately.
    // Every other preset stays "search to begin" since an unfiltered movement/issue query
    // could be huge.
    if (preset.value.dateMode === 'none') {
        onMounted(() => {
            void search(1);
        });
    }

    function resetFilters(): void {
        filters.military_number = '';
        filters.fullname_ar = '';
        filters.gender = '';
        filters.department_id = '';
        filters.rank_ids = [];
        filters.base_ids = [];
        filters.gate_ids = [];
        filters.mvtype = preset.value.isCompanyVariant ? [] : '';
        filters.dep_id = '';
        departmentTree.value = null;
        rows.value = [];
        total.value = 0;
        searched.value = false;
    }

    function onDepartmentFilterChange(
        value: Record<string, boolean> | null,
    ): void {
        departmentTree.value = value;
        filters.department_id = value ? Object.keys(value)[0] : '';
    }

    function dateRangeLabel(): string {
        if (preset.value.dateMode === 'single') {
            return String(filters.date || filters.day || '');
        }

        if (preset.value.dateMode === 'none') {
            return '';
        }

        return `${filters.from_date} — ${filters.to_date}`;
    }

    async function exportCsv(): Promise<void> {
        if (preset.value.serverCsvExport) {
            // Streamed directly from the backend - no row-count ceiling, so no need to
            // pre-fetch or check `total` here.
            window.location.assign(
                buildQueryUrl(exportCsvRoute.url(), currentFilterPayload()),
            );

            return;
        }

        if (total.value > MAX_CLIENT_EXPORT_ROWS) {
            toast.error(trans('reports.toast.tooManyRows'));

            return;
        }

        try {
            const result = await fetchRows({
                per_page: Math.max(total.value, 1),
                page: 1,
            });
            exportReportCsv(result.data, preset.value);
        } catch {
            toast.error(trans('reports.toast.exportFailed'));
        }
    }

    async function print(actorLabel: string): Promise<void> {
        if (total.value > MAX_CLIENT_EXPORT_ROWS) {
            toast.error(trans('reports.toast.tooManyRows'));

            return;
        }

        try {
            const result = await fetchRows({
                per_page: Math.max(total.value, 1),
                page: 1,
            });
            printReport(
                result.data,
                preset.value,
                dateRangeLabel(),
                trans('reports.print.printedBy', { name: actorLabel }),
            );
        } catch {
            toast.error(trans('reports.toast.printFailed'));
        }
    }

    function openDetail(row: ReportRow): void {
        selectedRow.value = row;
        detailOpen.value = true;
    }

    function closeDetail(): void {
        detailOpen.value = false;
    }

    async function saveNote(
        empId: number,
        mvdate: string,
        notes: string,
    ): Promise<void> {
        try {
            await csrfPost(addNoteAction.url(), {
                emp_id: empId,
                mvdate,
                notes,
            });
            toast.success(trans('reports.toast.noteSaved'));
            await search(page.value);
        } catch {
            toast.error(trans('reports.toast.noteFailed'));
        }
    }

    async function removeNote(empId: number, mvdate: string): Promise<void> {
        try {
            await csrfDelete(deleteNoteAction.url(), { emp_id: empId, mvdate });
            toast.success(trans('reports.toast.noteDeleted'));
            closeDetail();
            await search(page.value);
        } catch {
            toast.error(trans('reports.toast.noteFailed'));
        }
    }

    return {
        preset,
        locale,
        filters,
        departmentTree,
        rows,
        total,
        page,
        perPage,
        loading,
        searched,
        selectedRow,
        detailOpen,
        search,
        onPageChange,
        resetFilters,
        onDepartmentFilterChange,
        exportCsv,
        print,
        openDetail,
        closeDetail,
        saveNote,
        removeNote,
    };
}
