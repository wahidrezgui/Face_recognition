<script setup lang="ts">
import type { InertiaForm } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import TreeSelect from 'primevue/treeselect';
import AppButton from '@/components/AppButton.vue';
import AppSidePanel from '@/components/AppSidePanel.vue';
import FormField from '@/components/FormField.vue';
import InputError from '@/components/InputError.vue';
import { useLocale } from '@/composables/useLocale';
import { localizedLabel } from '@/lib/employees/employeeFormUi';
import { SEVERITY_STYLES } from '@/lib/severityStyles';
import {
    SSO_STATUS_SEVERITY,
    ssoStatus,
    ssoStatusLabel,
} from '@/lib/users/userFormUi';
import { cn } from '@/lib/utils';
import type { TreeSelectOption } from '@/types';
import type { ManagedUser } from '@/types';

interface UserFormData {
    firstname: string;
    lastname: string;
    username: string;
    password: string;
    password_confirmation: string;
    role: string;
    dep_id: number | null;
    default_base: number | null;
    activate_sso: boolean;
    military_number: number | null;
}

interface Props {
    createOpen: boolean;
    editOpen: boolean;
    panelWidth: string;
    createForm: InertiaForm<UserFormData>;
    editForm: InertiaForm<UserFormData>;
    createParentTree: Record<string, boolean> | null;
    editParentTree: Record<string, boolean> | null;
    departmentOptions: TreeSelectOption[];
    bases: { id: number; name_ar: string; name_en: string }[];
    roleOptions: { value: string; label: string }[];
    isDepartmentRequired: boolean;
    isEditingSelf: boolean;
    isTargetLastSuperAdmin: boolean;
    editingUser: ManagedUser | null;
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

const { locale } = useLocale();

</script>

<!-- eslint-disable vue/no-mutating-props -- createForm/editForm are Inertia's mutable useForm() instances, passed down intentionally so v-model can write straight into its fields. -->
<template>
    <AppSidePanel
        :model-value="createOpen"
        as-form
        :width="panelWidth"
        :title="trans('users.form.createTitle')"
        :close-aria-label="trans('users.form.cancel')"
        @update:model-value="emit('update:createOpen', $event)"
        @closed="createForm.reset()"
        @submit="emit('submit-create')"
        @close="emit('update:createOpen', false)"
    >
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <FormField
                    :label="trans('users.form.firstname')"
                    required
                    :error="createForm.errors.firstname"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="createForm.firstname"
                        fluid
                        :invalid="!!createForm.errors.firstname"
                    />
                </FormField>
                <FormField
                    :label="trans('users.form.lastname')"
                    required
                    :error="createForm.errors.lastname"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="createForm.lastname"
                        fluid
                        :invalid="!!createForm.errors.lastname"
                    />
                </FormField>
            </div>

            <FormField
                :label="trans('users.form.username')"
                required
                :error="createForm.errors.username"
                v-slot="{ id }"
            >
                <InputText
                    :id="id"
                    v-model="createForm.username"
                    fluid
                    dir="ltr"
                    :invalid="!!createForm.errors.username"
                />
            </FormField>

            <FormField
                :label="trans('users.form.militaryNumber')"
                required
                :error="createForm.errors.military_number"
                v-slot="{ id }"
            >
                <InputNumber
                    :input-id="id"
                    v-model="createForm.military_number"
                    :use-grouping="false"
                    fluid
                    :invalid="!!createForm.errors.military_number"
                />
            </FormField>

            <div class="grid grid-cols-2 gap-3">
                <FormField
                    :label="trans('users.form.password')"
                    required
                    :error="createForm.errors.password"
                    v-slot="{ id }"
                >
                    <Password
                        :input-id="id"
                        v-model="createForm.password"
                        fluid
                        toggle-mask
                        :feedback="false"
                        :invalid="!!createForm.errors.password"
                    />
                </FormField>
                <FormField
                    :label="trans('users.form.confirmPassword')"
                    required
                    :error="createForm.errors.password_confirmation"
                    v-slot="{ id }"
                >
                    <Password
                        :input-id="id"
                        v-model="createForm.password_confirmation"
                        fluid
                        toggle-mask
                        :feedback="false"
                        :invalid="!!createForm.errors.password_confirmation"
                    />
                </FormField>
            </div>

            <FormField
                :label="trans('users.form.role')"
                required
                :error="createForm.errors.role"
                v-slot="{ id }"
            >
                <Select
                    :input-id="id"
                    v-model="createForm.role"
                    :options="roleOptions"
                    option-label="label"
                    option-value="value"
                    fluid
                    :invalid="!!createForm.errors.role"
                />
            </FormField>

            <FormField
                :label="trans('users.form.department')"
                :required="isDepartmentRequired"
                :error="createForm.errors.dep_id"
                v-slot="{ id }"
            >
                <TreeSelect
                    :input-id="id"
                    :model-value="createParentTree"
                    :options="departmentOptions"
                    append-to="body"
                    show-clear
                    filter
                    filter-mode="lenient"
                    fluid
                    :invalid="!!createForm.errors.dep_id"
                    @update:model-value="emit('create-parent-change', $event)"
                />
            </FormField>

