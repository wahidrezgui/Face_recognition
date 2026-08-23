import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, toRefs } from 'vue';
import { useForm } from '@tanstack/vue-form';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { countTreeNodes, createDepartmentPageActions, createDepartmentPageState } from '../lib/organization/departmentPageCore';
import { emptyDepartmentFormValues } from '../lib/organization/departmentFormSchema';
import { canWriteResource, getResourceScope, isGlobalScope } from '../lib/auth-roles';
import {
  collectDescendantDeptIds,
  filterDepartmentTreeExcluding,
  normalizeDepartmentTree,
} from '../lib/departmentTree';

export function useDepartmentPage() {
  const toast = useToast();
  const { t, locale } = useI18n();
  const instance = getCurrentInstance();
  const dataScope = getResourceScope('departments');
  const state = reactive(createDepartmentPageState(dataScope));

  const createForm = useForm({
    defaultValues: emptyDepartmentFormValues(state.depId),
    onSubmit: async ({ value }) => actions.submitCreate(value),
  });

  const editForm = useForm({
    defaultValues: emptyDepartmentFormValues(state.depId),
    onSubmit: async ({ value }) => actions.submitEdit(value),
  });

  const actions = createDepartmentPageActions(state, {
    toast,
    confirm: instance?.proxy?.$confirm,
    createForm,
    editForm,
    t,
  });

  onMounted(() => {
    actions.fetchData();
  });

  onBeforeUnmount(() => {
    state.isOpenedC = false;
    state.isOpenedE = false;
  });

  const panelWidth = computed(() => (window.innerWidth < 640 ? '100%' : '600px'));
  const parentDepartmentOptions = computed(() => normalizeDepartmentTree(state.departments || [], locale.value));
  const editingDepartmentId = editForm.useSelector((formState) => formState.values.id);
  const editParentDepartmentOptions = computed(() => {
    const normalized = parentDepartmentOptions.value;
    const departmentId = editingDepartmentId.value;

    if (!departmentId) {
      return normalized;
    }

    const excluded = collectDescendantDeptIds(normalized, departmentId);
    return filterDepartmentTreeExcluding(normalized, excluded);
  });

  const pageTitle = computed(() => (
    isGlobalScope('departments') ? t('departments.page.titleGlobal') : t('departments.page.titleScoped')
  ));

  const pageDescription = computed(() => {
    if (isGlobalScope('departments')) {
      return t('departments.page.descriptionGlobal');
    }
    if (dataScope === 'self') {
      return t('departments.page.descriptionSelf');
    }
    return t('departments.page.descriptionScoped');
  });

  const treeDescription = computed(() => {
    const count = countTreeNodes(state.departments);
    if (state.scope === 'global') {
      return count ? t('departments.tree.countGlobal', { count }) : t('departments.tree.emptyGlobal');
    }
    if (state.scope === 'self') {
      return count ? t('departments.tree.countSelf', { count }) : t('departments.tree.emptySelfNone');
    }
    return count ? t('departments.tree.countScoped', { count }) : t('departments.tree.emptyScoped');
  });

  const canDelete = computed(() => state.scope === 'global' && canWriteResource('departments'));
  const canManage = computed(() => canWriteResource('departments'));

  return {
    ...toRefs(state),
    createForm,
    editForm,
    panelWidth,
    parentDepartmentOptions,
    editParentDepartmentOptions,
    pageTitle,
    pageDescription,
    treeDescription,
    canDelete,
    canManage,
    ...actions,
  };
}
