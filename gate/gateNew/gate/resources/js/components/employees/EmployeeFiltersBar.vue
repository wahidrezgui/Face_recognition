<script setup lang="ts">
import {
    AlertTriangle,
    CircleCheck,
    CircleX,
    PackageCheck,
    Printer,
    Search,
    Trash2,
    UserCheck,
    UserX,
    X,
} from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppDepartmentTreeSelect from '@/components/AppDepartmentTreeSelect.vue';
import AppFiltersBar from '@/components/AppFiltersBar.vue';
import AppMilitaryNumberInput from '@/components/AppMilitaryNumberInput.vue';
import { useLocale } from '@/composables/useLocale';
import {
    employeeStatusFilterOptions,
    employeeStatusLabel,
    housingFilterOptions,
    localizedLabel,
} from '@/lib/employees/employeeFormUi';
import { SEVERITY_STYLES } from '@/lib/severityStyles';
import type { BaseWithZones, Nationality, StatusCard, Zone } from '@/types';
import type { TreeSelectOption } from '@/types';

interface Props {
    statusCards: StatusCard[];
    expiredCount: number;
    bases: BaseWithZones[];
    zoneOptions: Zone[];
    nationalities: Nationality[];
    departmentOptions: TreeSelectOption[];
    departmentTree: Record<string, boolean> | null;
    hideDepartmentFilter?: boolean;
    canManage: boolean;
    selectedCount: number;
    bulkActions: {
        canApprove: boolean;
        canUnapprove: boolean;
        canCollect: boolean;
        canPrint: boolean;
        canDeactivate: boolean;
        canActivate: boolean;
    };
}

const props = defineProps<Props>();

const { locale } = useLocale();

const militaryNumber = defineModel<string>('militaryNumber', {
    required: true,
});
const fullnameAr = defineModel<string>('fullnameAr', { required: true });
const plateNumber = defineModel<string>('plateNumber', { required: true });
const baseId = defineModel<string>('baseId', { required: true });
const zoneId = defineModel<string>('zoneId', { required: true });
const statusFilter = defineModel<string>('statusFilter', { required: true });
const nationalityId = defineModel<string>('nationalityId', { required: true });
const housing = defineModel<string>('housing', { required: true });
const expiredOnly = defineModel<string>('expiredOnly', { required: true });
const deactivatedOnly = defineModel<string>('deactivatedOnly', {
    required: true,
});

const emit = defineEmits<{
    'reset-filter': [];
    'clear-selection': [];
    'delete-selected': [];
    'department-change': [value: Record<string, boolean> | null];
    approve: [];
    unapprove: [];
    collect: [];
    'print-access-cards': [];
    deactivate: [];
    activate: [];
}>();

const statusOptions = computed(() =>
    employeeStatusFilterOptions().map((option) => ({
        value: option.value,
        label: trans(option.labelKey),
    })),
);
const housingOptions = computed(() =>
    housingFilterOptions().map((option) => ({
        value: option.value,
        label: trans(option.labelKey),
    })),
);

// expiredOnly/deactivatedOnly are kept as plain strings ('1' | '') like every other filter
// here (they round-trip through URL query params), so the Checkboxes get a boolean adapter.
const expiredOnlyChecked = computed({
    get: () => expiredOnly.value === '1',
    set: (value: boolean) => {
        expiredOnly.value = value ? '1' : '';
    },
});
const deactivatedOnlyChecked = computed({
    get: () => deactivatedOnly.value === '1',
    set: (value: boolean) => {
        deactivatedOnly.value = value ? '1' : '';
    },
});
const baseOptions = computed(() => [
    {
        id: '',
        name_ar: trans('employees.filters.allBases'),
        name_en: trans('employees.filters.allBases'),
    },
    ...props.bases,
]);
const zoneSelectOptions = computed(() => [
    {
        id: '',
        name_ar: trans('employees.filters.allZones'),
        name_en: trans('employees.filters.allZones'),
    },
    ...props.zoneOptions,
]);
const nationalityOptions = computed(() => [
    {
        id: '',
        name_ar: trans('employees.filters.allNationalities'),
        name_en: trans('employees.filters.allNationalities'),
    },
    ...props.nationalities,
]);
</script>

