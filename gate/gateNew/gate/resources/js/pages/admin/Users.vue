<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { UserPlus } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import AppButton from '@/components/AppButton.vue';
import PageContainer from '@/components/PageContainer.vue';
import UserDetailPanel from '@/components/users/UserDetailPanel.vue';
import UserFiltersBar from '@/components/users/UserFiltersBar.vue';
import UserTable from '@/components/users/UserTable.vue';
import { useUsersPage } from '@/composables/useUsersPage';
import AppLayout from '@/layouts/AppLayout.vue';
import { canWriteResource } from '@/lib/auth-roles';

defineOptions({ layout: AppLayout });

const {
    users,
    bases,
    roleOptions,
    departmentOptions,
    superAdminCount,
    currentUser,
    pageTitle,
    search,
    militaryNumber,
    roleFilter,
    ssoStatusFilter,
    departmentFilterTree,
    onDepartmentFilterChange,
    resetFilters,
    onDataTableChange,
    isOpenedCreate,
    isOpenedEdit,
    createForm,
    editForm,
    createParentTree,
    editParentTree,
    isDepartmentRequired,
    isEditingSelf,
    isTargetLastSuperAdmin,
    onCreateParentChange,
    onEditParentChange,
    openCreatePanel,
    submitCreate,
    openEditPanel,
    submitEdit,
    editingUser,
    deleteUser,
} = useUsersPage();

const canManage = canWriteResource('users', currentUser.value);
const panelWidth = '600px';
</script>

<template>
    <Head :title="pageTitle" />

    <PageContainer :title="pageTitle">
        <template v-if="canManage" #actions>
            <AppButton @click="openCreatePanel">
                <UserPlus :size="16" />
                {{ trans('users.addUser') }}
            </AppButton>
        </template>

        <UserFiltersBar
            v-model:search="search"
            v-model:military-number="militaryNumber"
            v-model:role-filter="roleFilter"
            v-model:sso-status-filter="ssoStatusFilter"
            :role-options="roleOptions"
            :department-options="departmentOptions"
            :department-tree="departmentFilterTree"
            @reset-filter="resetFilters"
            @department-change="onDepartmentFilterChange"
        />

        <UserTable
            :users="users"
            :current-user-id="currentUser?.id ?? null"
            :super-admin-count="superAdminCount"
            @change="onDataTableChange"
            @row-click="openEditPanel"
            @delete-user="deleteUser"
        />

        <UserDetailPanel
            :create-open="isOpenedCreate"
            :edit-open="isOpenedEdit"
            :panel-width="panelWidth"
            :create-form="createForm"
            :edit-form="editForm"
            :create-parent-tree="createParentTree"
            :edit-parent-tree="editParentTree"
            :department-options="departmentOptions"
            :bases="bases"
            :role-options="roleOptions"
            :is-department-required="isDepartmentRequired"
            :is-editing-self="isEditingSelf"
            :is-target-last-super-admin="isTargetLastSuperAdmin"
            :editing-user="editingUser"
            @update:create-open="isOpenedCreate = $event"
            @update:edit-open="isOpenedEdit = $event"
            @create-parent-change="onCreateParentChange"
            @edit-parent-change="onEditParentChange"
            @submit-create="submitCreate"
            @submit-edit="submitEdit"
        />
    </PageContainer>
</template>
