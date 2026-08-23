<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { computed } from 'vue';
import PageContainer from '@/components/PageContainer.vue';
import ReportDataTable from '@/components/reports/ReportDataTable.vue';
import ReportDetailPanel from '@/components/reports/ReportDetailPanel.vue';
import ReportNavCards from '@/components/reports/ReportNavCards.vue';
import ReportSearchPanel from '@/components/reports/ReportSearchPanel.vue';
import { useReportPage } from '@/composables/useReportPage';
import AppLayout from '@/layouts/AppLayout.vue';
import type { DepartmentNode, Gender, Rank } from '@/types';
import type { GateBase } from '@/types/gate';
import type { ReportPresetKey } from '@/types/reports';

defineOptions({ layout: AppLayout });

const props = defineProps<{
    presetKey: ReportPresetKey;
    departments: DepartmentNode[];
    ranks: Rank[];
    genders: Gender[];
    bases: GateBase[];
}>();

const page = usePage();

const {
    preset,
    filters,
    departmentTree,
    rows,
    total,
    page: currentPage,
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
} = useReportPage(props.presetKey);

const actorLabel = computed(() => {
    const user = page.props.auth.user;

    return user
        ? `${user.firstname} ${user.lastname}`.trim() || user.username
        : '';
});

function handlePrint(): void {
    void print(actorLabel.value);
}

function handleSave(payload: {
    empId: number;
    mvdate: string;
    notes: string;
}): void {
    void saveNote(payload.empId, payload.mvdate, payload.notes);
}

function handleDelete(payload: { empId: number; mvdate: string }): void {
    void removeNote(payload.empId, payload.mvdate);
}
</script>

<template>
    <Head :title="trans(preset.titleKey)" />

    <PageContainer
        :title="trans(preset.titleKey)"
        :description="trans(preset.descriptionKey)"
    >
        <ReportNavCards :active-key="preset.key" />

        <ReportSearchPanel
            :preset="preset"
            :filters="filters"
            :department-tree="departmentTree"
            :departments="props.departments"
            :ranks="props.ranks"
            :genders="props.genders"
            :bases="props.bases"
            :loading="loading"
            @search="() => search(1)"
            @reset="resetFilters"
            @export="exportCsv"
            @print="handlePrint"
            @department-change="onDepartmentFilterChange"
        />

        <ReportDataTable
            :preset="preset"
            :rows="rows"
            :total="total"
            :page="currentPage"
            :per-page="perPage"
            :loading="loading"
            :searched="searched"
            @page="onPageChange"
            @row-click="openDetail"
        />

        <ReportDetailPanel
            :open="detailOpen"
            :preset="preset"
            :row="selectedRow"
            @update:open="(value) => (value ? undefined : closeDetail())"
            @save="handleSave"
            @delete="handleDelete"
        />
    </PageContainer>
</template>
