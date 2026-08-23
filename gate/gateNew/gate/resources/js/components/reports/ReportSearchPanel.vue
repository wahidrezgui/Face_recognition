<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppDateInput from '@/components/AppDateInput.vue';
import AppDepartmentTreeSelect from '@/components/AppDepartmentTreeSelect.vue';
import AppFiltersBar from '@/components/AppFiltersBar.vue';
import AppGenderFilterSelect from '@/components/AppGenderFilterSelect.vue';
import AppMilitaryNumberInput from '@/components/AppMilitaryNumberInput.vue';
import AppRankMultiSelect from '@/components/AppRankMultiSelect.vue';
import { useLocale } from '@/composables/useLocale';
import { localizedLabel } from '@/lib/employees/employeeFormUi';
import { movementTypeOptions } from '@/lib/gate/movementTypeOptions';
import { normalizeDepartmentTree } from '@/lib/organization/departmentTree';
import type { DepartmentNode, Gender, Rank } from '@/types';
import type { GateBase } from '@/types/gate';
import type { ReportPreset } from '@/types/reports';

const props = defineProps<{
    preset: ReportPreset;
    filters: Record<string, unknown>;
    departmentTree: Record<string, boolean> | null;
    departments: DepartmentNode[];
    ranks: Rank[];
    genders: Gender[];
    bases: GateBase[];
    loading: boolean;
}>();

const emit = defineEmits<{
    search: [];
    reset: [];
    export: [];
    print: [];
    'department-change': [value: Record<string, boolean> | null];
}>();

const { locale } = useLocale();

const departmentOptions = computed(() =>
    normalizeDepartmentTree(props.departments, locale.value),
);

const mvtypeOptions = computed(() => movementTypeOptions());

const gateOptions = computed(() =>
    props.bases.flatMap((base) => base.gates ?? []),
);
</script>

<template>
    <AppCard padding="md" class="mb-4">
        <AppFiltersBar v-if="preset.isCompanyVariant">
            <AppDepartmentTreeSelect
                :model-value="departmentTree"
                :options="departmentOptions"
                :placeholder="trans('reports.filters.company')"
                @update:model-value="
                    (value) =>
                        emit(
                            'department-change',
                            value as Record<string, boolean> | null,
                        )
                "
            />
            <AppDateInput v-model="filters.day as string" />
            <MultiSelect
                v-model="filters.mvtype as string[]"
                :options="mvtypeOptions"
                option-label="label"
                option-value="value"
                fluid
                :placeholder="trans('reports.filters.mvtype')"
            />
            <template #actions>
                <AppButton
                    :loading="loading"
                    :label="trans('reports.filters.search')"
                    @click="emit('search')"
                />
                <div class="flex gap-2">
                    <AppButton
                        severity="secondary"
                        outlined
                        :label="trans('reports.filters.reset')"
                        @click="emit('reset')"
                    />
                    <AppButton
                        severity="secondary"
                        outlined
                        :label="trans('reports.filters.print')"
                        @click="emit('print')"
                    />
                    <AppButton
                        severity="secondary"
                        outlined
                        :label="trans('reports.filters.exportCsv')"
                        @click="emit('export')"
                    />
                </div>
            </template>
        </AppFiltersBar>

        <AppFiltersBar v-else density="dense">
            <AppMilitaryNumberInput
                v-model="filters.military_number as string"
                :placeholder="trans('reports.filters.militaryNumber')"
            />
            <InputText
                v-model="filters.fullname_ar as string"
                :placeholder="trans('reports.filters.fullname')"
                fluid
            />
            <AppDepartmentTreeSelect
                :model-value="departmentTree"
                :options="departmentOptions"
                :placeholder="trans('reports.filters.department')"
                @update:model-value="
                    (value) =>
                        emit(
                            'department-change',
                            value as Record<string, boolean> | null,
                        )
                "
            />
            <AppRankMultiSelect
                v-model="filters.rank_ids as number[]"
                :ranks="ranks"
                :placeholder="trans('reports.filters.rank')"
            />
            <AppGenderFilterSelect
                v-model="filters.gender as string"
                :genders="genders"
                :placeholder="trans('reports.filters.gender')"
            />
            <template v-if="preset.showMovementFilters !== false">
                <MultiSelect
                    v-model="filters.base_ids as number[]"
                    :options="bases"
                    :option-label="(item) => localizedLabel(item, locale)"
                    option-value="id"
                    fluid
                    :placeholder="trans('reports.filters.base')"
                />
                <MultiSelect
                    v-model="filters.gate_ids as number[]"
                    :options="gateOptions"
                    :option-label="(item) => localizedLabel(item, locale)"
                    option-value="id"
                    fluid
                    :placeholder="trans('reports.filters.gate')"
                />
                <Select
                    v-model="filters.mvtype as string"
                    :options="mvtypeOptions"
                    option-label="label"
                    option-value="value"
                    fluid
                    show-clear
                    :placeholder="trans('reports.filters.mvtype')"
                />
            </template>

            <template v-if="preset.dateMode === 'single'">
                <AppDateInput v-model="filters.date as string" />
            </template>
            <template v-else-if="preset.dateMode === 'range'">
                <AppDateInput
                    v-model="filters.from_date as string"
                    :placeholder="trans('reports.filters.fromDate')"
                />
                <AppDateInput
                    v-model="filters.to_date as string"
                    :placeholder="trans('reports.filters.toDate')"
                />
            </template>

            <template #actions>
                <AppButton
                    :loading="loading"
                    :label="trans('reports.filters.search')"
                    @click="emit('search')"
                />
                <div class="flex gap-2">
                    <AppButton
                        severity="secondary"
                        outlined
                        :label="trans('reports.filters.reset')"
                        @click="emit('reset')"
                    />
                    <AppButton
                        severity="secondary"
                        outlined
                        :label="trans('reports.filters.print')"
                        @click="emit('print')"
                    />
                    <AppButton
                        severity="secondary"
                        outlined
                        :label="trans('reports.filters.exportCsv')"
                        @click="emit('export')"
                    />
                </div>
            </template>
        </AppFiltersBar>
    </AppCard>
</template>
