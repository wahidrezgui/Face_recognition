<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import DepartmentFormPanel from '@/components/organization/DepartmentFormPanel.vue';
import DepartmentTreePanel from '@/components/organization/DepartmentTreePanel.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useDepartmentPage } from '@/composables/useDepartmentPage';
import AppLayout from '@/layouts/AppLayout.vue';

defineOptions({ layout: AppLayout });

const {
    departments,
    bases,
    createForm,
    editForm,
    createParentTree,
    editParentTree,
    isOpenedC,
    isOpenedE,
    panelWidth,
    parentDepartmentOptions,
    editParentDepartmentOptions,
    pageTitle,
    pageDescription,
    treeDescription,
    canDelete,
    canManage,
    onCreateParentChange,
    onEditParentChange,
    openCreatePanel,
    submitCreate,
    editDep,
    submitEdit,
    deleteDepartmentById,
} = useDepartmentPage();
</script>

<template>
    <Head :title="pageTitle" />

    <PageContainer
        :title="pageTitle"
        :description="pageDescription || treeDescription"
        class="flex min-h-[calc(100vh-4rem)] flex-col"
    >
        <DepartmentTreePanel
            :departments="departments"
            :can-delete="canDelete"
            :can-manage="canManage"
            class="min-h-0 flex-1"
            @create-child="openCreatePanel"
            @edit="editDep"
            @delete="deleteDepartmentById"
        />

        <DepartmentFormPanel
            :create-open="isOpenedC"
            :edit-open="isOpenedE"
            :panel-width="panelWidth"
            :create-form="createForm"
            :edit-form="editForm"
            :create-parent-tree="createParentTree"
            :edit-parent-tree="editParentTree"
            :bases="bases"
            :parent-department-options="parentDepartmentOptions"
            :edit-parent-department-options="editParentDepartmentOptions"
            @update:create-open="isOpenedC = $event"
            @update:edit-open="isOpenedE = $event"
            @create-parent-change="onCreateParentChange"
            @edit-parent-change="onEditParentChange"
            @submit-create="submitCreate"
            @submit-edit="submitEdit"
        />
    </PageContainer>
</template>
