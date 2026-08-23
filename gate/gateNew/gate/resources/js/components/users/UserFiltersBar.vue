<script setup lang="ts">
import { Search } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppDepartmentTreeSelect from '@/components/AppDepartmentTreeSelect.vue';
import AppFiltersBar from '@/components/AppFiltersBar.vue';
import AppMilitaryNumberInput from '@/components/AppMilitaryNumberInput.vue';
import { ssoStatusFilterOptions } from '@/lib/users/userFormUi';
import type { TreeSelectOption } from '@/types';

interface Props {
    roleOptions: { value: string; label: string }[];
    departmentOptions: TreeSelectOption[];
    departmentTree: Record<string, boolean> | null;
}

const props = defineProps<Props>();

const search = defineModel<string>('search', { required: true });
const militaryNumber = defineModel<string>('militaryNumber', {
    required: true,
});
const roleFilter = defineModel<string>('roleFilter', { required: true });
const ssoStatusFilter = defineModel<string>('ssoStatusFilter', {
    required: true,
});

const emit = defineEmits<{
    'reset-filter': [];
    'department-change': [value: Record<string, boolean> | null];
}>();

const roleSelectOptions = computed(() => [
    { value: '', label: trans('users.filters.allRoles') },
    ...props.roleOptions,
]);
const ssoStatusOptions = computed(() =>
    ssoStatusFilterOptions().map((option) => ({
        value: option.value,
        label: trans(option.labelKey),
    })),
);
</script>

<template>
    <AppCard padding="md" class="mb-4">
        <AppFiltersBar>
            <AppMilitaryNumberInput
                v-model="militaryNumber"
                :placeholder="trans('users.filters.militaryNumber')"
            />

            <InputText
                v-model="search"
                :placeholder="trans('users.filters.search')"
                fluid
            />

            <Select
                v-model="roleFilter"
                :options="roleSelectOptions"
                option-label="label"
                option-value="value"
                fluid
                :placeholder="trans('users.filters.role')"
            />

            <Select
                v-model="ssoStatusFilter"
                :options="ssoStatusOptions"
                option-label="label"
                option-value="value"
                fluid
                :placeholder="trans('users.filters.ssoStatus')"
            />

            <AppDepartmentTreeSelect
                :model-value="departmentTree"
                :options="departmentOptions"
                :placeholder="trans('users.filters.allDepartments')"
                @update:model-value="
                    (value) =>
                        emit(
                            'department-change',
                            value as Record<string, boolean> | null,
                        )
                "
            />

            <template #actions>
                <AppButton
                    text
                    size="small"
                    severity="secondary"
                    @click="emit('reset-filter')"
                >
                    <Search :size="14" />
                    {{ trans('users.filters.reset') }}
                </AppButton>
            </template>
        </AppFiltersBar>
    </AppCard>
</template>
