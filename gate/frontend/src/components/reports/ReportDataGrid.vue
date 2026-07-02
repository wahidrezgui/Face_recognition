<template>
    <AppDataGrid
        ref="grid"
        :column-defs="columnDefs"
        :row-data="rowData"
        :per-page="perPage"
        :total-rows="totalRows"
        :rows-per-page-options="rowsPerPageOptions"
        :selected-page="selectedPage"
        pagination-mode="server"
        :height="height"
        line-height="56px"
        :row-selection="rowSelection"
        :suppress-row-click-selection="suppressRowClickSelection"
        @grid-ready="onGridReady"
        @row-clicked="onRowClicked"
        @selection-changed="onSelectionChanged"
        @page-change="onPageChange"
        @update:per-page="$emit('update:per-page', $event)"
        @update:selected-page="$emit('update:selected-page', $event)"
    />
</template>

<script>
import AppDataGrid from '../ui/AppDataGrid.vue';

export default {
    name: 'ReportDataGrid',
    components: {
        AppDataGrid,
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
        perPage: {
            type: Number,
            default: 55,
        },
        totalRows: {
            type: Number,
            default: 0,
        },
        rowsPerPageOptions: {
            type: Array,
            default: () => [10, 20, 30, 55],
        },
        selectedPage: {
            type: Number,
            default: 1,
        },
        height: {
            type: String,
            default: 'calc(100vh - 250px)',
        },
        rowSelection: {
            type: String,
            default: 'multiple',
        },
        suppressRowClickSelection: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['grid-ready', 'row-clicked', 'selection-changed', 'page-change', 'update:per-page', 'update:selected-page'],
    methods: {
        onGridReady(params) {
            this.$emit('grid-ready', params);
        },
        onRowClicked(event) {
            this.$emit('row-clicked', event);
        },
        onSelectionChanged(event) {
            this.$emit('selection-changed', event);
        },
        onPageChange(payload) {
            this.$emit('page-change', payload);
        },
        exportDataAsCsv(options) {
            this.$refs.grid?.exportDataAsCsv(options);
        },
        setColumnDefs(columnDefs) {
            this.$refs.grid?.setColumnDefs(columnDefs);
        },
        setRowData(rowData) {
            this.$refs.grid?.setRowData(rowData);
        },
    },
};
</script>
