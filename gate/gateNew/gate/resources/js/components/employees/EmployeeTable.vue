<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { useLocale } from '@/composables/useLocale';
import {
    EMPLOYEE_STATUS_SEVERITY,
    employeePhotoUrl,
    employeeStatusLabel,
} from '@/lib/employees/employeeFormUi';
import { nodeLabel } from '@/lib/organization/departmentTreeHelpers';
import type { Employee, PaginatedEmployees } from '@/types';

interface Props {
    employees: PaginatedEmployees;
    canManage: boolean;
}

defineProps<Props>();

const selection = defineModel<Employee[]>('selection', { required: true });

interface DataTableLazyEvent {
    first: number;
    rows: number;
    sortField?: string | ((item: unknown) => string) | null;
    sortOrder?: 1 | 0 | -1 | null;
}

const emit = defineEmits<{
    change: [event: DataTableLazyEvent];
    'row-click': [employee: Employee];
}>();

const { locale } = useLocale();
</script>

<template>
    <DataTable
        v-model:selection="selection"
        :value="employees.data"
        lazy
        paginator
        data-key="id"
        :rows="employees.per_page"
        :total-records="employees.total"
        :first="(employees.current_page - 1) * employees.per_page"
        :rows-per-page-options="[10, 25, 50, 100]"
        striped-rows
        removable-sort
        class="employees-table"
        @page="emit('change', $event)"
        @sort="emit('change', $event)"
        @row-click="emit('row-click', $event.data)"
    >
        <template #empty>
            <div
                class="py-10 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('employees.table.empty') }}
            </div>
        </template>

        <Column
            v-if="canManage"
            selection-mode="multiple"
            header-style="width: 3rem"
        />

        <Column :header="trans('employees.table.photo')" style="width: 4rem">
            <template #body="{ data }">
                <img
                    :src="employeePhotoUrl(data.photo)"
                    class="h-9 w-9 rounded-full object-cover"
                    alt=""
                />
            </template>
        </Column>

        <Column
            field="status"
            sortable
            :header="trans('employees.table.status')"
            style="width: 7rem"
        >
            <template #body="{ data }">
                <Tag
                    :severity="EMPLOYEE_STATUS_SEVERITY[data.status]"
                    :value="employeeStatusLabel(data.status)"
                />
            </template>
        </Column>
        <Column
            field="fullname_ar"
            sortable
            :header="trans('employees.table.name')"
        >
            <template #body="{ data }">{{
                locale === 'en'
                    ? data.fullname_en
                    : data.fullname_ar || data.fullname_en
            }}</template>
        </Column>

        <Column :header="trans('employees.table.rank')">
            <template #body="{ data }">{{
                locale === 'en' ? data.rank?.name_en : data.rank?.name_ar
            }}</template>
        </Column>

        <Column
            field="military_number"
            sortable
            :header="trans('employees.table.militaryNumber')"
        />

        <Column :header="trans('employees.table.nationality')">
            <template #body="{ data }">{{
                locale === 'en'
                    ? data.nationality?.name_en
                    : data.nationality?.name_ar
            }}</template>
        </Column>
        <Column :header="trans('employees.table.department')">
            <template #body="{ data }">{{
                data.department ? nodeLabel(data.department, locale) : '—'
            }}</template>
        </Column>

        <Column
            field="bloodtype"
            sortable
            :header="trans('employees.table.bloodtype')"
            style="width: 5rem"
        />

        <Column
            field="housing"
            sortable
            :header="trans('employees.table.housing')"
            style="width: 6rem"
        >
            <template #body="{ data }">
                <Tag
                    :severity="data.housing ? 'success' : 'secondary'"
                    :value="
                        data.housing ? trans('common.yes') : trans('common.no')
                    "
                />
            </template>
        </Column>

        <Column
            field="expiry_date"
            sortable
            :header="trans('employees.table.expiryDate')"
            style="width: 8rem"
        >
            <template #body="{ data }">{{
                data.expiry_date
                    ? new Date(data.expiry_date).toLocaleDateString(
                          locale === 'ar' ? 'ar-QA' : 'en-GB',
                      )
                    : '—'
            }}</template>
        </Column>
    </DataTable>
</template>

<style scoped>
.employees-table :deep(.p-datatable-tbody > tr) {
    cursor: pointer;
}
</style>
