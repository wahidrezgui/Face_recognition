<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppDepartmentTreeSelect from '@/components/AppDepartmentTreeSelect.vue';
import BadgeCanvas from '@/components/badgeDesigner/BadgeCanvas.vue';
import BadgeDesignerPreviewPanel from '@/components/badgeDesigner/BadgeDesignerPreviewPanel.vue';
import BadgeElementPropertiesPanel from '@/components/badgeDesigner/BadgeElementPropertiesPanel.vue';
import BadgeToolbar from '@/components/badgeDesigner/BadgeToolbar.vue';
import PageContainer from '@/components/PageContainer.vue';
import SegmentedTabs from '@/components/SegmentedTabs.vue';
import { useBadgeDesigner } from '@/composables/useBadgeDesigner';
import { useLocale } from '@/composables/useLocale';
import AppLayout from '@/layouts/AppLayout.vue';
import { localizedLabel } from '@/lib/employees/employeeFormUi';

defineOptions({ layout: AppLayout });

const {
    departmentOptions,
    isCompanyMode,
    companies,
    tokenKeys,
    bases,
    selectedDepId,
    departmentTree,
    onDepartmentChange,
    onCompanySelect,
    loading,
    saving,
    applyToChildren,
    activeSide,
    activeSideState,
    selectedElementId,
    selectedElement,
    childCount,
    selectElement,
    addElement,
    updateElement,
    deleteElement,
    clearSide,
    reorderElement,
    updateCardSize,
    saveActiveSide,
} = useBadgeDesigner();

const { locale } = useLocale();

const sideTabItems = computed(() => [
    { value: 'front', label: trans('employees.accessCard.front') },
    { value: 'back', label: trans('employees.accessCard.back') },
]);
</script>

<template>
    <Head
        :title="isCompanyMode ? trans('nav.companyBadge') : trans('nav.badge')"
    />

    <PageContainer
        :title="isCompanyMode ? trans('nav.companyBadge') : trans('nav.badge')"
        :description="
            isCompanyMode
                ? trans('badgeDesigner.page.companyDescription')
                : trans('badgeDesigner.page.description')
        "
    >
        <AppCard
            padding="md"
            class="mb-4"
            :title="
                isCompanyMode
                    ? trans('badgeDesigner.picker.companyTitle')
                    : trans('badgeDesigner.picker.title')
            "
        >
            <Select
                v-if="isCompanyMode"
                :model-value="selectedDepId"
                :options="companies"
                :option-label="(item) => localizedLabel(item, locale)"
                option-value="id"
                filter
                fluid
                :placeholder="trans('badgeDesigner.picker.companyPlaceholder')"
                @update:model-value="onCompanySelect"
            />
            <AppDepartmentTreeSelect
                v-else
                :model-value="departmentTree"
                :options="departmentOptions"
                :placeholder="trans('badgeDesigner.picker.placeholder')"
                @update:model-value="onDepartmentChange"
            />
        </AppCard>

        <div
            v-if="loading"
            class="py-10 text-center text-sm text-surface-500 dark:text-surface-400"
        >
            {{ trans('common.loading') }}
        </div>

        <div
            v-else-if="!departmentTree"
            class="py-10 text-center text-sm text-surface-500 dark:text-surface-400"
        >
            {{
                isCompanyMode
                    ? trans('badgeDesigner.picker.companyEmpty')
                    : trans('badgeDesigner.picker.empty')
            }}
        </div>

        <template v-else>
            <div class="mb-4">
                <SegmentedTabs v-model="activeSide" :items="sideTabItems" />
            </div>

            <AppCard
                v-if="activeSideState.format === 'raw'"
                padding="md"
                class="mb-4"
            >
                <Message
                    severity="warn"
                    variant="simple"
                    :closable="false"
                    class="mb-3"
                    >{{ trans('badgeDesigner.rawFormat.notice') }}</Message
                >
                <div class="flex flex-wrap justify-center gap-8">
                    <BadgeDesignerPreviewPanel
                        :elements="[]"
                        :width="activeSideState.width"
                        :height="activeSideState.height"
                        format="raw"
                        :raw-content="activeSideState.rawContent"
                        :bases="bases"
                    />
                </div>
                <div class="mt-4 flex justify-center">
                    <AppButton severity="danger" outlined @click="clearSide">{{
                        trans('badgeDesigner.rawFormat.startFresh')
                    }}</AppButton>
                </div>
            </AppCard>

            <template v-else>
                <BadgeToolbar
                    v-model:apply-to-children="applyToChildren"
                    :width="activeSideState.width"
                    :height="activeSideState.height"
                    :child-count="childCount"
                    :saving="saving"
                    class="mb-4"
                    @add-text="addElement('text')"
                    @add-photo="addElement('photo', 'circle')"
                    @add-qr="addElement('qr')"
                    @add-base-photo="addElement('basePhoto', 'circle')"
                    @add-zones="addElement('zones')"
                    @add-rectangle="addElement('rectangle')"
                    @add-line="addElement('line')"
                    @update:width="
                        (w) => updateCardSize(w, activeSideState.height)
                    "
                    @update:height="
                        (h) => updateCardSize(activeSideState.width, h)
                    "
                    @save="saveActiveSide"
                />

                <div
                    class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
                >
                    <div
                        class="overflow-auto rounded-lg border border-surface-100 bg-surface-50 p-6 dark:border-surface-800 dark:bg-surface-950/30"
                    >
                        <BadgeCanvas
                            :elements="activeSideState.elements"
                            :width="activeSideState.width"
                            :height="activeSideState.height"
                            :selected-element-id="selectedElementId"
                            :token-keys="tokenKeys"
                            :locale="locale"
                            @select="selectElement"
                            @update="(id, patch) => updateElement(id, patch)"
                        />
                    </div>

                    <div class="space-y-6">
                        <AppCard v-if="selectedElement" padding="md">
                            <BadgeElementPropertiesPanel
                                :element="selectedElement"
                                :token-keys="tokenKeys"
                                :locale="locale"
                                @update="
                                    (patch) =>
                                        updateElement(
                                            selectedElement!.id,
                                            patch,
                                        )
                                "
                                @delete="deleteElement(selectedElement!.id)"
                                @reorder="
                                    (direction) =>
                                        reorderElement(
                                            selectedElement!.id,
                                            direction,
                                        )
                                "
                            />
                        </AppCard>

                        <AppCard padding="md">
                            <BadgeDesignerPreviewPanel
                                :elements="activeSideState.elements"
                                :width="activeSideState.width"
                                :height="activeSideState.height"
                                :format="activeSideState.format"
                                :raw-content="activeSideState.rawContent"
                                :bases="bases"
                            />
                        </AppCard>
                    </div>
                </div>
            </template>
        </template>
    </PageContainer>
</template>
