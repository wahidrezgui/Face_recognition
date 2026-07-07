<template>
    <AppCard title="معايير البحث" subtitle="Search criteria" padding="lg" class="mb-6" dir="rtl">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div v-if="mode === 'issues'" :class="fieldWrap">
                <label :for="`${idPrefix}-company`" :class="labelClass" title="Company">الشركة</label>
                <TreeSelect
                    :id="`${idPrefix}-company`"
                    v-model="filters.selectedCompany"
                    :options="lookups.companies"
                    placeholder="اختر الشركة"
                    show-clear
                    class="report-treeselect w-full"
                    @keydown.enter="onSearch"
                />
            </div>

            <div :class="fieldWrap">
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

            <div v-if="mode === 'issues'" :class="[fieldWrap, 'md:col-span-2']">
                <span :class="labelClass" title="Registration">التسجيل</span>
                <div class="flex flex-wrap items-center gap-4 pt-1">
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox v-model="filters.selectedMvTypes" input-id="company-checkin" value="Check-In" />
                        Check-In
                    </label>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox v-model="filters.selectedMvTypes" input-id="company-checkout" value="Check-Out" />
                        Check-Out
                    </label>
                </div>
            </div>
        </div>

        <div class="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <AppButton v-if="showPrint && hasResults" variant="secondary" size="sm" title="Print" @click="$emit('print')">
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
import Checkbox from 'primevue/checkbox';
import AppCard from '../ui/AppCard.vue';
import AppButton from '../ui/AppButton.vue';

const labelClass = 'text-sm font-semibold text-slate-700';
const fieldWrap = 'flex flex-col gap-1.5';
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 text-right focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

let panelId = 0;

export default {
    name: 'CompanyReportSearchPanel',
    components: {
        AppCard,
        AppButton,
        TreeSelect,
        Checkbox,
    },
    props: {
        preset: { type: Object, required: true },
        filters: { type: Object, required: true },
        lookups: {
            type: Object,
            default: () => ({ companies: [] }),
        },
        hasResults: { type: Boolean, default: false },
        mode: {
            type: String,
            default: 'basic',
            validator: (value) => ['basic', 'issues'].includes(value),
        },
    },
    emits: ['search', 'reset', 'print', 'export'],
    setup(props, { emit }) {
        const toast = useToast();
        const idPrefix = `company-report-search-${++panelId}`;

        const showPrint = props.preset.showPrint !== false;

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
            idPrefix,
            labelClass,
            fieldWrap,
            inputClass,
            showPrint,
            onSearch,
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
</style>
