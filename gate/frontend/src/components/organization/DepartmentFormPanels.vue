<template>
  <VueSidePanel
    :model-value="createOpen"
    lock-scroll
    hide-close-btn
    :width="panelWidth"
    @update:model-value="$emit('update:createOpen', $event)"
    @closed="$emit('reset-create')"
  >
    <div v-if="createOpen" class="flex h-full flex-col bg-white" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="$emit('create')">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">إضافة وحدة</h2>
              <p class="mt-1 text-sm text-slate-500">إنشاء وحدة فرعية وربط القواعد</p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="$emit('update:createOpen', false)">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                الوحدة الأم
              </label>
              <TreeSelect
                v-if="createOpen"
                :model-value="createForm.parent_id_tree"
                :options="parentDepartmentOptions"
                append-to="body"
                placeholder="اختر الوحدة الأم"
                show-clear
                filter
                filter-mode="lenient"
                filter-placeholder="ابحث في الوحدات..."
                class="dept-treeselect w-full"
                @update:model-value="onCreateParentChange"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                الاسم بالإنجليزية <span class="text-red-500">*</span>
              </label>
              <input v-model="createForm.name_en" type="text" placeholder="Unit name" dir="ltr" :class="inputClass('name_en')" @input="clearError('name_en')" />
              <p v-if="validationErrors.name_en" class="mt-1 text-xs text-red-500">{{ validationErrors.name_en }}</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
              <input v-model="createForm.name_ar" type="text" placeholder="اسم الوحدة" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">القواعد المرتبطة</label>
              <div v-if="bases.length === 0" class="text-sm text-slate-500">لا توجد قواعد متاحة.</div>
              <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  v-for="base in bases"
                  :key="`create-base-${base.id}`"
                  class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Checkbox v-model="createForm.selectedBases" :input-id="`create-base-${base.id}`" name="create-bases" :value="base.id" />
                  <span>{{ base.name_ar || base.name_en }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="$emit('update:createOpen', false)">
              إلغاء
            </button>
            <button type="submit" :disabled="isSubmitting" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              <i v-if="isSubmitting" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
              {{ isSubmitting ? 'جاري الحفظ…' : 'حفظ' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </VueSidePanel>

  <VueSidePanel
    :model-value="editOpen"
    lock-scroll
    hide-close-btn
    :width="panelWidth"
    @update:model-value="$emit('update:editOpen', $event)"
  >
    <div v-if="editOpen" class="flex h-full flex-col bg-white" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="$emit('update')">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">تعديل وحدة</h2>
              <p class="mt-1 text-sm text-slate-500">تحديث بيانات الوحدة والقواعد المرتبطة</p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="$emit('update:editOpen', false)">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                الوحدة الأم
              </label>
              <TreeSelect
                v-if="editOpen && editForm.id"
                :model-value="editForm.parent_id_tree"
                :options="editParentDepartmentOptions"
                append-to="body"
                placeholder="اختر الوحدة الأم"
                show-clear
                filter
                filter-mode="lenient"
                filter-placeholder="ابحث في الوحدات..."
                class="dept-treeselect w-full"
                @update:model-value="onEditParentChange"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالإنجليزية <span class="text-red-500">*</span></label>
              <input v-model="editForm.name_en" type="text" dir="ltr" :class="inputClass('name_en')" @input="clearError('name_en')" />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
              <input v-model="editForm.name_ar" type="text" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">القواعد المرتبطة</label>
              <div v-if="bases.length === 0" class="text-sm text-slate-500">لا توجد قواعد متاحة.</div>
              <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  v-for="base in bases"
                  :key="`edit-base-${base.id}`"
                  class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Checkbox v-model="editForm.selectedBases" :input-id="`edit-base-${base.id}`" name="edit-bases" :value="base.id" />
                  <span>{{ base.name_ar || base.name_en }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="$emit('update:editOpen', false)">
              إلغاء
            </button>
            <button type="submit" :disabled="isSubmitting" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              <i v-if="isSubmitting" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
              {{ isSubmitting ? 'جاري الحفظ…' : 'تحديث' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </VueSidePanel>
</template>

<script>
import Checkbox from 'primevue/checkbox';
import TreeSelect from 'primevue/treeselect';
import { extractDeptKey } from '../../lib/departmentTree';

export default {
  name: 'DepartmentFormPanels',
  components: { Checkbox, TreeSelect },
  props: {
    createOpen: { type: Boolean, required: true },
    editOpen: { type: Boolean, required: true },
    panelWidth: { type: String, required: true },
    createForm: { type: Object, required: true },
    editForm: { type: Object, required: true },
    bases: { type: Array, default: () => [] },
    parentDepartmentOptions: { type: Array, default: () => [] },
    editParentDepartmentOptions: { type: Array, default: () => [] },
    validationErrors: { type: Object, required: true },
    isSubmitting: { type: Boolean, default: false },
    inputClass: { type: Function, required: true },
    clearError: { type: Function, required: true },
  },
  emits: [
    'update:createOpen',
    'update:editOpen',
    'reset-create',
    'create',
    'update',
  ],
  methods: {
    onCreateParentChange(value) {
      this.createForm.parent_id_tree = value;
      this.createForm.parent_id = Number(extractDeptKey(value) || 0);
    },
    onEditParentChange(value) {
      this.editForm.parent_id_tree = value;
      this.editForm.parent_id = Number(extractDeptKey(value) || 0);
    },
  },
};
</script>

<style scoped>
.dept-treeselect :deep(.p-treeselect) {
  width: 100%;
  border-radius: 0.5rem;
  border-color: #e2e8f0;
}
</style>
