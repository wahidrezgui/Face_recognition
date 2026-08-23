<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { useLocale } from '@/composables/useLocale';
import type { ActivityLogRow, PaginatedActivityLog } from '@/types';

interface Props {
    logs: PaginatedActivityLog;
}

const props = defineProps<Props>();

interface DataTableLazyEvent {
    first: number;
    rows: number;
}

const emit = defineEmits<{
    change: [event: DataTableLazyEvent];
}>();

const { locale } = useLocale();

function actorLabel(row: ActivityLogRow): string {
    if (!row.created_by) {
        return '—';
    }

    return (
        `${row.created_by.firstname} ${row.created_by.lastname}`.trim() ||
        row.created_by.username
    );
}

function employeeLabel(row: ActivityLogRow): string {
    if (!row.employee) {
        return '—';
    }

    const name =
        locale.value === 'en'
            ? row.employee.fullname_en
            : row.employee.fullname_ar || row.employee.fullname_en;

    return row.employee.military_number
        ? `${name} (${row.employee.military_number})`
        : name;
}
</script>

<template>
    <DataTable
        :value="props.logs.data"
        lazy
        paginator
        data-key="id"
        :rows="props.logs.per_page"
        :total-records="props.logs.total"
        :first="(props.logs.current_page - 1) * props.logs.per_page"
        :rows-per-page-options="[10, 25, 50, 100]"
        striped-rows
        @page="emit('change', $event)"
    >
        <template #empty>
            <div
                class="py-10 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('activityLog.table.empty') }}
            </div>
        </template>

        <Column
            field="created_at"
            :header="trans('activityLog.table.date')"
            style="width: 12rem"
        >
            <template #body="{ data }">{{
                (data as ActivityLogRow).created_at ?? '—'
            }}</template>
        </Column>

        <Column :header="trans('activityLog.table.actor')">
            <template #body="{ data }">{{
                actorLabel(data as ActivityLogRow)
            }}</template>
        </Column>

        <Column :header="trans('activityLog.table.employee')">
            <template #body="{ data }">{{
                employeeLabel(data as ActivityLogRow)
            }}</template>
        </Column>

        <Column field="task" :header="trans('activityLog.table.task')" />

        <Column
            field="ip_address"
            :header="trans('activityLog.table.ipAddress')"
            style="width: 10rem"
        >
            <template #body="{ data }">{{
                (data as ActivityLogRow).ip_address ?? '—'
            }}</template>
        </Column>
    </DataTable>
</template>
