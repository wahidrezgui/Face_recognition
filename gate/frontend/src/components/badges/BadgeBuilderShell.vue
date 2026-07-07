<template>
    <div dir="rtl" class="space-y-4">
        <AppCard padding="lg">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div class="min-w-0 flex-1 space-y-2">
                    <label class="block text-sm font-medium text-slate-700">الوحدة</label>
                    <TreeSelect
                        v-model="selectedDeptTree"
                        :options="departments"
                        placeholder="اختر الوحدة"
                        show-clear
                        filter
                        filter-mode="lenient"
                        filter-placeholder="ابحث في الوحدات..."
                        class="badge-builder-treeselect w-full max-w-xl"
                        :loading="departmentsLoading"
                        @update:model-value="onDepartmentTreeChange"
                    >
                        <template #value>
                            <span v-if="selectedDeptLabel" class="badge-builder-treeselect-value">
                                {{ selectedDeptLabel }}
                            </span>
                            <span v-else class="badge-builder-treeselect-placeholder">اختر الوحدة</span>
                        </template>
                    </TreeSelect>
                    <p class="text-xs text-slate-500">
                        يُطبَّق القالب على الموظفين الذين تتبع وحدتهم الأم هذه الوحدة  .
                    </p>
                </div>

                <div v-if="selectedDeptId" class="flex flex-wrap items-center gap-2">
                    <Tag
                        :severity="frontExists ? 'success' : 'warning'"
                        :value="frontExists ? 'الوجه الأمامي: موجود' : 'الوجه الأمامي: غير موجود'"
                    />
                    <Tag
                        :severity="backExists ? 'success' : 'warning'"
                        :value="backExists ? 'الوجه الخلفي: موجود' : 'الوجه الخلفي: غير موجود'"
                    />
                </div>
            </div>
        </AppCard>

        <div v-if="!selectedDeptId" class="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <i class="pi pi-id-card mb-3 block text-4xl text-slate-300" aria-hidden="true" />
            <p class="text-sm text-slate-500">اختر وحدة لبدء تصميم بطاقة الدخول</p>
        </div>

        <template v-else>
            <AppLoader v-if="isLoading" variant="inline" label="جاري تحميل القالب…" />

            <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div class="space-y-4 xl:col-span-8">
                    <AppCard padding="lg">
                        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div
                                class="badge-side-tabs inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
                                role="tablist"
                                aria-label="وجه البطاقة"
                            >
                                <button
                                    v-for="side in sideOptions"
                                    :key="side.value"
                                    type="button"
                                    role="tab"
                                    :aria-selected="activeSide === side.value"
                                    class="badge-side-tabs__btn rounded-md px-4 py-2 text-sm transition-colors"
                                    :class="activeSide === side.value
                                        ? 'bg-white text-brand shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'"
                                    @click="setActiveSide(side.value)"
                                >
                                    {{ side.label }}
                                </button>
                            </div>

                            <div class="flex flex-wrap items-center gap-3">
                                <label
                                    v-if="childDeptCount > 0"
                                    class="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                                >
                                    <Checkbox
                                        v-model="applyToChildren"
                                        input-id="apply-badge-to-children"
                                        :binary="true"
                                        :disabled="isSaving"
                                    />
                                    <span>تطبيق على الوحدات الفرعية ({{ childDeptCount }})</span>
                                </label>
                                <AppButton
                                    variant="secondary"
                                    size="sm"
                                    :disabled="isSaving"
                                    @click="createDefaultForActiveSide"
                                >
                                    إنشاء قالب افتراضي
                                </AppButton>
                                <AppButton
                                    size="sm"
                                    :disabled="isSaving || !hasTemplate"
                                    @click="saveActiveSide"
                                >
                                    <i v-if="isSaving" class="pi pi-spin pi-spinner ms-1" aria-hidden="true" />
                                    حفظ {{ BADGE_SIDE_LABELS[activeSide] }}
                                </AppButton>
                            </div>
                        </div>

                        <div class="mb-4 flex flex-wrap items-end gap-4">
                            <div class="w-28">
                                <label class="mb-1 block text-xs font-medium text-slate-600">العرض (مم)</label>
                                <input
                                    v-model="activeBadge.width"
                                    type="number"
                                    min="1"
                                    class="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                                >
                            </div>
                            <div class="w-28">
                                <label class="mb-1 block text-xs font-medium text-slate-600">الارتفاع (مم)</label>
                                <input
                                    v-model="activeBadge.heigth"
                                    type="number"
                                    min="1"
                                    class="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                                >
                            </div>
                            <p v-if="activeBadge.width && activeBadge.heigth" class="text-xs text-slate-500">
                                المقاس المحفوظ: {{ activeBadge.width }}×{{ activeBadge.heigth }} مم
                            </p>
                        </div>

                        <HtmlCodeEditor
                            v-model="activeBadge.content"
                            min-height="420px"
                        />

                        <p v-if="isActiveSideDirty" class="mt-3 text-xs text-amber-600">
                            لديك تغييرات غير محفوظة على {{ BADGE_SIDE_LABELS[activeSide] }}.
                        </p>
                    </AppCard>
                </div>

                <div class="xl:col-span-4">
                    <div class="xl:sticky xl:top-4">
                        <BadgePreviewPanel
                            :preview-html="previewHtml"
                            :preview-employee="previewEmployee"
                            :dimensions-label="previewDimensionsLabel"
                            :has-template="hasTemplate"
                            :loading="previewEmployeeLoading"
                            :use-sample-data="useSamplePreviewData"
                            :is-sample-preview="isSamplePreview"
                            @select-employee="onPreviewEmployeeSelect"
                            @clear-employee="onPreviewEmployeeSelect(null)"
                            @update:use-sample-data="setUseSamplePreviewData"
                        />
                    </div>
                </div>
            </div>

            <div
                v-if="selectedDeptId && !isLoading"
                class="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur xl:hidden"
            >
                <label
                    v-if="childDeptCount > 0"
                    class="mb-2 flex cursor-pointer items-center justify-center gap-2 text-sm text-slate-600"
                >
                    <Checkbox
                        v-model="applyToChildren"
                        input-id="apply-badge-to-children-mobile"
                        :binary="true"
                        :disabled="isSaving"
                    />
                    <span>تطبيق على الوحدات الفرعية ({{ childDeptCount }})</span>
                </label>
                <AppButton
                    class="w-full"
                    :disabled="isSaving || !hasTemplate"
                    @click="saveActiveSide"
                >
                    <i v-if="isSaving" class="pi pi-spin pi-spinner ms-1" aria-hidden="true" />
                    حفظ {{ BADGE_SIDE_LABELS[activeSide] }}
                </AppButton>
            </div>
        </template>
    </div>
