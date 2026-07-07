<template>
    <div class="app-data-grid" dir="rtl">
        <div class="relative">
            <AppLoader
                v-if="loading"
                variant="inline"
                :label="loadingLabel"
                class="absolute inset-0 z-10 flex min-h-[200px] items-center justify-center rounded-xl bg-white/80"
            />

            <ag-grid-vue
                ref="agGrid"
                dir="rtl"
                class="ag-theme-gate gate-data-grid"
                :style="gridStyle"
                :column-defs="columnDefs"
                :default-col-def="mergedDefaultColDef"
                :row-data="rowData"
                :enable-rtl="rtl"
                :row-selection="effectiveRowSelection"
                :animate-rows="animateRows"
                :suppress-row-click-selection="suppressRowClickSelection"
                :overlay-no-rows-template="emptyOverlayTemplate"
                :context="gridContext"
                :components="gridComponents"
                :get-row-class="getRowClass"
                :pagination="clientPaginationEnabled"
                :pagination-page-size="clientPageSize"
                :suppress-pagination-panel="true"
                :dom-layout="domLayout"
                @grid-ready="onGridReady"
                @cell-clicked="onCellClicked"
                @selection-changed="onSelectionChanged"
            />
        </div>

        <div
            v-if="showPaginator"
            class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
        >
            <Paginator
                ref="paginator"
                :template="paginatorTemplate()"
                :rows="paginatorPageSize"
                :total-records="paginatorTotalRecords"
                dir="rtl"
                @page="onPaginatorPage"
            >
                <template #start="slotProps">
                    <span class="text-sm text-slate-600">
                        صفحة {{ slotProps.state.page + 1 }} من {{ paginatorTotalPages }}
                        <span class="mx-1 text-slate-400">·</span>
                        {{ paginatorTotalRecords }} {{ paginatorTotalRecords === 1 ? 'صف' : 'صفوف' }}
                    </span>
                </template>

                <template #jumpToPageDropdown>
                    <label class="flex items-center gap-2 text-sm text-slate-600">
                        <span>انتقل إلى</span>
                        <select
                            :value="activeSelectedPage"
                            class="gate-grid-select"
                            @change="onJumpToPage"
                        >
                            <option v-for="page in paginatorTotalPages" :key="page" :value="page">
                                {{ page }}
                            </option>
                        </select>
                    </label>
                </template>

                <template #end>
                    <label class="flex items-center gap-2 text-sm text-slate-600">
                        <span>صفوف لكل صفحة</span>
                        <select
                            :value="paginatorPageSize"
                            class="gate-grid-select"
                            @change="onPageSizeChange"
                        >
                            <option v-for="option in rowsPerPageOptions" :key="option" :value="option">
                                {{ option }}
                            </option>
                        </select>
                    </label>
                </template>
            </Paginator>
        </div>
    </div>
</template>

<script>
import { AgGridVue } from 'ag-grid-vue3';
import Paginator from 'primevue/paginator';
import AppLoader from '../shared/AppLoader.vue';
import GridActionsCell from './GridActionsCell.vue';
import {
    createDefaultColDef,
    createPaginatorTemplate,
    createEmptyOverlayTemplate,
    DEFAULT_PAGE_SIZE,
    DEFAULT_PAGE_SIZE_OPTIONS,
} from '../../lib/table/gridDefaults.js';
import 'ag-grid-community/styles/ag-grid.css';
import '../../styles/ag-theme-gate.css';

