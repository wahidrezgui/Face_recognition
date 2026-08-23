<template>
  <VueSidePanel
    :model-value="createOpen"
    lock-scroll
    hide-close-btn
    :width="panelWidth"
    @update:model-value="$emit('update:createOpen', $event)"
    @closed="createForm.reset()"
  >
    <div class="flex h-full flex-col bg-white" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="createForm.handleSubmit()">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">{{ t('departments.form.createTitle') }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ t('departments.form.createSubtitle') }}</p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="$emit('update:createOpen', false)">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-4">
            <component :is="createForm.Field" name="parent_id_tree">
              <template #default="{ field }">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    {{ t('departments.form.parentLabel') }}
                  </label>
                  <TreeSelect
                    :model-value="field.state.value"
                    :options="parentDepartmentOptions"
                    append-to="body"
                    :placeholder="t('departments.form.parentPlaceholder')"
                    show-clear
                    filter
                    filter-mode="lenient"
                    :filter-placeholder="t('departments.form.parentFilterPlaceholder')"
                    class="dept-treeselect w-full"
                    @update:model-value="onParentChange($event, field, createForm)"
                  />
                </div>
              </template>
            </component>

            <component :is="createForm.Field" name="name_en" :validators="{ onChange: nameEnValidator }">
              <template #default="{ field }">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    {{ t('departments.form.nameEnLabel') }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    :value="field.state.value"
                    type="text"
                    :placeholder="t('departments.form.nameEnPlaceholder')"
                    dir="ltr"
                    :class="inputClass(field.state.meta.errors.length > 0)"
                    @input="field.handleChange($event.target.value)"
                    @blur="field.handleBlur"
                  >
                  <p v-if="field.state.meta.errors.length" class="mt-1 text-xs text-red-500">{{ t('departments.validation.nameEnRequired') }}</p>
                </div>
              </template>
            </component>

            <component :is="createForm.Field" name="name_ar">
              <template #default="{ field }">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">{{ t('departments.form.nameArLabel') }}</label>
                  <input
                    :value="field.state.value"
                    type="text"
                    :placeholder="t('departments.form.nameArPlaceholder')"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    @input="field.handleChange($event.target.value)"
                  >
                </div>
              </template>
            </component>

            <component :is="createForm.Field" name="selectedBases">
              <template #default="{ field }">
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700">{{ t('departments.form.linkedBases') }}</label>
                  <div v-if="bases.length === 0" class="text-sm text-slate-500">{{ t('departments.form.noBases') }}</div>
                  <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label
                      v-for="base in bases"
                      :key="`create-base-${base.id}`"
                      class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <Checkbox :model-value="field.state.value" :input-id="`create-base-${base.id}`" name="create-bases" :value="base.id" @update:model-value="field.handleChange" />
                      <span>{{ base.name_ar || base.name_en }}</span>
                    </label>
                  </div>
                </div>
              </template>
            </component>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="$emit('update:createOpen', false)">
              {{ t('departments.form.cancel') }}
            </button>
            <button type="submit" :disabled="isSubmitting" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              <i v-if="isSubmitting" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
              {{ isSubmitting ? t('departments.form.saving') : t('departments.form.save') }}
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
    <div class="flex h-full flex-col bg-white" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="editForm.handleSubmit()">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">{{ t('departments.form.editTitle') }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ t('departments.form.editSubtitle') }}</p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="$emit('update:editOpen', false)">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-4">
            <component :is="editForm.Field" name="parent_id_tree">
              <template #default="{ field }">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    {{ t('departments.form.parentLabel') }}
                  </label>
                  <TreeSelect
                    :model-value="field.state.value"
                    :options="editParentDepartmentOptions"
                    append-to="body"
                    :placeholder="t('departments.form.parentPlaceholder')"
                    show-clear
                    filter
                    filter-mode="lenient"
                    :filter-placeholder="t('departments.form.parentFilterPlaceholder')"
                    class="dept-treeselect w-full"
                    @update:model-value="onParentChange($event, field, editForm)"
                  />
                </div>
              </template>
            </component>

            <component :is="editForm.Field" name="name_en" :validators="{ onChange: nameEnValidator }">
              <template #default="{ field }">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">{{ t('departments.form.nameEnLabel') }} <span class="text-red-500">*</span></label>
                  <input
                    :value="field.state.value"
                    type="text"
                    dir="ltr"
                    :class="inputClass(field.state.meta.errors.length > 0)"
                    @input="field.handleChange($event.target.value)"
                    @blur="field.handleBlur"
                  >
                  <p v-if="field.state.meta.errors.length" class="mt-1 text-xs text-red-500">{{ t('departments.validation.nameEnRequired') }}</p>
                </div>
              </template>
            </component>

            <component :is="editForm.Field" name="name_ar">
              <template #default="{ field }">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">{{ t('departments.form.nameArLabel') }}</label>
                  <input
                    :value="field.state.value"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    @input="field.handleChange($event.target.value)"
                  >
                </div>
              </template>
            </component>

            <component :is="editForm.Field" name="selectedBases">
              <template #default="{ field }">
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700">{{ t('departments.form.linkedBases') }}</label>
                  <div v-if="bases.length === 0" class="text-sm text-slate-500">{{ t('departments.form.noBases') }}</div>
                  <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label
                      v-for="base in bases"
                      :key="`edit-base-${base.id}`"
                      class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <Checkbox :model-value="field.state.value" :input-id="`edit-base-${base.id}`" name="edit-bases" :value="base.id" @update:model-value="field.handleChange" />
                      <span>{{ base.name_ar || base.name_en }}</span>
                    </label>
                  </div>
                </div>
              </template>
            </component>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="$emit('update:editOpen', false)">
              {{ t('departments.form.cancel') }}
            </button>
            <button type="submit" :disabled="isSubmitting" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              <i v-if="isSubmitting" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
              {{ isSubmitting ? t('departments.form.saving') : t('departments.form.update') }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </VueSidePanel>
</template>

<script>
import { useI18n } from 'vue-i18n';
import Checkbox from 'primevue/checkbox';
import TreeSelect from 'primevue/treeselect';
import { extractDeptKey } from '../../lib/departmentTree';
import { nameEnValidator } from '../../lib/organization/departmentFormSchema';

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
    isSubmitting: { type: Boolean, default: false },
  },
  emits: [
    'update:createOpen',
    'update:editOpen',
  ],
  setup() {
    const { t } = useI18n();
    return { t, nameEnValidator };
  },
  methods: {
    inputClass(isInvalid) {
      return [
        'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/20',
        isInvalid ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-brand',
      ];
    },
    onParentChange(value, field, form) {
      field.handleChange(value);
      form.setFieldValue('parent_id', Number(extractDeptKey(value) || 0));
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
