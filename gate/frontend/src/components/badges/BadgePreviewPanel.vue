<template>
    <AppCard title="معاينة البطاقة" padding="lg" class="badge-preview-panel" dir="rtl">
        <div class="space-y-4">
            <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">موظف للمعاينة</label>
                <MilitaryEmployeeLookup
                    :model-value="lookupQuery"
                    placeholder="ابحث بالرقم العسكري أو الاسم"
                    mode="name"
                    @select="onEmployeeSelect"
                />
            </div>

            <div
                v-if="previewEmployee"
                class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
                <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                    <img
                        v-if="employeePhoto"
                        :src="employeePhoto"
                        alt=""
                        class="h-full w-full object-cover"
                    >
                    <i v-else class="pi pi-user text-slate-400" aria-hidden="true" />
                </div>
                <div class="min-w-0 flex-1 text-right">
                    <p class="truncate text-sm font-semibold text-slate-800">
                        {{ previewEmployee.fullname_ar || previewEmployee.fullname_en }}
                    </p>
                    <p class="text-xs text-slate-500">
                        {{ previewEmployee.military_number }}
                        <span v-if="previewEmployee.department"> · {{ previewEmployee.department }}</span>
                    </p>
                </div>
                <button
                    type="button"
                    class="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600"
                    aria-label="إزالة الموظف"
                    @click="clearEmployee"
                >
                    <i class="pi pi-times text-sm" aria-hidden="true" />
                </button>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-medium text-slate-600">{{ dimensionsLabel }}</span>
                <label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                    <input
                        type="checkbox"
                        class="rounded border-slate-300 text-brand focus:ring-brand/30"
                        :checked="useSampleData"
                        @change="$emit('update:use-sample-data', $event.target.checked)"
                    >
                    بيانات تجريبية
                </label>
            </div>

            <div
                v-if="isSamplePreview && !previewEmployee"
                class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
                معاينة تجريبية — اختر موظفاً لرؤية بيانات حقيقية
            </div>

            <div
                v-if="loading"
                class="flex items-center justify-center py-8 text-sm text-slate-500"
            >
                <i class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
                جاري تحميل بيانات الموظف…
            </div>

            <div
                v-else-if="hasTemplate"
                class="badge-preview-panel__frame"
                dir="rtl"
            >
                <div
                    ref="previewHost"
                    class="badge-preview-panel__card"
                />
            </div>

            <div
                v-else
                class="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500"
            >
                لا يوجد محتوى للمعاينة
            </div>
        </div>
    </AppCard>
</template>

<script>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import AppCard from '../ui/AppCard.vue';
import MilitaryEmployeeLookup from '../shared/MilitaryEmployeeLookup.vue';

export default {
    name: 'BadgePreviewPanel',
    components: {
        AppCard,
        MilitaryEmployeeLookup,
    },
    props: {
        previewHtml: { type: String, default: '' },
        previewEmployee: { type: Object, default: null },
        dimensionsLabel: { type: String, default: '' },
        hasTemplate: { type: Boolean, default: false },
        loading: { type: Boolean, default: false },
        useSampleData: { type: Boolean, default: true },
        isSamplePreview: { type: Boolean, default: true },
    },
    emits: ['select-employee', 'clear-employee', 'update:use-sample-data'],
    setup(props, { emit }) {
        const lookupQuery = ref('');
        const previewHost = ref(null);
        let previewShadowRoot = null;

        function renderPreviewHtml(html) {
            const host = previewHost.value;
            if (!host) {
                return;
            }

            if (!previewShadowRoot) {
                previewShadowRoot = host.attachShadow({ mode: 'open' });
            }

            previewShadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                    }

                    img {
                        max-width: 100%;
                        height: auto;
                    }

                    table {
                        width: 100%;
                    }
                </style>
                ${html || ''}
            `;
        }

        watch(
            () => [props.previewHtml, props.hasTemplate],
            ([html, hasTemplate]) => {
                if (!hasTemplate) {
                    if (previewShadowRoot) {
                        previewShadowRoot.innerHTML = '';
                    }
                    return;
                }

                renderPreviewHtml(html);
            },
            { immediate: true, flush: 'post' },
        );

        onBeforeUnmount(() => {
            previewShadowRoot = null;
        });

        const employeePhoto = computed(() => {
            const photo = props.previewEmployee?.photo || props.previewEmployee?.photot;
            if (!photo) {
                return null;
            }

            return photo.startsWith('/') ? photo : `/${photo}`;
        });

        function onEmployeeSelect(employee) {
            lookupQuery.value = employee.fullname_ar || employee.fullname_en || employee.military_number || '';
            emit('select-employee', employee);
        }

        function clearEmployee() {
            lookupQuery.value = '';
            emit('clear-employee');
        }

        watch(() => props.previewEmployee, (employee) => {
            if (!employee) {
                lookupQuery.value = '';
            }
        });

        return {
            lookupQuery,
            previewHost,
            employeePhoto,
            onEmployeeSelect,
            clearEmployee,
        };
    },
};
</script>

<style scoped>
.badge-preview-panel__frame {
    overflow: auto;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #f1f5f9;
    padding: 1rem;
}

.badge-preview-panel__card {
    margin: 0 auto;
    max-width: 100%;
    overflow: hidden;
    border-radius: 0.5rem;
    background: #fff;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}

.badge-preview-panel__card :deep(img) {
    max-width: 100%;
    height: auto;
}

.badge-preview-panel__card :deep(table) {
    width: 100%;
}
</style>
