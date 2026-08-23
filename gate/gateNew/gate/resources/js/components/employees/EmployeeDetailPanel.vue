<script setup lang="ts">
import type { InertiaForm } from '@inertiajs/vue3';
import { Plus, Trash2 } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import TreeSelect from 'primevue/treeselect';
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppDateInput from '@/components/AppDateInput.vue';
import AppSidePanel from '@/components/AppSidePanel.vue';
import AppTimeInput from '@/components/AppTimeInput.vue';
import EmployeeAccessCardTab from '@/components/employees/EmployeeAccessCardTab.vue';
import FormField from '@/components/FormField.vue';
import SegmentedTabs from '@/components/SegmentedTabs.vue';
import { useLocale } from '@/composables/useLocale';
import {
    BLOOD_TYPE_OPTIONS,
    employeePhotoUrl,
} from '@/lib/employees/employeeFormUi';
import { formatMovementDateTime } from '@/lib/movementFormatting';
import type { AccessCardResponse } from '@/types';
import type {
    BaseWithZones,
    Employee,
    EmployeeMovement,
    Gender,
    Nationality,
    Rank,
} from '@/types';
import type { TreeSelectOption } from '@/types';

interface EmployeeFormData {
    military_number: number | null;
    phone_number: number | null;
    fullname_en: string;
    fullname_ar: string;
    remarks: string;
    bloodtype: string;
    qid: string;
    Job_Arabic: string;
    Job_En: string;
    StartTime: string;
    EndTime: string;
    Escort: string;
    device: string;
    expiry_date: string;
    dep_id: number;
    dep_parent_id: number;
    rank_id: number | null;
    nationality_id: number | null;
    gender_id: number | null;
    default_base: number | null;
    is_employee: number;
    housing: boolean;
    photo: File | null;
    zoning: number[];
}

interface Props {
    createOpen: boolean;
    editOpen: boolean;
    panelWidth: string;
    createForm: InertiaForm<EmployeeFormData>;
    editForm: InertiaForm<EmployeeFormData>;
    createParentTree: Record<string, boolean> | null;
    editParentTree: Record<string, boolean> | null;
    departmentOptions: TreeSelectOption[];
    bases: BaseWithZones[];
    ranks: Rank[];
    rankGroups: { label: string; items: Rank[] }[];
    nationalities: Nationality[];
    genders: Gender[];
    editingEmployee: Employee | null;
    employeeMovements: EmployeeMovement[];
    movementsLoading: boolean;
    accessCard?: AccessCardResponse | null;
    accessCardLoading: boolean;
    canManage: boolean;
    /** When set, this employee console is locked to one company — hide the
     * department picker and show this label instead. */
    lockedDepartmentLabel?: string | null;
}

const props = defineProps<Props>();

const newCarPlateNumber = defineModel<string>('newCarPlateNumber', {
    required: true,
});
const newCarDescription = defineModel<string>('newCarDescription', {
    required: true,
});
const accessCardBaseId = defineModel<number | null>('accessCardBaseId', {
    required: true,
});

const emit = defineEmits<{
    'update:createOpen': [value: boolean];
    'update:editOpen': [value: boolean];
    'create-parent-change': [value: Record<string, boolean> | null];
    'edit-parent-change': [value: Record<string, boolean> | null];
    'submit-create': [];
    'submit-edit': [];
    'add-car': [];
    'update-car-description': [carId: number, description: string];
    'delete-car': [carId: number];
    'open-movements': [];
    'open-access-card': [];
    printed: [];
    'return-card': [badgeLogId: number];
}>();

const { locale } = useLocale();

type TabId = 'info' | 'access_card' | 'cars' | 'movements';
const activeTab = ref<TabId>('info');

const editTabItems = computed(() =>
    (['info', 'access_card', 'cars', 'movements'] as TabId[]).map((tab) => ({
        value: tab,
        label: trans(`employees.form.tabs.${tab}`),
    })),
);

function onEditTabSelect(value: string): void {
    if (value === 'movements') {
        emit('open-movements');
    }

    if (value === 'access_card') {
        emit('open-access-card');
    }
}

const createPhotoPreview = ref<string | null>(null);
const editPhotoPreview = ref<string | null>(null);

