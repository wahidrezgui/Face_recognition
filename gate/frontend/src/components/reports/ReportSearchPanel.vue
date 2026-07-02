<template>
    <AppCard title="معايير البحث" subtitle="Search criteria" padding="lg" class="mb-6" dir="rtl">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-12">
            <div :class="[fieldWrap, 'md:col-span-2 xl:col-span-2 2xl:col-span-4']">
                <label :for="`${idPrefix}-employee`" :class="labelClass" title="Employee Name">اسم الموظف</label>
                <MilitaryEmployeeLookup
                    :input-id="`${idPrefix}-employee`"
                    v-model="filters.employeeName"
                    mode="name"
                    placeholder="اسم الموظف أو الرقم العسكري"
                    @select="onEmployeePicked"
                    @update:model-value="onEmployeeQueryInput"
                    @enter="onSearch"
                />
            </div>

            <template v-if="preset.dateMode === 'single'">
                <div :class="[fieldWrap, '2xl:col-span-2']">
                    <label :for="`${idPrefix}-date`" :class="labelClass" title="Date">التاريخ</label>
                    <input
                        :id="`${idPrefix}-date`"
                        v-model="filters.date"
                        type="date"
                        dir="rtl"
                        :class="[inputClass, 'report-date-input']"
                        @keydown.enter="onSearch"
                    >
                </div>
            </template>

            <template v-else>
                <div :class="[fieldWrap, '2xl:col-span-2']">
                    <label :for="`${idPrefix}-from`" :class="labelClass" title="From">من</label>
                    <input
                        :id="`${idPrefix}-from`"
                        v-model="filters.fromDate"
                        type="date"
                        dir="rtl"
                        :class="[inputClass, 'report-date-input']"
                        @keydown.enter="onSearch"
                    >
                </div>
                <div :class="[fieldWrap, '2xl:col-span-2']">
                    <label :for="`${idPrefix}-to`" :class="labelClass" title="To">الى</label>
                    <input
                        :id="`${idPrefix}-to`"
                        v-model="filters.toDate"
                        type="date"
                        dir="rtl"
                        :class="[inputClass, 'report-date-input']"
                        @keydown.enter="onSearch"
                    >
                </div>
            </template>

            <div :class="[fieldWrap, '2xl:col-span-2']">
                <label :for="`${idPrefix}-rank`" :class="labelClass" title="Rank">الرتبة</label>
                <TreeSelect
                    :id="`${idPrefix}-rank`"
                    v-model="filters.selectedRanks"
                    :options="lookups.ranks"
                    placeholder="اختر الرتبة"
                    show-clear
                    selection-mode="checkbox"
                    :meta-key-selection="false"
                    class="report-treeselect w-full"
                    @keydown.enter="onSearch"
                />
            </div>

            <div :class="[fieldWrap, '2xl:col-span-1']">
                <label :for="`${idPrefix}-department`" :class="labelClass" title="Unit">الوحدة</label>
                <TreeSelect
                    :id="`${idPrefix}-department`"
                    v-model="filters.selectedDepartment"
                    :options="lookups.departments"
                    placeholder="اختر الوحدة"
                    show-clear
                    class="report-treeselect w-full"
                    @keydown.enter="onSearch"
                />
            </div>

            <div :class="[fieldWrap, '2xl:col-span-1']">
                <label :for="`${idPrefix}-gender`" :class="labelClass" title="Gender">الجنس</label>
                <select
                    :id="`${idPrefix}-gender`"
                    v-model="filters.selectedGender"
                    :class="inputClass"
                    @keydown.enter="onSearch"
                >
                    <option value="">الكل</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                </select>
            </div>
        </div>

        <div class="mt-4 border-t border-slate-100 pt-4">
            <button
                type="button"
                class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/20 rounded-lg px-1 py-1"
                :aria-expanded="advancedOpen"
                @click="advancedOpen = !advancedOpen"
            >
                <i
                    class="pi pi-chevron-down text-xs transition-transform duration-200"
                    :class="{ 'rotate-180': advancedOpen }"
                />
                بحث متقدم
            </button>

            <div
                class="advanced-panel grid overflow-hidden transition-[grid-template-rows] duration-200 motion-reduce:transition-none"
                :class="advancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
            >
                <div class="min-h-0">
                    <div class="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
                        <div :class="fieldWrap">
                            <label :for="`${idPrefix}-type`" :class="labelClass" title="Registration">التسجيل</label>
                            <select
                                :id="`${idPrefix}-type`"
                                v-model="filters.selectedType"
                                :class="inputClass"
                                @keydown.enter="onSearch"
                            >
                                <option value="">الكل</option>
                                <option value="Check-In">دخول</option>
                                <option value="Check-Out">خروج</option>
                            </select>
                        </div>

                        <div :class="fieldWrap">
                            <label :for="`${idPrefix}-base`" :class="labelClass" title="Base">القاعدة</label>
                            <TreeSelect
                                :id="`${idPrefix}-base`"
                                v-model="filters.selectedBases"
                                :options="lookups.bases"
                                placeholder="اختر القاعدة"
                                show-clear
                                selection-mode="checkbox"
                                :meta-key-selection="false"
                                class="report-treeselect w-full"
                                @keydown.enter="onSearch"
                            />
                        </div>

                        <div :class="fieldWrap">
                            <label :for="`${idPrefix}-gate`" :class="labelClass" title="Gate">البوابة</label>
                            <TreeSelect
                                :id="`${idPrefix}-gate`"
                                v-model="filters.selectedGates"
                                :options="lookups.gates"
                                placeholder="اختر البوابة"
                                show-clear
                                selection-mode="checkbox"
                                :meta-key-selection="false"
                                class="report-treeselect w-full"
                                @keydown.enter="onSearch"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <AppButton v-if="hasResults" variant="secondary" size="sm" title="Print" @click="$emit('print')">
                <i class="pi pi-print" />
                طباعة
            </AppButton>
            <AppButton v-if="hasResults" variant="secondary" size="sm" title="Export Excel" @click="$emit('export')">
                <i class="pi pi-file-export" />
                اكسيل
            </AppButton>
            <AppButton variant="danger" size="sm" title="Reset" @click="$emit('reset')">
                <i class="pi pi-refresh" />
                اعادة ضبط
            </AppButton>
            <AppButton size="sm" title="Search" @click="onSearch">
                <i class="pi pi-search" />
                بحث
            </AppButton>
        </div>
    </AppCard>
