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

export function emptyValidation() {
  return {
    name_en: '',
  };
}

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
    formDataDep: {
      name_en: '',
      name_ar: '',
      parent_id: depId,
      parent_id_tree: null,
      selectedBases: [],
    },
    formEditDep: {
      name_en: '',
      name_ar: '',
      id: 0,
      parent_id: 0,
      parent_id_tree: null,
      selectedBases: [],
    },
    validationErrors: emptyValidation(),
    isOpenedC: false,
    isOpenedE: false,
  };
}

function buildDepartmentPayload(form) {
  const payload = {
    name_en: form.name_en || '',
    name_ar: form.name_ar || '',
    parent_id: Number(form.parent_id || 0),
    selectedBases: Array.isArray(form.selectedBases) ? [...form.selectedBases] : [],
  };

  if (form.id) {
    payload.id = form.id;
  }

  return payload;
}

export function createDepartmentPageActions(state, { toast, confirm }) {
  function inputClass(field) {
    return [
      'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/20',
      state.validationErrors[field] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-brand',
    ];
  }

  function clearValidationError(field) {
    state.validationErrors[field] = '';
  }

  function resetCreateForm() {
    state.formDataDep = {
      name_en: '',
      name_ar: '',
      parent_id: state.depId,
      parent_id_tree: null,
      selectedBases: [],
    };
    state.validationErrors = emptyValidation();
  }

  async function openCreatePanel(parentId) {
    state.isOpenedE = false;
    resetCreateForm();
    const resolvedParentId = parentId ?? state.depId ?? 0;
    state.formDataDep.parent_id = Number(resolvedParentId || 0);
    state.formDataDep.parent_id_tree = toTreeSelectValue(resolvedParentId);
    state.isOpenedC = true;
  }

  function validateCreateForm() {
    let isValid = true;
    state.validationErrors = emptyValidation();

    if (!state.formDataDep.name_en.trim()) {
      state.validationErrors.name_en = 'الاسم بالإنجليزية مطلوب';
      isValid = false;
    }

    return isValid;
  }

  function validateEditForm() {
    let isValid = true;
    state.validationErrors = emptyValidation();

    if (!state.formEditDep.name_en?.trim()) {
      state.validationErrors.name_en = 'الاسم بالإنجليزية مطلوب';
      isValid = false;
    }

    return isValid;
  }

  async function addDepartment() {
    if (!validateCreateForm()) {
      toast.add({ severity: 'error', summary: 'خطأ في التحقق', detail: 'يرجى مراجعة الحقول المطلوبة', life: 3000 });
      return;
    }

    state.isSubmitting = true;
    try {
      await createDepartment(buildDepartmentPayload(state.formDataDep));
      await fetchData();
      state.isOpenedC = false;
      toast.add({ severity: 'success', summary: 'تم بنجاح', detail: 'تم إنشاء الوحدة', life: 3000 });
    } catch (error) {
      console.error('API error:', error);
      toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر إنشاء الوحدة', life: 3000 });
    } finally {
      state.isSubmitting = false;
    }
  }

  async function editDep(id) {
    const departmentId = Number(id);
    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      toast.add({ severity: 'error', summary: 'خطأ', detail: 'معرّف الوحدة غير صالح', life: 3000 });
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

      state.formEditDep = {
        id: data.id,
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        parent_id: Number(data.parent_id || 0),
        parent_id_tree: toTreeSelectValue(data.parent_id),
        selectedBases: (basesResponse.data || []).map((base) => base.id),
      };
      state.validationErrors = emptyValidation();
      state.isOpenedE = true;
    } catch (error) {
      console.error('Error fetching department:', error);
      toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل بيانات الوحدة', life: 3000 });
    }
  }

  async function editDepartment() {
    if (!validateEditForm()) {
      toast.add({ severity: 'error', summary: 'خطأ في التحقق', detail: 'يرجى مراجعة الحقول المطلوبة', life: 3000 });
      return;
    }

    state.isSubmitting = true;
    try {
      await updateDepartment(buildDepartmentPayload(state.formEditDep));
      await fetchData();
      state.isOpenedE = false;
      toast.add({ severity: 'success', summary: 'تم بنجاح', detail: 'تم تحديث الوحدة', life: 3000 });
    } catch (error) {
      console.error('API error:', error);
      toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحديث الوحدة', life: 3000 });
    } finally {
      state.isSubmitting = false;
    }
  }

  function deleteDepartmentById(id) {
    const departmentId = Number(id);
    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      toast.add({ severity: 'error', summary: 'خطأ', detail: 'معرّف الوحدة غير صالح', life: 3000 });
      return;
    }

    if (!confirm?.require) {
      return;
    }

    confirm.require({
      message: 'Do you want to delete this record?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      acceptClass: 'p-button-danger',
      accept: async () => {
        try {
          await deleteDepartment({ id: departmentId });
          await fetchData();
          toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfully', life: 3000 });
        } catch (error) {
          console.error('API error:', error);
          toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر حذف الوحدة', life: 3000 });
        }
      },
      reject: () => { },
    });
  }

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
      toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل الوحدات', life: 3000 });
    } finally {
      state.isLoading = false;
    }
  }

  return {
    inputClass,
    clearValidationError,
    resetCreateForm,
    openCreatePanel,
    addDepartment,
    editDep,
    editDepartment,
    deleteDepartmentById,
    fetchData,
  };
}