function setEditPhotoPreview(url: string | null) {
    if (editPhotoPreview.value) {
        URL.revokeObjectURL(editPhotoPreview.value);
    }

    editPhotoPreview.value = url;
}

function setCreatePhotoPreview(url: string | null) {
    if (createPhotoPreview.value) {
        URL.revokeObjectURL(createPhotoPreview.value);
    }

    createPhotoPreview.value = url;
}

// Always land back on Personal Info when the edit panel (re)opens — activeTab otherwise
// persists across employees, so re-opening a different employee while "Access Card" (or
// "Movements") was last selected would show stale data until the user manually switched
// tabs away and back, since the tab-click handler is what triggers the on-demand fetch.
// editPhotoPreview must also be cleared here: it's a local blob URL set only when the user
// picks a new photo, so after editing+saving one employee's photo it would otherwise keep
// winning over `employeePhotoUrl(editingEmployee?.photo)` when a different employee is opened.
watch(
    () => props.editOpen,
    (isOpen) => {
        if (isOpen) {
            activeTab.value = 'info';
            setEditPhotoPreview(null);
        }
    },
);

watch(
    () => props.createOpen,
    (isOpen) => {
        if (isOpen) {
            setCreatePhotoPreview(null);
        }
    },
);

function onCreatePhotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    // eslint-disable-next-line vue/no-mutating-props -- createForm is Inertia's mutable useForm() instance, passed down intentionally.
    props.createForm.photo = file;
    setCreatePhotoPreview(file ? URL.createObjectURL(file) : null);
}

function onEditPhotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    // eslint-disable-next-line vue/no-mutating-props -- editForm is Inertia's mutable useForm() instance, passed down intentionally.
    props.editForm.photo = file;
    setEditPhotoPreview(file ? URL.createObjectURL(file) : null);
}

function onCarDescriptionChange(carId: number, event: Event) {
    emit(
        'update-car-description',
        carId,
        (event.target as HTMLInputElement).value,
    );
}

const nationalityOptions = computed(() =>
    props.nationalities.map((n) => ({
        id: n.id,
        label: locale.value === 'en' ? n.name_en : n.name_ar,
    })),
);
const genderOptions = computed(() =>
    props.genders.map((g) => ({
        id: g.id,
        label: locale.value === 'en' ? g.name_en : g.name_ar,
    })),
);
const baseSelectOptions = computed(() =>
    props.bases.map((b) => ({
        id: b.id,
        label: locale.value === 'en' ? b.name_en : b.name_ar,
    })),
);
</script>

