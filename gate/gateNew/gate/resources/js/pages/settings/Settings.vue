<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { Clock, Pencil, Plus, Trash2 } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppDepartmentTreeSelect from '@/components/AppDepartmentTreeSelect.vue';
import PageContainer from '@/components/PageContainer.vue';
import CheckTimeFormPanel from '@/components/settings/CheckTimeFormPanel.vue';
import { useLocale } from '@/composables/useLocale';
import { useSettingsPage } from '@/composables/useSettingsPage';
import AppLayout from '@/layouts/AppLayout.vue';

defineOptions({ layout: AppLayout });

const {
    departmentOptions,
    genders,
    rankCategories,
    checkTimes,
    canManage,
    selectedDepId,
    departmentTree,
    onDepartmentChange,
    isOpenedCreate,
    isOpenedEdit,
    createForm,
    editForm,
    openCreateDialog,
    submitCreate,
    openEditDialog,
    submitEdit,
    deleteCheckTime,
} = useSettingsPage();

const { locale } = useLocale();
</script>

<template>
    <Head :title="trans('nav.settings')" />

    <PageContainer
        :title="trans('nav.settings')"
        :description="trans('settings.page.description')"
    >
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <AppCard padding="md" :title="trans('settings.picker.title')">
                <AppDepartmentTreeSelect
                    :model-value="departmentTree"
                    :options="departmentOptions"
                    :placeholder="trans('settings.picker.placeholder')"
                    @update:model-value="onDepartmentChange"
                />
            </AppCard>

            <AppCard padding="md" class="lg:col-span-2">
                <div class="mb-4 flex items-center justify-between">
                    <h2
                        class="text-base font-semibold text-surface-800 dark:text-surface-100"
                    >
                        {{ trans('settings.table.title') }}
                    </h2>
                    <AppButton
                        v-if="canManage"
                        size="small"
                        :disabled="!selectedDepId"
                        @click="openCreateDialog"
                    >
                        <Plus :size="16" />
                        {{ trans('settings.table.addTime') }}
                    </AppButton>
                </div>

                <DataTable :value="checkTimes" data-key="id" striped-rows>
                    <template #empty>
                        <div
                            class="py-10 text-center text-sm text-surface-500 dark:text-surface-400"
                        >
                            <Clock
                                :size="28"
                                class="mx-auto mb-2 text-surface-300 dark:text-surface-600"
                            />
                            {{
                                selectedDepId
                                    ? trans('settings.table.empty')
                                    : trans(
                                          'settings.table.selectDepartmentFirst',
                                      )
                            }}
                        </div>
                    </template>

                    <Column :header="trans('settings.table.gender')">
                        <template #body="{ data }">{{
                            locale === 'en'
                                ? data.gender?.name_en
                                : data.gender?.name_ar
                        }}</template>
                    </Column>

                    <Column :header="trans('settings.table.rankCategory')">
                        <template #body="{ data }">{{
                            locale === 'en'
                                ? data.rank_category?.name_en
                                : data.rank_category?.name_ar
                        }}</template>
                    </Column>

                    <Column :header="trans('settings.table.startTime')">
                        <template #body="{ data }">
                            <Tag
                                severity="success"
                                :value="data.start_time.slice(0, 5)"
                            />
                        </template>
                    </Column>

                    <Column :header="trans('settings.table.endTime')">
                        <template #body="{ data }">
                            <Tag
                                severity="warn"
                                :value="data.end_time.slice(0, 5)"
                            />
                        </template>
                    </Column>

                    <Column
                        v-if="canManage"
                        :header="trans('settings.table.actions')"
                        style="width: 7rem"
                    >
                        <template #body="{ data }">
                            <div class="flex items-center gap-1">
                                <AppButton
                                    text
                                    rounded
                                    size="small"
                                    severity="info"
                                    :aria-label="trans('settings.table.edit')"
                                    @click="openEditDialog(data)"
                                >
                                    <Pencil :size="15" />
                                </AppButton>
                                <AppButton
                                    text
                                    rounded
                                    size="small"
                                    severity="danger"
                                    :aria-label="trans('settings.table.delete')"
                                    @click="deleteCheckTime(data)"
                                >
                                    <Trash2 :size="15" />
                                </AppButton>
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </AppCard>
        </div>

        <CheckTimeFormPanel
            :open="isOpenedCreate"
            :title="trans('settings.form.createTitle')"
            :subtitle="trans('settings.form.createSubtitle')"
            :save-label="trans('settings.form.save')"
            :form="createForm"
            :genders="genders"
            :rank-categories="rankCategories"
            @update:open="isOpenedCreate = $event"
            @submit="submitCreate"
        />

        <CheckTimeFormPanel
            :open="isOpenedEdit"
            :title="trans('settings.form.editTitle')"
            :subtitle="trans('settings.form.editSubtitle')"
            :save-label="trans('settings.form.update')"
            :form="editForm"
            :genders="genders"
            :rank-categories="rankCategories"
            @update:open="isOpenedEdit = $event"
            @submit="submitEdit"
        />
    </PageContainer>
</template>
