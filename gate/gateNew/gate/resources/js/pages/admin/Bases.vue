<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import {
    DoorOpen,
    MapPinned,
    Pencil,
    Plus,
    PlusCircle,
    Trash2,
} from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import NameFormPanel from '@/components/bases/NameFormPanel.vue';
import ZoneFormPanel from '@/components/bases/ZoneFormPanel.vue';
import PageContainer from '@/components/PageContainer.vue';
import ZoneSwatch from '@/components/zones/ZoneSwatch.vue';
import { useBasesPage } from '@/composables/useBasesPage';
import { useLocale } from '@/composables/useLocale';
import AppLayout from '@/layouts/AppLayout.vue';

defineOptions({ layout: AppLayout });

const {
    bases,
    canManage,
    isOpenedCreateBase,
    isOpenedEditBase,
    createBaseForm,
    editBaseForm,
    openCreateBase,
    submitCreateBase,
    openEditBase,
    submitEditBase,
    deleteBase,
    isOpenedCreateGate,
    isOpenedEditGate,
    createGateForm,
    editGateForm,
    openCreateGate,
    submitCreateGate,
    openEditGate,
    submitEditGate,
    deleteGate,
    isOpenedCreateZone,
    isOpenedEditZone,
    createZoneForm,
    editZoneForm,
    openCreateZone,
    submitCreateZone,
    openEditZone,
    submitEditZone,
    deleteZone,
} = useBasesPage();

const { locale } = useLocale();
</script>

