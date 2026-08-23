<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { Plus, Search } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppFiltersBar from '@/components/AppFiltersBar.vue';
import CompanyFormPanel from '@/components/companies/CompanyFormPanel.vue';
import CompanyTable from '@/components/companies/CompanyTable.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useCompaniesPage } from '@/composables/useCompaniesPage';
import AppLayout from '@/layouts/AppLayout.vue';

defineOptions({ layout: AppLayout });

const {
    companies,
    bases,
    pageTitle,
    canManage,
    search,
    resetFilters,
    onDataTableChange,
    parentDepartmentOptions,
    isOpenedCreate,
    isOpenedEdit,
    createForm,
    editForm,
    createParentTree,
    editParentTree,
    panelWidth,
    onCreateParentChange,
    onEditParentChange,
    openCreatePanel,
    submitCreate,
    openEditPanel,
    submitEdit,
    deleteCompany,
    openCompany,
} = useCompaniesPage();
</script>

<template>
    <Head :title="pageTitle" />

    <PageContainer
        :title="pageTitle"
        :description="trans('companies.page.description')"
    >
        <template v-if="canManage" #actions>
            <AppButton @click="openCreatePanel">
                <Plus :size="16" />
                {{ trans('companies.addCompany') }}
            </AppButton>
        </template>

        <AppCard padding="md" class="mb-4">
            <AppFiltersBar density="dense">
                <InputText
                    v-model="search"
                    :placeholder="trans('companies.filters.search')"
                    fluid
                />
                <template #actions>
                    <AppButton
                        text
                        size="small"
                        severity="secondary"
                        @click="resetFilters"
                    >
                        <Search :size="14" />
                        {{ trans('companies.filters.reset') }}
                    </AppButton>
                </template>
            </AppFiltersBar>
        </AppCard>

        <CompanyTable
            :companies="companies"
            :can-manage="canManage"
            @change="onDataTableChange"
            @row-click="openCompany"
            @edit="openEditPanel"
            @delete="deleteCompany"
        />

        <CompanyFormPanel
            :create-open="isOpenedCreate"
            :edit-open="isOpenedEdit"
            :panel-width="panelWidth"
            :create-form="createForm"
            :edit-form="editForm"
            :create-parent-tree="createParentTree"
            :edit-parent-tree="editParentTree"
            :bases="bases"
            :parent-department-options="parentDepartmentOptions"
            @update:create-open="isOpenedCreate = $event"
            @update:edit-open="isOpenedEdit = $event"
            @create-parent-change="onCreateParentChange"
            @edit-parent-change="onEditParentChange"
            @submit-create="submitCreate"
            @submit-edit="submitEdit"
        />
    </PageContainer>
</template>