            <FormField
                :label="trans('users.form.defaultBase')"
                :error="createForm.errors.default_base"
                v-slot="{ id }"
            >
                <Select
                    :input-id="id"
                    v-model="createForm.default_base"
                    :options="bases"
                    :option-label="(item) => localizedLabel(item, locale)"
                    option-value="id"
                    fluid
                    show-clear
                />
            </FormField>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <AppButton
                    type="button"
                    severity="secondary"
                    outlined
                    :label="trans('users.form.cancel')"
                    @click="emit('update:createOpen', false)"
                />
                <AppButton
                    type="submit"
                    :loading="createForm.processing"
                    :label="
                        createForm.processing
                            ? trans('users.form.saving')
                            : trans('users.form.save')
                    "
                />
            </div>
        </template>
    </AppSidePanel>

    <AppSidePanel
        :model-value="editOpen"
        as-form
        :width="panelWidth"
        :close-aria-label="trans('users.form.cancel')"
        @update:model-value="emit('update:editOpen', $event)"
        @submit="emit('submit-edit')"
        @close="emit('update:editOpen', false)"
    >
        <template #header>
            <h2
                class="text-lg font-semibold text-surface-800 dark:text-surface-100"
            >
                {{ trans('users.form.editTitle') }}
            </h2>
            <Tag
                v-if="editingUser"
                class="mt-2"
                :severity="SSO_STATUS_SEVERITY[ssoStatus(editingUser)]"
                :value="ssoStatusLabel(ssoStatus(editingUser))"
            />
        </template>

        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <FormField
                    :label="trans('users.form.firstname')"
                    required
                    :error="editForm.errors.firstname"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="editForm.firstname"
                        fluid
                        :invalid="!!editForm.errors.firstname"
                    />
                </FormField>
                <FormField
                    :label="trans('users.form.lastname')"
                    required
                    :error="editForm.errors.lastname"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="editForm.lastname"
                        fluid
                        :invalid="!!editForm.errors.lastname"
                    />
                </FormField>
            </div>

            <FormField
                :label="trans('users.form.username')"
                required
                :error="editForm.errors.username"
                v-slot="{ id }"
            >
                <InputText
                    :id="id"
                    v-model="editForm.username"
                    fluid
                    dir="ltr"
                    :invalid="!!editForm.errors.username"
                />
            </FormField>

            <FormField
                :label="trans('users.form.militaryNumber')"
                required
                :error="editForm.errors.military_number"
                v-slot="{ id }"
            >
                <InputNumber
                    :input-id="id"
                    v-model="editForm.military_number"
                    :use-grouping="false"
                    fluid
                    :invalid="!!editForm.errors.military_number"
                />
            </FormField>

            <FormField
                :label="trans('users.form.passwordOptional')"
                :error="editForm.errors.password"
                v-slot="{ id }"
            >
                <Password
                    :input-id="id"
                    v-model="editForm.password"
                    fluid
                    toggle-mask
                    :feedback="false"
                    :invalid="!!editForm.errors.password"
                />
            </FormField>

            <div
                v-if="editingUser?.is_sso_pending"
                :class="cn('rounded-lg p-3', SEVERITY_STYLES.warn.banner)"
            >
                <label class="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox v-model="editForm.activate_sso" binary />
                    <span :class="SEVERITY_STYLES.warn.bannerText">
                        <span class="block font-medium">{{
                            trans('users.form.activateSso')
                        }}</span>
                        <span class="mt-0.5 block text-xs">{{
                            trans('users.form.activateSsoHint')
                        }}</span>
                    </span>
                </label>
                <InputError :message="editForm.errors.activate_sso" />
            </div>

            <FormField
                :label="trans('users.form.role')"
                required
                :error="editForm.errors.role"
                v-slot="{ id }"
            >
                <Select
                    :input-id="id"
                    v-model="editForm.role"
                    :options="roleOptions"
                    option-label="label"
                    option-value="value"
                    fluid
                    :disabled="isEditingSelf || isTargetLastSuperAdmin"
                    :invalid="!!editForm.errors.role"
                />
                <p
                    v-if="isEditingSelf"
                    class="mt-1 text-xs text-surface-500 dark:text-surface-400"
                >
                    {{ trans('users.form.selfRoleLocked') }}
                </p>
                <p
                    v-else-if="isTargetLastSuperAdmin"
                    class="mt-1 text-xs text-surface-500 dark:text-surface-400"
                >
                    {{ trans('users.form.lastAdminLocked') }}
                </p>
            </FormField>

            <FormField
                :label="trans('users.form.department')"
                :required="isDepartmentRequired"
                :error="editForm.errors.dep_id"
                v-slot="{ id }"
            >
                <TreeSelect
                    :input-id="id"
                    :model-value="editParentTree"
                    :options="departmentOptions"
                    append-to="body"
                    show-clear
                    filter
                    filter-mode="lenient"
                    fluid
                    :invalid="!!editForm.errors.dep_id"
                    @update:model-value="emit('edit-parent-change', $event)"
                />
            </FormField>

            <FormField
                :label="trans('users.form.defaultBase')"
                :error="editForm.errors.default_base"
                v-slot="{ id }"
            >
                <Select
                    :input-id="id"
                    v-model="editForm.default_base"
                    :options="bases"
                    :option-label="(item) => localizedLabel(item, locale)"
                    option-value="id"
                    fluid
                    show-clear
                />
            </FormField>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <AppButton
                    type="button"
                    severity="secondary"
                    outlined
                    :label="trans('users.form.cancel')"
                    @click="emit('update:editOpen', false)"
                />
                <AppButton
                    type="submit"
                    :loading="editForm.processing"
                    :label="
                        editForm.processing
                            ? trans('users.form.saving')
                            : trans('users.form.update')
                    "
                />
            </div>
        </template>
    </AppSidePanel>
</template>
