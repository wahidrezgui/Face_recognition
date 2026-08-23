import {
  createDepartment,
  deleteDepartment,
  fetchAllDepartments,
  fetchBases,
  fetchDepartment,
  fetchDepartmentTree,
  updateDepartment,
} from '../../api/organization';
import { nextTick } from 'vue';
import {
  toTreeSelectValue,
} from '../departmentTree';
import { emptyDepartmentFormValues } from './departmentFormSchema';
import {
  findDepartmentNodeById,
  removeDepartmentNodeById,
  insertDepartmentNodeUnderParentId,
  updateDepartmentNodeFields,
} from './departmentTreeHelpers';

export { countTreeNodes } from './departmentTreeHelpers';

export function createDepartmentPageState(scope) {
  const depId = localStorage.getItem('dep_id');

  return {
    scope,
    isLoading: false,
    isSubmitting: false,
    departments: [],
    bases: [],
    depId,
    isOpenedC: false,
    isOpenedE: false,
  };
}

function buildDepartmentPayload(values) {
  const payload = {
    name_en: values.name_en || '',
    name_ar: values.name_ar || '',
    parent_id: Number(values.parent_id || 0),
    selectedBases: Array.isArray(values.selectedBases) ? [...values.selectedBases] : [],
  };

  if (values.id) {
    payload.id = values.id;
  }

  return payload;
}

function resolveSelectedBases(bases, selectedIds) {
  const idSet = new Set((selectedIds || []).map(Number));
  return (bases || []).filter((base) => idSet.has(Number(base.id)));
}

function buildOptimisticDepartmentNode(id, payload, bases) {
  return {
    id,
    key: id,
    label: payload.name_ar || payload.name_en || '',
    name_ar: payload.name_ar || '',
    name_en: payload.name_en || '',
    parent_id: payload.parent_id,
    is_company: 0,
    type: 'department',
    icon: 'pi pi-server',
    bases: resolveSelectedBases(bases, payload.selectedBases),
  };
}