export default {
    name: 'AppDataGrid',
    components: {
        AgGridVue,
        Paginator,
        AppLoader,
    },
    props: {
        columnDefs: {
            type: Array,
            default: () => [],
        },
        rowData: {
            type: Array,
            default: () => [],
        },
        loading: {
            type: Boolean,
            default: false,
        },
        loadingLabel: {
            type: String,
            default: 'جاري التحميل…',
        },
        emptyMessage: {
            type: String,
            default: 'لا توجد بيانات.',
        },
        paginationMode: {
            type: String,
            default: 'server',
            validator: (value) => ['client', 'server', 'none'].includes(value),
        },
        perPage: {
            type: Number,
            default: DEFAULT_PAGE_SIZE,
        },
        totalRows: {
            type: Number,
            default: 0,
        },
        rowsPerPageOptions: {
            type: Array,
            default: () => DEFAULT_PAGE_SIZE_OPTIONS,
        },
        selectedPage: {
            type: Number,
            default: 1,
        },
        height: {
            type: String,
            default: 'min(480px, 60vh)',
        },
        domLayout: {
            type: String,
            default: 'normal',
            validator: (value) => ['normal', 'autoHeight', 'print'].includes(value),
        },
        lineHeight: {
            type: String,
            default: '48px',
        },
        sortable: {
            type: Boolean,
            default: true,
        },
        rtl: {
            type: Boolean,
            default: true,
        },
        rowSelection: {
            type: String,
            default: 'multiple',
        },
        animateRows: {
            type: Boolean,
            default: true,
        },
        suppressRowClickSelection: {
            type: Boolean,
            default: true,
        },
        defaultColDef: {
            type: Object,
            default: () => ({}),
        },
        getRowClass: {
            type: Function,
            default: null,
        },
    },
    emits: [
        'grid-ready',
        'row-clicked',
        'cell-clicked',
        'selection-changed',
        'page-change',
        'update:per-page',
        'update:selected-page',
        'row-edit',
        'row-delete',
    ],
    data() {
        return {
            gridApi: null,
            clientPageSize: this.perPage,
            clientCurrentPage: 0,
            gridComponents: {
                GridActionsCell,
            },
        };
    },
    computed: {
        mergedDefaultColDef() {
            return createDefaultColDef({
                sortable: this.sortable,
                ...this.defaultColDef,
            });
        },
        gridStyle() {
            const style = {
                '--ag-line-height': this.lineHeight,
                width: '100%',
            };

            if (this.domLayout !== 'autoHeight') {
                style.height = this.height;
            }

            return style;
        },
        clientPaginationEnabled() {
            return this.paginationMode === 'client';
        },
        showPaginator() {
            if (this.paginationMode === 'client') {
                return this.rowData.length > 0;
            }
            return this.paginationMode === 'server' && this.totalRows > 0;
        },
        paginatorTotalRecords() {
            return this.clientPaginationEnabled ? this.rowData.length : this.totalRows;
        },
        paginatorPageSize() {
            return this.clientPaginationEnabled ? this.clientPageSize : this.perPage;
        },
        paginatorTotalPages() {
            return Math.max(1, Math.ceil(this.paginatorTotalRecords / this.paginatorPageSize));
        },
        activeSelectedPage() {
            return this.clientPaginationEnabled ? this.clientCurrentPage + 1 : this.selectedPage;
        },
        totalPages() {
            return this.paginatorTotalPages;
        },
        emptyOverlayTemplate() {
            return createEmptyOverlayTemplate(this.emptyMessage);
        },
        gridContext() {
            return {
                onRowEdit: (row) => this.$emit('row-edit', row),
                onRowDelete: (row) => this.$emit('row-delete', row),
            };
        },
        effectiveRowSelection() {
            return this.rowSelection === 'none' ? undefined : this.rowSelection;
        },
    },
    watch: {
        perPage(value) {
            this.clientPageSize = value;
        },
        rowData() {
            if (this.clientPaginationEnabled) {
                this.clientCurrentPage = 0;
                this.$nextTick(() => {
                    this.gridApi?.paginationGoToPage(0);
                    this.$refs.paginator?.changePage(0);
                });
            }
        },
    },
    methods: {
        paginatorTemplate() {
            return createPaginatorTemplate();
        },
        onGridReady(params) {
            this.gridApi = params.api;
            this.$emit('grid-ready', params);
        },
        onRowClicked(event) {
            this.$emit('row-clicked', event);
        },
        onCellClicked(event) {
            this.$emit('cell-clicked', event);
            if (event.column?.getColId?.() === 'selection') {
                return;
            }
            this.$emit('row-clicked', event);
        },
        onSelectionChanged(event) {
            this.$emit('selection-changed', event);
        },
        onPaginatorPage(event) {
            if (this.clientPaginationEnabled) {
                this.clientCurrentPage = event.page;
                this.gridApi?.paginationGoToPage(event.page);
                return;
            }

            this.$emit('page-change', {
                page: event.page + 1,
                perPage: this.perPage,
            });
        },
        onJumpToPage(event) {
            const page = Number(event.target.value);

            if (this.clientPaginationEnabled) {
                this.clientCurrentPage = page - 1;
                this.gridApi?.paginationGoToPage(page - 1);
                this.$refs.paginator?.changePage(page - 1);
                return;
            }

            this.$emit('update:selected-page', page);
            this.$refs.paginator?.changePage(page - 1);
            this.$emit('page-change', { page, perPage: this.perPage });
        },
        onPageSizeChange(event) {
            const nextPageSize = Number(event.target.value);

            if (this.clientPaginationEnabled) {
                this.clientPageSize = nextPageSize;
                this.clientCurrentPage = 0;
                this.gridApi?.paginationSetPageSize(nextPageSize);
                this.gridApi?.paginationGoToPage(0);
                this.$refs.paginator?.changePage(0);
                this.$emit('update:per-page', nextPageSize);
                return;
            }

            this.$emit('update:per-page', nextPageSize);
            this.$emit('page-change', { page: 1, perPage: nextPageSize });
        },
        exportDataAsCsv(options) {
            this.gridApi?.exportDataAsCsv(options);
        },
        setColumnDefs(columnDefs) {
            this.gridApi?.setColumnDefs(columnDefs);
        },
        setRowData(rowData) {
            this.gridApi?.setRowData(rowData);
        },
        getGridApi() {
            return this.gridApi;
        },
    },
};
</script>

<style scoped>
.gate-data-grid :deep(.ag-root-wrapper) {
    font-family: inherit;
}

.gate-grid-select {
    min-width: 4.25rem;
    appearance: none;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background-color: #fff;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    padding-inline-start: 0.625rem;
    padding-inline-end: 1.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: center;
    color: #334155;
    outline: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: left 0.5rem center;
    background-size: 0.75rem;
}

.gate-grid-select:focus {
    border-color: #8a1538;
    box-shadow: 0 0 0 2px rgb(138 21 56 / 0.2);
}

.gate-grid-select:hover {
    border-color: #cbd5e1;
}

.app-data-grid :deep(.p-paginator) {
    background: transparent;
    border: none;
    padding: 0;
    gap: 0.25rem;
}

.app-data-grid :deep(.p-paginator .p-paginator-pages .p-paginator-page),
.app-data-grid :deep(.p-paginator .p-paginator-first),
.app-data-grid :deep(.p-paginator .p-paginator-prev),
.app-data-grid :deep(.p-paginator .p-paginator-next),
.app-data-grid :deep(.p-paginator .p-paginator-last) {
    min-width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    color: #475569;
}

.app-data-grid :deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight) {
    background: #8a1538;
    border-color: #8a1538;
    color: #fff;
}
</style>