<template>
    <Head :title="trans('nav.bases')" />

    <PageContainer
        :title="trans('nav.bases')"
        :description="
            trans('bases.page.description', { count: String(bases.length) })
        "
    >
        <template v-if="canManage" #actions>
            <AppButton @click="openCreateBase">
                <Plus :size="16" />
                {{ trans('bases.addBase') }}
            </AppButton>
        </template>

        <AppCard v-if="bases.length === 0" padding="lg">
            <div
                class="py-12 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('bases.empty') }}
            </div>
        </AppCard>

        <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AppCard v-for="base in bases" :key="base.id" padding="md">
                <div class="mb-4 flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div
                            class="font-semibold text-surface-900 dark:text-surface-100"
                        >
                            {{
                                locale === 'en'
                                    ? base.name_en
                                    : base.name_ar || base.name_en
                            }}
                        </div>
                        <small
                            v-if="base.name_en && base.name_ar !== base.name_en"
                            dir="ltr"
                            class="text-surface-500 dark:text-surface-400"
                            >{{ base.name_en }}</small
                        >
                    </div>
                    <div
                        v-if="canManage"
                        class="flex shrink-0 items-center gap-0.5"
                    >
                        <AppButton
                            text
                            rounded
                            size="small"
                            severity="info"
                            :aria-label="trans('bases.form.edit')"
                            @click="openEditBase(base)"
                        >
                            <Pencil :size="15" />
                        </AppButton>
                        <AppButton
                            text
                            rounded
                            size="small"
                            severity="danger"
                            :aria-label="trans('bases.form.delete')"
                            @click="deleteBase(base)"
                        >
                            <Trash2 :size="15" />
                        </AppButton>
                    </div>
                </div>

                <!-- Zones -->
                <section class="mb-6">
                    <div class="mb-2 flex items-center justify-between gap-2">
                        <h4
                            class="flex items-center gap-1.5 text-sm font-semibold text-surface-800 dark:text-surface-200"
                        >
                            <MapPinned :size="15" />
                            {{ trans('bases.zones') }}
                        </h4>
                        <AppButton
                            v-if="canManage"
                            text
                            size="small"
                            severity="secondary"
                            @click="openCreateZone(base.id)"
                        >
                            <PlusCircle :size="14" />
                            {{ trans('bases.addZone') }}
                        </AppButton>
                    </div>

                    <div
                        class="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700"
                    >
                        <table
                            class="min-w-full divide-y divide-surface-200 dark:divide-surface-700"
                        >
                            <tbody
                                class="divide-y divide-surface-100 bg-surface-0 dark:divide-surface-800 dark:bg-surface-900"
                            >
                                <tr v-if="!base.zones.length">
                                    <td
                                        class="p-3 text-center text-sm text-surface-500 dark:text-surface-400"
                                    >
                                        {{ trans('bases.noZones') }}
                                    </td>
                                </tr>
                                <tr v-for="zone in base.zones" :key="zone.id">
                                    <td class="w-10 p-2">
                                        <ZoneSwatch
                                            :zone="zone"
                                            size="lg"
                                            shape="circle"
                                        />
                                    </td>
                                    <td
                                        class="p-2 text-sm font-medium text-surface-900 dark:text-surface-100"
                                    >
                                        {{
                                            locale === 'en'
                                                ? zone.name_en
                                                : zone.name_ar || zone.name_en
                                        }}
                                    </td>
                                    <td class="p-2 text-end">
                                        <div
                                            v-if="canManage"
                                            class="flex items-center justify-end gap-0.5"
                                        >
                                            <AppButton
                                                text
                                                rounded
                                                size="small"
                                                severity="info"
                                                :aria-label="
                                                    trans('bases.form.edit')
                                                "
                                                @click="openEditZone(zone)"
                                            >
                                                <Pencil :size="14" />
                                            </AppButton>
                                            <AppButton
                                                text
                                                rounded
                                                size="small"
                                                severity="danger"
                                                :aria-label="
                                                    trans('bases.form.delete')
                                                "
                                                @click="deleteZone(zone)"
                                            >
                                                <Trash2 :size="14" />
                                            </AppButton>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- Gates -->
                <section>
                    <div class="mb-2 flex items-center justify-between gap-2">
                        <h4
                            class="flex items-center gap-1.5 text-sm font-semibold text-surface-800 dark:text-surface-200"
                        >
                            <DoorOpen :size="15" />
                            {{ trans('bases.gates') }}
                        </h4>
                        <AppButton
                            v-if="canManage"
                            text
                            size="small"
                            severity="secondary"
                            @click="openCreateGate(base.id)"
                        >
                            <PlusCircle :size="14" />
                            {{ trans('bases.addGate') }}
                        </AppButton>
                    </div>

                    <div
                        class="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700"
                    >
                        <table
                            class="min-w-full divide-y divide-surface-200 dark:divide-surface-700"
                        >
                            <tbody
                                class="divide-y divide-surface-100 bg-surface-0 dark:divide-surface-800 dark:bg-surface-900"
                            >
                                <tr v-if="!base.gates.length">
                                    <td
                                        class="p-3 text-center text-sm text-surface-500 dark:text-surface-400"
                                    >
                                        {{ trans('bases.noGates') }}
                                    </td>
                                </tr>
                                <tr v-for="gate in base.gates" :key="gate.id">
                                    <td
                                        class="p-2 text-sm font-medium text-surface-900 dark:text-surface-100"
                                    >
                                        {{
                                            locale === 'en'
                                                ? gate.name_en
                                                : gate.name_ar || gate.name_en
                                        }}
                                    </td>
                                    <td class="p-2 text-end">
                                        <div
                                            v-if="canManage"
                                            class="flex items-center justify-end gap-0.5"
                                        >
                                            <AppButton
                                                text
                                                rounded
                                                size="small"
                                                severity="info"
                                                :aria-label="
                                                    trans('bases.form.edit')
                                                "
                                                @click="openEditGate(gate)"
                                            >
                                                <Pencil :size="14" />
                                            </AppButton>
                                            <AppButton
                                                text
                                                rounded
                                                size="small"
                                                severity="danger"
                                                :aria-label="
                                                    trans('bases.form.delete')
                                                "
                                                @click="deleteGate(gate)"
                                            >
                                                <Trash2 :size="14" />
                                            </AppButton>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </AppCard>
        </div>

        <NameFormPanel
            :open="isOpenedCreateBase"
            :title="trans('bases.form.createBaseTitle')"
            :subtitle="trans('bases.form.createBaseSubtitle')"
            :save-label="trans('bases.form.save')"
            :form="createBaseForm"
            :name-en-placeholder="trans('bases.form.baseNamePlaceholder')"
            @update:open="isOpenedCreateBase = $event"
            @submit="submitCreateBase"
        />
        <NameFormPanel
            :open="isOpenedEditBase"
            :title="trans('bases.form.editBaseTitle')"
            :subtitle="trans('bases.form.editBaseSubtitle')"
            :save-label="trans('bases.form.update')"
            :form="editBaseForm"
            @update:open="isOpenedEditBase = $event"
            @submit="submitEditBase"
        />

        <NameFormPanel
            :open="isOpenedCreateGate"
            :title="trans('bases.form.createGateTitle')"
            :subtitle="trans('bases.form.createGateSubtitle')"
            :save-label="trans('bases.form.save')"
            :form="createGateForm"
            :name-en-placeholder="trans('bases.form.gateNamePlaceholder')"
            @update:open="isOpenedCreateGate = $event"
            @submit="submitCreateGate"
        />
        <NameFormPanel
            :open="isOpenedEditGate"
            :title="trans('bases.form.editGateTitle')"
            :subtitle="trans('bases.form.editGateSubtitle')"
            :save-label="trans('bases.form.update')"
            :form="editGateForm"
            @update:open="isOpenedEditGate = $event"
            @submit="submitEditGate"
        />

        <ZoneFormPanel
            :open="isOpenedCreateZone"
            :title="trans('bases.form.createZoneTitle')"
            :subtitle="trans('bases.form.createZoneSubtitle')"
            :save-label="trans('bases.form.save')"
            :form="createZoneForm"
            field-id="create-zone"
            @update:open="isOpenedCreateZone = $event"
            @submit="submitCreateZone"
        />
        <ZoneFormPanel
            :open="isOpenedEditZone"
            :title="trans('bases.form.editZoneTitle')"
            :subtitle="trans('bases.form.editZoneSubtitle')"
            :save-label="trans('bases.form.update')"
            :form="editZoneForm"
            field-id="edit-zone"
            @update:open="isOpenedEditZone = $event"
            @submit="submitEditZone"
        />
    </PageContainer>
</template>
