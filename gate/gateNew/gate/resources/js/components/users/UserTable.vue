<script setup lang="ts">
import { Trash2 } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import AppButton from '@/components/AppButton.vue';
import { useLocale } from '@/composables/useLocale';
import { nodeLabel } from '@/lib/organization/departmentTreeHelpers';
import {
    SSO_STATUS_SEVERITY,
    ssoStatus,
    ssoStatusLabel,
} from '@/lib/users/userFormUi';
import type { ManagedUser, PaginatedUsers } from '@/types';

interface Props {
    users: PaginatedUsers;
    currentUserId: number | null;
    superAdminCount: number;
}

const props = defineProps<Props>();

interface DataTableLazyEvent {
    first: number;
    rows: number;
    sortField?: string | ((item: unknown) => string) | null;
    sortOrder?: 1 | 0 | -1 | null;
}

const emit = defineEmits<{
    change: [event: DataTableLazyEvent];
    'row-click': [user: ManagedUser];
    'delete-user': [user: ManagedUser];
}>();

const { locale } = useLocale();

function isLastSuperAdmin(user: ManagedUser): boolean {
    return (
        user.roles.some((r) => r.name === 'Super Admin') &&
        props.superAdminCount <= 1
    );
}

function isDeleteDisabled(user: ManagedUser): boolean {
    return user.id === props.currentUserId || isLastSuperAdmin(user);
}
</script>

<template>
    <DataTable
        :value="users.data"
        lazy
        paginator
        data-key="id"
        :rows="users.per_page"
        :total-records="users.total"
        :first="(users.current_page - 1) * users.per_page"
        :rows-per-page-options="[10, 25, 50, 100]"
        striped-rows
        removable-sort
        class="users-table"
        @page="emit('change', $event)"
        @sort="emit('change', $event)"
        @row-click="emit('row-click', $event.data)"
    >
        <template #empty>
            <div
                class="py-10 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('users.table.empty') }}
            </div>
        </template>

        <Column field="firstname" sortable :header="trans('users.table.name')">
            <template #body="{ data }">{{
                `${data.firstname} ${data.lastname}`
            }}</template>
        </Column>

        <Column
            field="username"
            sortable
            :header="trans('users.table.username')"
        />

        <Column
            field="military_number"
            sortable
            :header="trans('users.table.militaryNumber')"
        >
            <template #body="{ data }">{{
                data.military_number ?? '—'
            }}</template>
        </Column>

        <Column :header="trans('users.table.department')">
            <template #body="{ data }">{{
                data.department ? nodeLabel(data.department, locale) : '—'
            }}</template>
        </Column>

        <Column :header="trans('users.table.role')">
            <template #body="{ data }">
                <Tag :value="data.roles[0]?.name ?? '—'" />
            </template>
        </Column>

        <Column :header="trans('users.table.sso')">
            <template #body="{ data }">
                <Tag
                    :severity="SSO_STATUS_SEVERITY[ssoStatus(data)]"
                    :value="ssoStatusLabel(ssoStatus(data))"
                />
            </template>
        </Column>

        <Column :header="trans('users.table.online')" style="width: 6rem">
            <template #body="{ data }">
                <Tag
                    :severity="data.cnx ? 'success' : 'secondary'"
                    :value="
                        data.cnx
                            ? trans('users.badge.online')
                            : trans('users.badge.offline')
                    "
                />
            </template>
        </Column>

        <Column :header="trans('users.table.actions')" style="width: 4rem">
            <template #body="{ data }">
                <AppButton
                    text
                    rounded
                    size="small"
                    severity="danger"
                    :disabled="isDeleteDisabled(data)"
                    :aria-label="trans('users.table.delete')"
                    @click.stop="emit('delete-user', data)"
                >
                    <Trash2 :size="15" />
                </AppButton>
            </template>
        </Column>
    </DataTable>
</template>

<style scoped>
.users-table :deep(.p-datatable-tbody > tr) {
    cursor: pointer;
}
</style>