<template>
    <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AppCard
            v-for="card in statusCards"
            :key="card.status"
            variant="stat"
            :title="employeeStatusLabel(card.status)"
            :value="card.count"
            padding="sm"
        />
        <AppCard
            variant="stat"
            :title="trans('employees.filters.expiredCards')"
            :icon="AlertTriangle"
            :icon-color="SEVERITY_STYLES.danger.chip"
            :border-color="SEVERITY_STYLES.danger.border"
            :value="expiredCount"
            padding="sm"
        />
    </div>

    <AppCard padding="md" class="mb-4">
        <AppFiltersBar density="dense">
            <AppMilitaryNumberInput
                v-model="militaryNumber"
                :placeholder="trans('employees.filters.militaryNumber')"
            />
            <InputText
                v-model="fullnameAr"
                :placeholder="trans('employees.filters.fullname')"
                fluid
            />
            <InputText
                v-model="plateNumber"
                :placeholder="trans('employees.filters.plateNumber')"
                fluid
            />
            <Select
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                fluid
                :placeholder="trans('employees.filters.status')"
            />
            <Select
                v-model="housing"
                :options="housingOptions"
                option-label="label"
                option-value="value"
                fluid
                :placeholder="trans('employees.filters.allHousing')"
            />
            <Select
                v-model="baseId"
                :options="baseOptions"
                :option-label="(item) => localizedLabel(item, locale)"
                option-value="id"
                fluid
                :placeholder="trans('employees.filters.allBases')"
            />
            <Select
                v-model="zoneId"
                :options="zoneSelectOptions"
                :option-label="(item) => localizedLabel(item, locale)"
                option-value="id"
                fluid
                :placeholder="trans('employees.filters.allZones')"
            />
            <Select
                v-model="nationalityId"
                :options="nationalityOptions"
                :option-label="(item) => localizedLabel(item, locale)"
                option-value="id"
                fluid
                :placeholder="trans('employees.filters.allNationalities')"
            />
            <AppDepartmentTreeSelect
                v-if="!hideDepartmentFilter"
                :model-value="departmentTree"
                :options="departmentOptions"
                :placeholder="trans('employees.filters.allDepartments')"
                @update:model-value="
                    (value) =>
                        emit(
                            'department-change',
                            value as Record<string, boolean> | null,
                        )
                "
            />
        </AppFiltersBar>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-4">
                <label
                    class="flex cursor-pointer items-center gap-2 text-sm text-surface-600 dark:text-surface-400"
                >
                    <Checkbox v-model="expiredOnlyChecked" binary />
                    {{ trans('employees.filters.expiredOnly') }}
                </label>
                <label
                    class="flex cursor-pointer items-center gap-2 text-sm text-surface-600 dark:text-surface-400"
                >
                    <Checkbox v-model="deactivatedOnlyChecked" binary />
                    {{ trans('employees.filters.deactivatedOnly') }}
                </label>
            </div>

            <AppButton
                text
                size="small"
                severity="secondary"
                @click="emit('reset-filter')"
            >
                <Search :size="14" />
                {{ trans('employees.filters.reset') }}
            </AppButton>
        </div>
    </AppCard>

    <AppCard v-if="canManage && selectedCount > 0" padding="sm" class="mb-4">
        <div class="flex flex-wrap items-center gap-2">
            <span
                class="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-950/50 dark:text-primary-400"
            >
                {{
                    trans('employees.bulk.selectedCount', {
                        count: String(selectedCount),
                    })
                }}
            </span>
            <AppButton
                text
                size="small"
                severity="secondary"
                @click="emit('clear-selection')"
            >
                <X :size="14" />
                {{ trans('employees.bulk.clearSelection') }}
            </AppButton>
            <AppButton
                size="small"
                severity="danger"
                @click="emit('delete-selected')"
            >
                <Trash2 :size="14" />
                {{ trans('employees.bulk.delete') }}
            </AppButton>
            <AppButton
                v-if="bulkActions.canApprove"
                size="small"
                severity="success"
                @click="emit('approve')"
            >
                <CircleCheck :size="14" />
                {{ trans('employees.bulk.approve') }}
            </AppButton>
            <AppButton
                v-if="bulkActions.canUnapprove"
                size="small"
                severity="warn"
                @click="emit('unapprove')"
            >
                <CircleX :size="14" />
                {{ trans('employees.bulk.unapprove') }}
            </AppButton>
            <AppButton
                v-if="bulkActions.canCollect"
                size="small"
                severity="info"
                @click="emit('collect')"
            >
                <PackageCheck :size="14" />
                {{ trans('employees.bulk.collect') }}
            </AppButton>
            <AppButton
                v-if="bulkActions.canPrint"
                size="small"
                severity="primary"
                @click="emit('print-access-cards')"
            >
                <Printer :size="14" />
                {{ trans('employees.bulk.printAccessCards') }}
            </AppButton>
            <AppButton
                v-if="bulkActions.canDeactivate"
                size="small"
                severity="danger"
                @click="emit('deactivate')"
            >
                <UserX :size="14" />
                {{ trans('employees.bulk.deactivate') }}
            </AppButton>
            <AppButton
                v-if="bulkActions.canActivate"
                size="small"
                severity="success"
                @click="emit('activate')"
            >
                <UserCheck :size="14" />
                {{ trans('employees.bulk.activate') }}
            </AppButton>
        </div>
    </AppCard>
</template>