</template>

<script>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import TreeSelect from 'primevue/treeselect';
import AppCard from '../ui/AppCard.vue';
import AppButton from '../ui/AppButton.vue';
import MilitaryEmployeeLookup from '../shared/MilitaryEmployeeLookup.vue';

const labelClass = 'text-sm font-semibold text-slate-700';
const fieldWrap = 'flex flex-col gap-1.5';
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 text-right focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

let panelId = 0;

export default {
    name: 'ReportSearchPanel',
    components: {
        AppCard,
        AppButton,
        TreeSelect,
        MilitaryEmployeeLookup,
    },
    props: {
        preset: { type: Object, required: true },
        filters: { type: Object, required: true },
        lookups: {
            type: Object,
            default: () => ({
                departments: [],
                ranks: [],
                bases: [],
                gates: [],
            }),
        },
        hasResults: { type: Boolean, default: false },
    },
    emits: ['search', 'reset', 'print', 'export'],
    setup(props, { emit }) {
        const toast = useToast();
        const advancedOpen = ref(false);
        const idPrefix = `report-search-${++panelId}`;

        function onEmployeePicked(employee) {
            props.filters.employeeName = employee.fullname_ar || employee.fullname_en || '';
            props.filters.militaryNumber = employee.military_number == null
                ? ''
                : String(employee.military_number);
        }

        function onEmployeeQueryInput() {
            props.filters.militaryNumber = '';
        }

        function onSearch() {
            if (props.preset.requireDate && !props.filters.date) {
                toast.add({
                    severity: 'warn',
                    summary: 'تحذير',
                    detail: 'يرجى تحديد التاريخ',
                    life: 3000,
                });
                return;
            }
            emit('search');
        }

        return {
            advancedOpen,
            idPrefix,
            labelClass,
            fieldWrap,
            inputClass,
            onSearch,
            onEmployeePicked,
            onEmployeeQueryInput,
        };
    },
};
</script>

<style scoped>
.report-date-input {
    width: 100%;
    min-width: 10.75rem;
    max-width: 12.5rem;
}

@media (min-width: 1536px) {
    .report-date-input {
        max-width: 100%;
    }
}

.report-treeselect :deep(.p-treeselect) {
    width: 100%;
    min-height: 2.75rem;
    border-radius: 0.75rem;
    border-color: #e2e8f0;
}

.report-treeselect :deep(.p-treeselect:not(.p-disabled):hover) {
    border-color: #cbd5e1;
}

.report-treeselect :deep(.p-treeselect:not(.p-disabled).p-focus) {
    border-color: var(--color-brand);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand) 20%, transparent);
}

.report-treeselect :deep(.p-treeselect .p-treeselect-label) {
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
}

@media (prefers-reduced-motion: reduce) {
    .advanced-panel {
        transition: none !important;
    }
}
</style>
