<template>
  <PageContainer :title="pageTitle" :description="description || pageDescription || treeDescription" class="dept-page">
    <DepartmentTreePanel
      :departments="departments"
      :loading="isLoading"
      :can-delete="canDelete"
      :can-manage="canManage"
      :empty-message="emptyMessage"
      @create-child="openCreatePanel"
      @edit="editDep"
      @delete="deleteDepartmentById"
    />

    <DepartmentFormPanels
      :create-open="isOpenedC"
      :edit-open="isOpenedE"
      :panel-width="panelWidth"
      :create-form="createForm"
      :edit-form="editForm"
      :bases="bases"
      :parent-department-options="parentDepartmentOptions"
      :edit-parent-department-options="editParentDepartmentOptions"
      :is-submitting="isSubmitting"
      @update:create-open="isOpenedC = $event"
      @update:edit-open="isOpenedE = $event"
    />
  </PageContainer>
</template>

<script>
import PageContainer from '../ui/PageContainer.vue';
import DepartmentTreePanel from './DepartmentTreePanel.vue';
import DepartmentFormPanels from './DepartmentFormPanels.vue';
import { useDepartmentPage } from '../../composables/useDepartmentPage';

export default {
  name: 'DepartmentPageShell',
  components: {
    PageContainer,
    DepartmentTreePanel,
    DepartmentFormPanels,
  },
  props: {
    description: {
      type: String,
      default: '',
    },
    emptyMessage: {
      type: String,
      default: '',
    },
  },
  setup() {
    return useDepartmentPage();
  },
};
</script>

<style scoped>
.dept-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 4rem);
}

.dept-page :deep(.dept-tree-panel) {
  flex: 1;
  min-height: 0;
}
</style>