export function createDepartmentPageActions(state, { toast, confirm, createForm, editForm, t }) {
  async function fetchData() {
    state.isLoading = true;

    try {
      if (state.scope === 'global') {
        const [treeResponse, basesResponse] = await Promise.all([
          fetchAllDepartments(),
          fetchBases(),
        ]);
        state.departments = treeResponse.data.departments || [];
        state.bases = basesResponse.data || [];
      } else {
        if (!state.depId) {
          state.departments = [];
          state.bases = [];
          return;
        }

        const [treeResponse, basesResponse] = await Promise.all([
          fetchDepartmentTree(state.depId),
          fetchBases({ depId: state.depId }),
        ]);
        state.departments = treeResponse.data.departments || [];
        state.bases = basesResponse.data || [];
      }
    } catch (error) {
      console.error(error);
      toast.add({ severity: 'error', summary: t('departments.toast.errorTitle'), detail: t('departments.toast.loadListFailed'), life: 3000 });
    } finally {
      state.isLoading = false;
    }
  }

  async function openCreatePanel(parentId) {
    state.isOpenedE = false;
    const resolvedParentId = parentId ?? state.depId ?? 0;
    createForm.reset({
      ...emptyDepartmentFormValues(state.depId),
      parent_id: Number(resolvedParentId || 0),
      parent_id_tree: toTreeSelectValue(resolvedParentId),
    });
    state.isOpenedC = true;
  }

  async function submitCreate(values) {
    state.isSubmitting = true;
    try {
      const payload = buildDepartmentPayload(values);
      const response = await createDepartment(payload);
      const newId = response?.data?.id;

      if (newId == null) {
        // Defensive: backend contract broke (no id) — fall back to a full resync.
        await fetchData();
      } else {
        const newNode = buildOptimisticDepartmentNode(newId, payload, state.bases);
        const parentId = payload.parent_id;

        if (parentId === 0) {
          if (state.scope === 'global') {
            state.departments.push(newNode);
          }
          // else: created outside the currently displayed scoped subtree — nothing local to patch.
        } else {
          const inserted = insertDepartmentNodeUnderParentId(state.departments, parentId, newNode);
          if (!inserted) {
            console.warn('New department parent not found locally; refetching tree.', parentId);
            await fetchData();
          }
        }
      }

      state.isOpenedC = false;
      toast.add({ severity: 'success', summary: t('departments.toast.successTitle'), detail: t('departments.toast.createSuccess'), life: 3000 });
    } catch (error) {
      console.error('API error:', error);
      toast.add({ severity: 'error', summary: t('departments.toast.errorTitle'), detail: t('departments.toast.createFailed'), life: 3000 });
    } finally {
      state.isSubmitting = false;
    }
  }

  async function editDep(id) {
    const departmentId = Number(id);
    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      toast.add({ severity: 'error', summary: t('departments.toast.errorTitle'), detail: t('departments.toast.invalidId'), life: 3000 });
      return;
    }

    try {
      state.isOpenedC = false;
      state.isOpenedE = false;
      await nextTick();

      const [deptResponse, basesResponse] = await Promise.all([
        fetchDepartment(departmentId),
        fetchBases({ depId: departmentId }),
      ]);
      const data = deptResponse.data;

      editForm.reset({
        id: data.id,
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        parent_id: Number(data.parent_id || 0),
        parent_id_tree: toTreeSelectValue(data.parent_id),
        selectedBases: (basesResponse.data || []).map((base) => base.id),
      });
      state.isOpenedE = true;
    } catch (error) {
      console.error('Error fetching department:', error);
      toast.add({ severity: 'error', summary: t('departments.toast.errorTitle'), detail: t('departments.toast.loadOneFailed'), life: 3000 });
    }
  }

  async function submitEdit(values) {
    state.isSubmitting = true;
    try {
      const payload = buildDepartmentPayload(values);
      await updateDepartment(payload);

      const existingNode = findDepartmentNodeById(state.departments, payload.id);
      const fieldPatch = {
        name_ar: payload.name_ar,
        name_en: payload.name_en,
        label: payload.name_ar || payload.name_en || '',
        bases: resolveSelectedBases(state.bases, payload.selectedBases),
      };

      if (!existingNode) {
        // Defensive: node not found locally (stale state) — full resync.
        await fetchData();
      } else if (Number(existingNode.parent_id) === payload.parent_id) {
        updateDepartmentNodeFields(state.departments, payload.id, { ...fieldPatch, parent_id: payload.parent_id });
      } else {
        const removedNode = removeDepartmentNodeById(state.departments, payload.id);
        if (!removedNode) {
          await fetchData();
        } else {
          Object.assign(removedNode, fieldPatch, { parent_id: payload.parent_id });

          if (payload.parent_id === 0) {
            if (state.scope === 'global') {
              state.departments.push(removedNode);
            }
            // else: moved outside the currently displayed scoped subtree — drop it locally.
          } else {
            const inserted = insertDepartmentNodeUnderParentId(state.departments, payload.parent_id, removedNode);
            if (!inserted) {
              console.warn('New parent not found locally after edit; refetching tree.', payload.parent_id);
              await fetchData();
            }
          }
        }
      }

      state.isOpenedE = false;
      toast.add({ severity: 'success', summary: t('departments.toast.successTitle'), detail: t('departments.toast.updateSuccess'), life: 3000 });
    } catch (error) {
      console.error('API error:', error);
      toast.add({ severity: 'error', summary: t('departments.toast.errorTitle'), detail: t('departments.toast.updateFailed'), life: 3000 });
    } finally {
      state.isSubmitting = false;
    }
  }

  function deleteDepartmentById(id) {
    const departmentId = Number(id);
    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      toast.add({ severity: 'error', summary: t('departments.toast.errorTitle'), detail: t('departments.toast.invalidId'), life: 3000 });
      return;
    }

    if (!confirm?.require) {
      return;
    }

    confirm.require({
      message: t('departments.toast.deleteConfirmMessage'),
      header: t('departments.toast.deleteConfirmHeader'),
      icon: 'pi pi-info-circle',
      acceptClass: 'p-button-danger',
      accept: async () => {
        try {
          await deleteDepartment({ id: departmentId });
          const removed = removeDepartmentNodeById(state.departments, departmentId);
          if (!removed) {
            console.warn('Deleted department not found locally; refetching tree.', departmentId);
            await fetchData();
          }
          toast.add({ severity: 'info', summary: t('departments.toast.deleteConfirmedTitle'), detail: t('departments.toast.deleteSuccess'), life: 3000 });
        } catch (error) {
          console.error('API error:', error);
          toast.add({ severity: 'error', summary: t('departments.toast.errorTitle'), detail: t('departments.toast.deleteFailed'), life: 3000 });
        }
      },
      reject: () => { },
    });
  }

  return {
    fetchData,
    openCreatePanel,
    submitCreate,
    editDep,
    submitEdit,
    deleteDepartmentById,
  };
}