</template>

<script>
import Tag from 'primevue/tag';
import Checkbox from 'primevue/checkbox';
import TreeSelect from 'primevue/treeselect';
import AppCard from '../ui/AppCard.vue';
import AppButton from '../ui/AppButton.vue';
import AppLoader from '../shared/AppLoader.vue';
import HtmlCodeEditor from '../shared/HtmlCodeEditor.vue';
import BadgePreviewPanel from './BadgePreviewPanel.vue';
import { useBadgeBuilder } from '../../composables/useBadgeBuilder';

export default {
    name: 'BadgeBuilderShell',
    components: {
        Tag,
        Checkbox,
        TreeSelect,
        AppCard,
        AppButton,
        AppLoader,
        HtmlCodeEditor,
        BadgePreviewPanel,
    },
    setup() {
        const builder = useBadgeBuilder();

        const sideOptions = [
            { value: builder.BADGE_SIDES.front, label: builder.BADGE_SIDE_LABELS.front },
            { value: builder.BADGE_SIDES.back, label: builder.BADGE_SIDE_LABELS.back },
        ];

        return {
            ...builder,
            sideOptions,
        };
    },
};
</script>

<style scoped>
.badge-side-tabs__btn {
    font-weight: 400;
}

.badge-builder-treeselect-placeholder {
    color: #94a3b8;
}

.badge-builder-treeselect :deep(.p-treeselect) {
    direction: rtl;
    text-align: right;
}

.badge-builder-treeselect :deep(.p-treeselect-label) {
    text-align: right;
}
</style>
