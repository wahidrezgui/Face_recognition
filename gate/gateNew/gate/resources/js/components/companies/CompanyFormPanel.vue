<script setup lang="ts">
import type { InertiaForm } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import TreeSelect from 'primevue/treeselect';
import AppButton from '@/components/AppButton.vue';
import AppSidePanel from '@/components/AppSidePanel.vue';
import AppTimeInput from '@/components/AppTimeInput.vue';
import FormField from '@/components/FormField.vue';
import type { TreeSelectOption } from '@/types';

interface CompanyFormData {
    name_en: string;
    name_ar: string;
    parent_id: number;
    selected_bases: number[];
    start_time: string;
    end_time: string;
}

interface Props {
    createOpen: boolean;
    editOpen: boolean;
    panelWidth: string;
    createForm: InertiaForm<CompanyFormData>;
    editForm: InertiaForm<CompanyFormData>;
    createParentTree: Record<string, boolean> | null;
    editParentTree: Record<string, boolean> | null;
    bases: { id: number; name_ar: string; name_en: string }[];
    parentDepartmentOptions: TreeSelectOption[];
}

defineProps<Props>();

const emit = defineEmits<{
    'update:createOpen': [value: boolean];
    'update:editOpen': [value: boolean];
    'create-parent-change': [value: Record<string, boolean> | null];
    'edit-parent-change': [value: Record<string, boolean> | null];
    'submit-create': [];
    'submit-edit': [];
}>();
</script>