<!-- eslint-disable vue/no-mutating-props -- createForm/editForm are Inertia's mutable useForm() instances, passed down intentionally so v-model can write straight into their fields. -->
<template>
    <!-- ===== CREATE PANEL ===== -->
    <AppSidePanel
        :model-value="createOpen"
        as-form
        :width="panelWidth"
        :title="trans('employees.form.createTitle')"
        :subtitle="trans('employees.form.createSubtitle')"
        :close-aria-label="trans('employees.form.cancel')"
        @update:model-value="emit('update:createOpen', $event)"
        @closed="createForm.reset()"
        @submit="emit('submit-create')"
        @close="emit('update:createOpen', false)"
    >
        <div class="space-y-4">
            <div class="flex items-center gap-4">
                <img
                    :src="createPhotoPreview || employeePhotoUrl(null)"
                    class="h-16 w-16 rounded-full object-cover"
                    alt=""
                />
                <div>
                    <label
                        class="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"
                        >{{ trans('employees.form.photo') }}</label
                    >
                    <input
                        type="file"
                        accept="image/*"
                        class="text-sm"
                        @change="onCreatePhotoChange"
                    />
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    :label="trans('employees.form.fullnameEn')"
                    required
                    :error="createForm.errors.fullname_en"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="createForm.fullname_en"
                        fluid
                        dir="ltr"
                        :invalid="!!createForm.errors.fullname_en"
                    />
                </FormField>
                <FormField
                    :label="trans('employees.form.fullnameAr')"
                    required
                    :error="createForm.errors.fullname_ar"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="createForm.fullname_ar"
                        fluid
                        :invalid="!!createForm.errors.fullname_ar"
                    />
                </FormField>

                <FormField
                    :label="trans('employees.form.militaryNumber')"
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
                <FormField :label="trans('employees.form.qid')" v-slot="{ id }">
                    <InputText
                        :id="id"
                        v-model="createForm.qid"
                        fluid
                        dir="ltr"
                    />
                </FormField>

                <FormField
                    :label="trans('employees.form.phoneNumber')"
                    :error="createForm.errors.phone_number"
                    v-slot="{ id }"
                >
                    <InputNumber
                        :input-id="id"
                        v-model="createForm.phone_number"
                        :use-grouping="false"
                        fluid
                        :invalid="!!createForm.errors.phone_number"
                    />
                </FormField>
                <FormField
                    :label="trans('employees.form.bloodtype')"
                    required
                    :error="createForm.errors.bloodtype"
                    v-slot="{ id }"
                >
                    <Select
                        :input-id="id"
                        v-model="createForm.bloodtype"
                        :options="BLOOD_TYPE_OPTIONS"
                        fluid
                        :invalid="!!createForm.errors.bloodtype"
                    />
                </FormField>

                <FormField
                    :label="trans('employees.form.gender')"
                    required
                    :error="createForm.errors.gender_id"
                    v-slot="{ id }"
                >
                    <Select
                        :input-id="id"
                        v-model="createForm.gender_id"
                        :options="genderOptions"
                        option-label="label"
                        option-value="id"
                        fluid
                        :invalid="!!createForm.errors.gender_id"
                    />
                </FormField>
                <FormField
                    :label="trans('employees.form.nationality')"
                    required
                    :error="createForm.errors.nationality_id"
                    v-slot="{ id }"
                >
                    <Select
                        :input-id="id"
                        v-model="createForm.nationality_id"
                        :options="nationalityOptions"
                        option-label="label"
                        option-value="id"
                        fluid
                        filter
                        :invalid="!!createForm.errors.nationality_id"
                    />
                </FormField>

                <FormField
                    :label="trans('employees.form.rank')"
                    required
                    :error="createForm.errors.rank_id"
                    v-slot="{ id }"
                >
                    <Select
                        :input-id="id"
                        v-model="createForm.rank_id"
                        :options="rankGroups"
                        option-group-label="label"
                        option-group-children="items"
                        :option-label="
                            (r) => (locale === 'en' ? r.name_en : r.name_ar)
                        "
                        option-value="id"
                        fluid
                        filter
                        :invalid="!!createForm.errors.rank_id"
                    />
                </FormField>
                <FormField
                    :label="trans('employees.form.expiryDate')"
                    required
                    :error="createForm.errors.expiry_date"
                    v-slot="{ id }"
                >
                    <AppDateInput
                        :input-id="id"
                        v-model="createForm.expiry_date"
                        :invalid="!!createForm.errors.expiry_date"
                    />
                </FormField>

                <FormField
                    :label="trans('employees.form.jobEn')"
                    required
                    :error="createForm.errors.Job_En"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="createForm.Job_En"
                        fluid
                        dir="ltr"
                        :invalid="!!createForm.errors.Job_En"
                    />
                </FormField>
                <FormField
                    :label="trans('employees.form.jobAr')"
                    v-slot="{ id }"
                >
                    <InputText :id="id" v-model="createForm.Job_Arabic" fluid />
                </FormField>

                <FormField
                    :label="trans('employees.form.department')"
                    required
                    :error="createForm.errors.dep_id"
                    v-slot="{ id }"
                >
                    <div
                        v-if="lockedDepartmentLabel"
                        class="rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
                    >
                        {{ lockedDepartmentLabel }}
                    </div>
                    <TreeSelect
                        v-else
                        :input-id="id"
                        :model-value="createParentTree"
                        :options="departmentOptions"
                        append-to="body"
                        filter
                        fluid
                        :placeholder="
                            trans('employees.form.departmentPlaceholder')
                        "
                        @update:model-value="
                            emit('create-parent-change', $event)
                        "
                    />
                </FormField>
                <FormField
                    :label="trans('employees.form.defaultBase')"
                    v-slot="{ id }"
                >
                    <Select
                        :input-id="id"
                        v-model="createForm.default_base"
                        :options="baseSelectOptions"
                        option-label="label"
                        option-value="id"
                        fluid
                        show-clear
                    />
                </FormField>
                <div class="flex items-end pb-2">
                    <label
                        class="flex cursor-pointer items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300"
                    >
                        <Checkbox
                            v-model="createForm.housing"
                            :binary="true"
                            input-id="create-housing"
                        />
                        {{ trans('employees.form.housing') }}
                    </label>
                </div>

                <FormField
                    :label="trans('employees.form.escort')"
                    v-slot="{ id }"
                >
                    <InputText :id="id" v-model="createForm.Escort" fluid />
                </FormField>
                <FormField
                    :label="trans('employees.form.device')"
                    v-slot="{ id }"
                >
                    <InputText :id="id" v-model="createForm.device" fluid />
                </FormField>

                <FormField
                    :label="trans('employees.form.startTime')"
                    v-slot="{ id }"
                >
                    <AppTimeInput
                        :input-id="id"
                        v-model="createForm.StartTime"
                    />
                </FormField>
                <FormField
                    :label="trans('employees.form.endTime')"
                    v-slot="{ id }"
                >
                    <AppTimeInput :input-id="id" v-model="createForm.EndTime" />
                </FormField>
            </div>

            <FormField
                :label="trans('employees.form.remarks')"
                :error="createForm.errors.remarks"
                v-slot="{ id }"
            >
                <Textarea
                    :id="id"
                    v-model="createForm.remarks"
                    fluid
                    rows="2"
                    :invalid="!!createForm.errors.remarks"
                />
            </FormField>

            <div>
                <label
                    class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
                    >{{ trans('employees.form.zones') }}</label
                >
                <div class="space-y-3">
                    <div
                        v-for="base in bases"
                        :key="base.id"
                        class="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                    >
                        <p
                            class="mb-2 text-xs font-bold text-surface-500 dark:text-surface-400"
                        >
                            {{ locale === 'en' ? base.name_en : base.name_ar }}
                        </p>
                        <div
                            v-if="base.zones.length === 0"
                            class="text-xs text-surface-400"
                        >
                            {{ trans('employees.form.noZones') }}
                        </div>
                        <div v-else class="flex flex-wrap gap-3">
                            <label
                                v-for="zone in base.zones"
                                :key="zone.id"
                                class="flex cursor-pointer items-center gap-1.5 text-sm"
                            >
                                <Checkbox
                                    v-model="createForm.zoning"
                                    :input-id="`create-zone-${zone.id}`"
                                    :value="zone.id"
                                />
                                <span
                                    class="inline-block h-2.5 w-2.5 rounded-full"
                                    :style="{
                                        backgroundColor: zone.color,
                                    }"
                                />
                                {{
                                    locale === 'en'
                                        ? zone.name_en
                                        : zone.name_ar || zone.name_en
                                }}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <AppButton
                    type="button"
                    severity="secondary"
                    outlined
                    :label="trans('employees.form.cancel')"
                    @click="emit('update:createOpen', false)"
                />
                <AppButton
                    type="submit"
                    :loading="createForm.processing"
                    :label="
                        createForm.processing
                            ? trans('employees.form.saving')
                            : trans('employees.form.save')
                    "
                />
            </div>
        </template>
    </AppSidePanel>

    <!-- ===== EDIT PANEL ===== -->
    <AppSidePanel
        :model-value="editOpen"
        :width="panelWidth"
        :body-padding="false"
        :close-aria-label="trans('employees.form.cancel')"
        @update:model-value="emit('update:editOpen', $event)"
        @close="emit('update:editOpen', false)"
    >
        <template #header>
            <h2
                class="text-lg font-semibold text-surface-800 dark:text-surface-100"
            >
                {{ trans('employees.form.editTitle') }}
            </h2>
            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
                {{ trans('employees.form.editSubtitle') }}
            </p>
        </template>
        <template #header-extra>
            <SegmentedTabs
                v-model="activeTab"
                :items="editTabItems"
                @select="onEditTabSelect"
            />
        </template>

        <form
            v-if="activeTab === 'info'"
            novalidate
            class="flex flex-1 flex-col overflow-hidden"
            @submit.prevent="emit('submit-edit')"
        >
            <div class="flex-1 overflow-y-auto px-6 py-6">
                <div class="space-y-4">
                    <div class="flex items-center gap-4">
                        <img
                            :src="
                                editPhotoPreview ||
                                employeePhotoUrl(editingEmployee?.photo)
                            "
                            class="h-16 w-16 rounded-full object-cover"
                            alt=""
                        />
                        <div>
                            <label
                                class="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"
                                >{{ trans('employees.form.photo') }}</label
                            >
                            <input
                                type="file"
                                accept="image/*"
                                class="text-sm"
                                @change="onEditPhotoChange"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            :label="trans('employees.form.fullnameEn')"
                            required
                            :error="editForm.errors.fullname_en"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="editForm.fullname_en"
                                fluid
                                dir="ltr"
                                :invalid="!!editForm.errors.fullname_en"
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.fullnameAr')"
                            required
                            :error="editForm.errors.fullname_ar"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="editForm.fullname_ar"
                                fluid
                                :invalid="!!editForm.errors.fullname_ar"
                            />
                        </FormField>

                        <FormField
                            :label="trans('employees.form.militaryNumber')"
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
                            :label="trans('employees.form.qid')"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="editForm.qid"
                                fluid
                                dir="ltr"
                            />
                        </FormField>

                        <FormField
                            :label="trans('employees.form.phoneNumber')"
                            :error="editForm.errors.phone_number"
                            v-slot="{ id }"
                        >
                            <InputNumber
                                :input-id="id"
                                v-model="editForm.phone_number"
                                :use-grouping="false"
                                fluid
                                :invalid="!!editForm.errors.phone_number"
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.bloodtype')"
                            required
                            :error="editForm.errors.bloodtype"
                            v-slot="{ id }"
                        >
                            <Select
                                :input-id="id"
                                v-model="editForm.bloodtype"
                                :options="BLOOD_TYPE_OPTIONS"
                                fluid
                                :invalid="!!editForm.errors.bloodtype"
                            />
                        </FormField>

                        <FormField
                            :label="trans('employees.form.gender')"
                            required
                            :error="editForm.errors.gender_id"
                            v-slot="{ id }"
                        >
                            <Select
                                :input-id="id"
                                v-model="editForm.gender_id"
                                :options="genderOptions"
                                option-label="label"
                                option-value="id"
                                fluid
                                :invalid="!!editForm.errors.gender_id"
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.nationality')"
                            required
                            :error="editForm.errors.nationality_id"
                            v-slot="{ id }"
                        >
                            <Select
                                :input-id="id"
                                v-model="editForm.nationality_id"
                                :options="nationalityOptions"
                                option-label="label"
                                option-value="id"
                                fluid
                                filter
                                :invalid="!!editForm.errors.nationality_id"
                            />
                        </FormField>

                        <FormField
                            :label="trans('employees.form.rank')"
                            required
                            :error="editForm.errors.rank_id"
                            v-slot="{ id }"
                        >
                            <Select
                                :input-id="id"
                                v-model="editForm.rank_id"
                                :options="rankGroups"
                                option-group-label="label"
                                option-group-children="items"
                                :option-label="
                                    (r) =>
                                        locale === 'en' ? r.name_en : r.name_ar
                                "
                                option-value="id"
                                fluid
                                filter
                                :invalid="!!editForm.errors.rank_id"
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.expiryDate')"
                            required
                            :error="editForm.errors.expiry_date"
                            v-slot="{ id }"
                        >
                            <AppDateInput
                                :input-id="id"
                                v-model="editForm.expiry_date"
                                :invalid="!!editForm.errors.expiry_date"
                            />
                        </FormField>

                        <FormField
                            :label="trans('employees.form.jobEn')"
                            required
                            :error="editForm.errors.Job_En"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="editForm.Job_En"
                                fluid
                                dir="ltr"
                                :invalid="!!editForm.errors.Job_En"
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.jobAr')"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="editForm.Job_Arabic"
                                fluid
                            />
                        </FormField>

                        <FormField
                            :label="trans('employees.form.department')"
                            required
                            :error="editForm.errors.dep_id"
                            v-slot="{ id }"
                        >
                            <div
                                v-if="lockedDepartmentLabel"
                                class="rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
                            >
                                {{ lockedDepartmentLabel }}
                            </div>
                            <TreeSelect
                                v-else
                                :input-id="id"
                                :model-value="editParentTree"
                                :options="departmentOptions"
                                append-to="body"
                                filter
                                fluid
                                :placeholder="
                                    trans(
                                        'employees.form.departmentPlaceholder',
                                    )
                                "
                                @update:model-value="
                                    emit('edit-parent-change', $event)
                                "
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.defaultBase')"
                            v-slot="{ id }"
                        >
                            <Select
                                :input-id="id"
                                v-model="editForm.default_base"
                                :options="baseSelectOptions"
                                option-label="label"
                                option-value="id"
                                fluid
                                show-clear
                            />
                        </FormField>
                        <div class="flex items-end pb-2">
                            <label
                                class="flex cursor-pointer items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300"
                            >
                                <Checkbox
                                    v-model="editForm.housing"
                                    :binary="true"
                                    input-id="edit-housing"
                                />
                                {{ trans('employees.form.housing') }}
                            </label>
                        </div>

                        <FormField
                            :label="trans('employees.form.escort')"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="editForm.Escort"
                                fluid
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.device')"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="editForm.device"
                                fluid
                            />
                        </FormField>

                        <FormField
                            :label="trans('employees.form.startTime')"
                            v-slot="{ id }"
                        >
                            <AppTimeInput
                                :input-id="id"
                                v-model="editForm.StartTime"
                            />
                        </FormField>
                        <FormField
                            :label="trans('employees.form.endTime')"
                            v-slot="{ id }"
                        >
                            <AppTimeInput
                                :input-id="id"
                                v-model="editForm.EndTime"
                            />
                        </FormField>
                    </div>

                    <FormField
                        :label="trans('employees.form.remarks')"
                        :error="editForm.errors.remarks"
                        v-slot="{ id }"
                    >
                        <Textarea
                            :id="id"
                            v-model="editForm.remarks"
                            fluid
                            rows="2"
                            :invalid="!!editForm.errors.remarks"
                        />
                    </FormField>

                    <div>
                        <label
                            class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
                            >{{ trans('employees.form.zones') }}</label
                        >
                        <div class="space-y-3">
                            <div
                                v-for="base in bases"
                                :key="base.id"
                                class="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                            >
                                <p
                                    class="mb-2 text-xs font-bold text-surface-500 dark:text-surface-400"
                                >
                                    {{
                                        locale === 'en'
                                            ? base.name_en
                                            : base.name_ar
                                    }}
                                </p>
                                <div
                                    v-if="base.zones.length === 0"
                                    class="text-xs text-surface-400"
                                >
                                    {{ trans('employees.form.noZones') }}
                                </div>
                                <div v-else class="flex flex-wrap gap-3">
                                    <label
                                        v-for="zone in base.zones"
                                        :key="zone.id"
                                        class="flex cursor-pointer items-center gap-1.5 text-sm"
                                    >
                                        <Checkbox
                                            v-model="editForm.zoning"
                                            :input-id="`edit-zone-${zone.id}`"
                                            :value="zone.id"
                                        />
                                        <span
                                            class="inline-block h-2.5 w-2.5 rounded-full"
                                            :style="{
                                                backgroundColor: zone.color,
                                            }"
                                        />
                                        {{
                                            locale === 'en'
                                                ? zone.name_en
                                                : zone.name_ar || zone.name_en
                                        }}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="flex-none border-t border-surface-200 bg-surface-50 px-6 py-4 dark:border-surface-800 dark:bg-surface-950/50"
            >
                <div class="flex justify-end gap-3">
                    <AppButton
                        type="button"
                        severity="secondary"
                        outlined
                        :label="trans('employees.form.cancel')"
                        @click="emit('update:editOpen', false)"
                    />
                    <AppButton
                        type="submit"
                        :loading="editForm.processing"
                        :label="
                            editForm.processing
                                ? trans('employees.form.saving')
                                : trans('employees.form.update')
                        "
                    />
                </div>
            </div>
        </form>

        <div
            v-else-if="activeTab === 'cars'"
            class="flex-1 overflow-y-auto px-6 py-6"
        >
            <div class="mb-4 space-y-3">
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <FormField
                        :label="trans('employees.cars.plateNumber')"
                        v-slot="{ id }"
                    >
                        <InputText
                            :id="id"
                            v-model="newCarPlateNumber"
                            fluid
                            dir="ltr"
                        />
                    </FormField>
                    <FormField
                        :label="trans('employees.cars.description')"
                        v-slot="{ id }"
                    >
                        <InputText
                            :id="id"
                            v-model="newCarDescription"
                            fluid
                            dir="ltr"
                        />
                    </FormField>
                </div>
                <div class="flex justify-end">
                    <AppButton @click="emit('add-car')">
                        <Plus :size="15" />
                        {{ trans('employees.cars.add') }}
                    </AppButton>
                </div>
            </div>

            <div
                v-if="!editingEmployee?.cars?.length"
                class="py-8 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('employees.cars.empty') }}
            </div>
            <ul v-else class="space-y-2">
                <li
                    v-for="car in editingEmployee.cars"
                    :key="car.id"
                    class="rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700"
                >
                    <div class="flex items-center justify-between gap-2">
                        <span dir="ltr" class="font-mono text-sm">{{
                            car.plate_number
                        }}</span>
                        <div class="flex items-center gap-2">
                            <Tag
                                :severity="car.active ? 'success' : 'secondary'"
                                :value="
                                    car.active
                                        ? trans('employees.cars.active')
                                        : trans('employees.cars.inactive')
                                "
                            />
                            <AppButton
                                text
                                rounded
                                size="small"
                                severity="danger"
                                @click="emit('delete-car', car.id)"
                            >
                                <Trash2 :size="15" />
                            </AppButton>
                        </div>
                    </div>
                    <InputText
                        :model-value="car.car_description ?? ''"
                        fluid
                        dir="ltr"
                        size="small"
                        class="mt-2"
                        :placeholder="trans('employees.cars.description')"
                        @change="onCarDescriptionChange(car.id, $event)"
                    />
                </li>
            </ul>
        </div>

        <div
            v-else-if="activeTab === 'movements'"
            class="flex-1 overflow-y-auto px-6 py-6"
        >
            <div
                v-if="movementsLoading"
                class="py-8 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('common.loading') }}
            </div>
            <div
                v-else-if="!employeeMovements.length"
                class="py-8 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('employees.movements.empty') }}
            </div>
            <ul v-else class="space-y-2">
                <li
                    v-for="movement in employeeMovements"
                    :key="movement.id"
                    class="rounded-lg border border-surface-200 px-3 py-2 text-sm dark:border-surface-700"
                >
                    <div class="flex items-center justify-between">
                        <Tag
                            :severity="
                                movement.mvtype === 'Check-In'
                                    ? 'success'
                                    : 'danger'
                            "
                            :value="movement.mvtype"
                        />
                        <span class="text-surface-500 dark:text-surface-400">{{
                            formatMovementDateTime(movement, locale)
                        }}</span>
                    </div>
                    <div
                        class="mt-1 text-xs text-surface-500 dark:text-surface-400"
                    >
                        {{
                            locale === 'en'
                                ? movement.base?.name_en
                                : movement.base?.name_ar
                        }}
                        ·
                        {{
                            locale === 'en'
                                ? movement.gate?.name_en
                                : movement.gate?.name_ar
                        }}
                        <span v-if="movement.created_byname">
                            · {{ movement.created_byname }}</span
                        >
                    </div>
                </li>
            </ul>
        </div>
        <div
            v-else-if="activeTab === 'access_card'"
            class="flex-1 overflow-y-auto px-6 py-6"
        >
            <EmployeeAccessCardTab
                v-model:base-id="accessCardBaseId"
                :access-card="accessCard ?? null"
                :loading="!!accessCardLoading"
                :can-manage="canManage"
                :employee-status="editingEmployee?.status ?? null"
                :bases="bases"
                @printed="emit('printed')"
                @return-card="(badgeLogId) => emit('return-card', badgeLogId)"
            />
        </div>
    </AppSidePanel>
</template>
