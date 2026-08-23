<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { ArrowLeft, UserPlus } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import { index as companiesIndex } from '@/actions/App/Http/Controllers/Inertia/CompanyController';
import AppButton from '@/components/AppButton.vue';
import BulkAccessCardPrintDialog from '@/components/employees/BulkAccessCardPrintDialog.vue';
import EmployeeDetailPanel from '@/components/employees/EmployeeDetailPanel.vue';
import EmployeeFiltersBar from '@/components/employees/EmployeeFiltersBar.vue';
import EmployeeTable from '@/components/employees/EmployeeTable.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useEmployeesPage } from '@/composables/useEmployeesPage';
import AppLayout from '@/layouts/AppLayout.vue';

defineOptions({ layout: AppLayout });

const {
    employees,
    statusCards,
    expiredCount,
    bases,
    ranks,
    nationalities,
    genders,
    lockedCompany,
    lockedDepartmentLabel,
    canManage,
    pageTitle,
    militaryNumber,
    fullnameAr,
    plateNumber,
    baseId,
    zoneId,
    statusFilter,
    nationalityId,
    housing,
    expiredOnly,
    deactivatedOnly,
    departmentFilterTree,
    onDepartmentFilterChange,
    zoneOptions,
    rankGroups,
    parentDepartmentOptions,
    resetFilters,
    onDataTableChange,
    selectedRows,
    clearSelection,
    bulkActions,
    isOpenedCreate,
    isOpenedEdit,
    createForm,
    editForm,
    createParentTree,
    editParentTree,
    onCreateParentChange,
    onEditParentChange,
    openCreatePanel,
    submitCreate,
    openEditPanel,
    submitEdit,
    editingEmployee,
    employeeMovements,
    movementsLoading,
    fetchMovements,
    accessCard,
    accessCardLoading,
    accessCardBaseId,
    fetchAccessCard,
    recordPrintAndMarkPrinted,
    returnCard,
    newCarPlateNumber,
    newCarDescription,
    addCar,
    updateCarDescription,
    deleteCar,
    deleteSelected,
    setStatusForSelected,
    setActiveForSelected,
    bulkPrintDialogVisible,
    bulkPrintCards,
    bulkPrintLoading,
    bulkPrintBaseId,
    openBulkPrintDialog,
    recordBulkPrintAndMarkPrinted,
} = useEmployeesPage();

const panelWidth = '720px';
</script>

<template>
    <Head :title="pageTitle" />

    <PageContainer :title="pageTitle">
        <template #actions>
            <Link v-if="lockedCompany" :href="companiesIndex.url()">
                <AppButton severity="secondary" outlined>
                    <ArrowLeft :size="16" />
                    {{ trans('companies.backToCompanies') }}
                </AppButton>
            </Link>
            <AppButton v-if="canManage" @click="openCreatePanel">
                <UserPlus :size="16" />
                {{ trans('employees.addEmployee') }}
            </AppButton>
        </template>

        <EmployeeFiltersBar
            v-model:military-number="militaryNumber"
            v-model:fullname-ar="fullnameAr"
            v-model:plate-number="plateNumber"
            v-model:base-id="baseId"
            v-model:zone-id="zoneId"
            v-model:status-filter="statusFilter"
            v-model:nationality-id="nationalityId"
            v-model:housing="housing"
            v-model:expired-only="expiredOnly"
            v-model:deactivated-only="deactivatedOnly"
            :status-cards="statusCards"
            :expired-count="expiredCount"
            :bases="bases"
            :zone-options="zoneOptions"
            :nationalities="nationalities"
            :department-options="parentDepartmentOptions"
            :department-tree="departmentFilterTree"
            :hide-department-filter="!!lockedCompany"
            :can-manage="canManage"
            :selected-count="selectedRows.length"
            :bulk-actions="bulkActions"
            @reset-filter="resetFilters"
            @clear-selection="clearSelection"
            @delete-selected="deleteSelected"
            @department-change="onDepartmentFilterChange"
            @approve="setStatusForSelected('approve', 1)"
            @unapprove="setStatusForSelected('unapprove', 0)"
            @collect="setStatusForSelected('collect', 3)"
            @print-access-cards="openBulkPrintDialog"
            @deactivate="setActiveForSelected(false)"
            @activate="setActiveForSelected(true)"
        />

        <EmployeeTable
            v-model:selection="selectedRows"
            :employees="employees"
            :can-manage="canManage"
            @change="onDataTableChange"
            @row-click="openEditPanel"
        />

        <EmployeeDetailPanel
            :create-open="isOpenedCreate"
            :edit-open="isOpenedEdit"
            :panel-width="panelWidth"
            :create-form="createForm"
            :edit-form="editForm"
            :create-parent-tree="createParentTree"
            :edit-parent-tree="editParentTree"
            :department-options="parentDepartmentOptions"
            :bases="bases"
            :ranks="ranks"
            :rank-groups="rankGroups"
            :nationalities="nationalities"
            :genders="genders"
            :editing-employee="editingEmployee"
            :employee-movements="employeeMovements"
            :movements-loading="movementsLoading"
            :access-card="accessCard"
            :access-card-loading="accessCardLoading"
            :can-manage="canManage"
            :locked-department-label="lockedDepartmentLabel"
            v-model:access-card-base-id="accessCardBaseId"
            v-model:new-car-plate-number="newCarPlateNumber"
            v-model:new-car-description="newCarDescription"
            @update:create-open="isOpenedCreate = $event"
            @update:edit-open="isOpenedEdit = $event"
            @create-parent-change="onCreateParentChange"
            @edit-parent-change="onEditParentChange"
            @submit-create="submitCreate"
            @submit-edit="submitEdit"
            @add-car="addCar"
            @update-car-description="updateCarDescription"
            @delete-car="deleteCar"
            @open-movements="fetchMovements"
            @open-access-card="fetchAccessCard"
            @printed="recordPrintAndMarkPrinted"
            @return-card="returnCard"
        />

        <BulkAccessCardPrintDialog
            v-model:visible="bulkPrintDialogVisible"
            v-model:base-id="bulkPrintBaseId"
            :cards="bulkPrintCards"
            :loading="bulkPrintLoading"
            :count="selectedRows.length"
            :bases="bases"
            @printed="recordBulkPrintAndMarkPrinted"
        />
    </PageContainer>
</template>