<!-- eslint-disable vue/no-mutating-props -- createForm/editForm are Inertia's mutable useForm() instances, passed down intentionally so v-model can write straight into its fields. -->
<template>
    <AppSidePanel
        :model-value="createOpen"
        as-form
        :width="panelWidth"
        :title="trans('companies.form.createTitle')"
        :close-aria-label="trans('companies.form.cancel')"
        @update:model-value="emit('update:createOpen', $event)"
        @closed="createForm.reset()"
        @submit="emit('submit-create')"
        @close="emit('update:createOpen', false)"
    >
        <div class="space-y-4">
            <FormField
                :label="trans('companies.form.parentLabel')"
                required
                :error="createForm.errors.parent_id"
                v-slot="{ id }"
            >
                <TreeSelect
                    :input-id="id"
                    :model-value="createParentTree"
                    :options="parentDepartmentOptions"
                    append-to="body"
                    show-clear
                    filter
                    filter-mode="lenient"
                    fluid
                    :invalid="!!createForm.errors.parent_id"
                    @update:model-value="emit('create-parent-change', $event)"
                />
            </FormField>

            <FormField
                :label="trans('companies.form.nameEnLabel')"
                required
                :error="createForm.errors.name_en"
                v-slot="{ id }"
            >
                <InputText
                    :id="id"
                    v-model="createForm.name_en"
                    fluid
                    dir="ltr"
                    :invalid="!!createForm.errors.name_en"
                />
            </FormField>

            <FormField
                :label="trans('companies.form.nameArLabel')"
                v-slot="{ id }"
            >
                <InputText :id="id" v-model="createForm.name_ar" fluid />
            </FormField>

            <div class="grid grid-cols-2 gap-3">
                <FormField
                    :label="trans('companies.form.startTime')"
                    :error="createForm.errors.start_time"
                    v-slot="{ id }"
                >
                    <AppTimeInput
                        :input-id="id"
                        v-model="createForm.start_time"
                        :invalid="!!createForm.errors.start_time"
                    />
                </FormField>
                <FormField
                    :label="trans('companies.form.endTime')"
                    :error="createForm.errors.end_time"
                    v-slot="{ id }"
                >
                    <AppTimeInput
                        :input-id="id"
                        v-model="createForm.end_time"
                        :invalid="!!createForm.errors.end_time"
                    />
                </FormField>
            </div>

            <div>
                <label
                    class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
                    >{{ trans('companies.form.linkedBases') }}</label
                >
                <div
                    v-if="bases.length === 0"
                    class="text-sm text-surface-500 dark:text-surface-400"
                >
                    {{ trans('companies.form.noBases') }}
                </div>
                <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label
                        v-for="base in bases"
                        :key="`create-base-${base.id}`"
                        class="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
                    >
                        <Checkbox
                            v-model="createForm.selected_bases"
                            :input-id="`create-base-${base.id}`"
                            name="create-bases"
                            :value="base.id"
                        />
                        <span>{{ base.name_ar || base.name_en }}</span>
                    </label>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <AppButton
                    type="button"
                    severity="secondary"
                    outlined
                    :label="trans('companies.form.cancel')"
                    @click="emit('update:createOpen', false)"
                />
                <AppButton
                    type="submit"
                    :loading="createForm.processing"
                    :label="
                        createForm.processing
                            ? trans('companies.form.saving')
                            : trans('companies.form.save')
                    "
                />
            </div>
        </template>
    </AppSidePanel>

    <AppSidePanel
        :model-value="editOpen"
        as-form
        :width="panelWidth"
        :title="trans('companies.form.editTitle')"
        :close-aria-label="trans('companies.form.cancel')"
        @update:model-value="emit('update:editOpen', $event)"
        @submit="emit('submit-edit')"
        @close="emit('update:editOpen', false)"
    >
        <div class="space-y-4">
            <FormField
                :label="trans('companies.form.parentLabel')"
                required
                :error="editForm.errors.parent_id"
                v-slot="{ id }"
            >
                <TreeSelect
                    :input-id="id"
                    :model-value="editParentTree"
                    :options="parentDepartmentOptions"
                    append-to="body"
                    show-clear
                    filter
                    filter-mode="lenient"
                    fluid
                    :invalid="!!editForm.errors.parent_id"
                    @update:model-value="emit('edit-parent-change', $event)"
                />
            </FormField>

            <FormField
                :label="trans('companies.form.nameEnLabel')"
                required
                :error="editForm.errors.name_en"
                v-slot="{ id }"
            >
                <InputText
                    :id="id"
                    v-model="editForm.name_en"
                    fluid
                    dir="ltr"
                    :invalid="!!editForm.errors.name_en"
                />
            </FormField>

            <FormField
                :label="trans('companies.form.nameArLabel')"
                v-slot="{ id }"
            >
                <InputText :id="id" v-model="editForm.name_ar" fluid />
            </FormField>

            <div class="grid grid-cols-2 gap-3">
                <FormField
                    :label="trans('companies.form.startTime')"
                    :error="editForm.errors.start_time"
                    v-slot="{ id }"
                >
                    <AppTimeInput
                        :input-id="id"
                        v-model="editForm.start_time"
                        :invalid="!!editForm.errors.start_time"
                    />
                </FormField>
                <FormField
                    :label="trans('companies.form.endTime')"
                    :error="editForm.errors.end_time"
                    v-slot="{ id }"
                >
                    <AppTimeInput
                        :input-id="id"
                        v-model="editForm.end_time"
                        :invalid="!!editForm.errors.end_time"
                    />
                </FormField>
            </div>

            <div>
                <label
                    class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
                    >{{ trans('companies.form.linkedBases') }}</label
                >
                <div
                    v-if="bases.length === 0"
                    class="text-sm text-surface-500 dark:text-surface-400"
                >
                    {{ trans('companies.form.noBases') }}
                </div>
                <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label
                        v-for="base in bases"
                        :key="`edit-base-${base.id}`"
                        class="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
                    >
                        <Checkbox
                            v-model="editForm.selected_bases"
                            :input-id="`edit-base-${base.id}`"
                            name="edit-bases"
                            :value="base.id"
                        />
                        <span>{{ base.name_ar || base.name_en }}</span>
                    </label>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <AppButton
                    type="button"
                    severity="secondary"
                    outlined
                    :label="trans('companies.form.cancel')"
                    @click="emit('update:editOpen', false)"
                />
                <AppButton
                    type="submit"
                    :loading="editForm.processing"
                    :label="
                        editForm.processing
                            ? trans('companies.form.saving')
                            : trans('companies.form.update')
                    "
                />
            </div>
        </template>
    </AppSidePanel>
</template>
