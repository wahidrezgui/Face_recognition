import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, toRefs } from 'vue';
import { useToast } from 'primevue/usetoast';
import { countTreeNodes, createDepartmentPageActions, createDepartmentPageState } from '../lib/organization/departmentPageCore';
import { canWriteResource, getResourceScope, isGlobalScope } from '../lib/auth-roles';
import {
  collectDescendantDeptIds,
  filterDepartmentTreeExcluding,
  normalizeDepartmentTree,
} from '../lib/departmentTree';

export function useDepartmentPage() {
  const toast = useToast();
  const instance = getCurrentInstance();
  const dataScope = getResourceScope('departments');
  const state = reactive(createDepartmentPageState(dataScope));

  const actions = createDepartmentPageActions(state, {
    toast,
    confirm: instance?.proxy?.$confirm,
  });

  onMounted(() => {
    actions.fetchData();
  });

  onBeforeUnmount(() => {
    state.isOpenedC = false;
    state.isOpenedE = false;
  });

  const panelWidth = computed(() => (window.innerWidth < 640 ? '100%' : '600px'));
  const parentDepartmentOptions = computed(() => normalizeDepartmentTree(state.departments || []));
  const editParentDepartmentOptions = computed(() => {
    const normalized = parentDepartmentOptions.value;
    const departmentId = state.formEditDep?.id;

    if (!departmentId) {
      return normalized;
    }

    const excluded = collectDescendantDeptIds(normalized, departmentId);
    return filterDepartmentTreeExcluding(normalized, excluded);
  });

  const pageTitle = computed(() => (
    isGlobalScope('departments') ? 'إدارة الوحدات' : 'الوحدات'
  ));

  const pageDescription = computed(() => {
    if (isGlobalScope('departments')) {
      return 'عرض وإدارة جميع وحدات المنظمة';
    }
    if (dataScope === 'self') {
      return 'عرض وإدارة وحدتك فقط';
    }
    return 'عرض وإدارة وحدتك والوحدات الفرعية';
  });

  const treeDescription = computed(() => {
    const count = countTreeNodes(state.departments);
    if (state.scope === 'global') {
      return count ? `إدارة ${count} وحدة على مستوى المنظمة` : 'إدارة جميع وحدات المنظمة';
    }
    if (state.scope === 'self') {
      return count ? `وحدة واحدة (${count} عقدة)` : 'لا توجد وحدة مرتبطة بحسابك';
    }
    return count ? `إدارة ${count} وحدة ضمن هيكل وحدتك` : 'إدارة الوحدات الفرعية ضمن نطاق وحدتك';
  });

  const canDelete = computed(() => state.scope === 'global' && canWriteResource('departments'));
  const canManage = computed(() => canWriteResource('departments'));

  return {
    ...toRefs(state),
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
