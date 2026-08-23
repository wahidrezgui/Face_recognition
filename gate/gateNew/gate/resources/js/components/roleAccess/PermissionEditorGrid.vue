<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import { computed } from 'vue';
import AppCard from '@/components/AppCard.vue';
import { useLocale } from '@/composables/useLocale';
import type { AccessCatalogPayload, ResourceLevel, ScopeLevel } from '@/types';

interface Props {
    catalog: AccessCatalogPayload;
    locked: boolean;
}

const props = defineProps<Props>();

const routeAccess = defineModel<Record<string, boolean>>('routeAccess', {
    required: true,
});
const resourceAccess = defineModel<Record<string, ResourceLevel>>(
    'resourceAccess',
    { required: true },
);
const resourceScopeAccess = defineModel<Record<string, ScopeLevel>>(
    'resourceScopeAccess',
    { required: true },
);

const { locale } = useLocale();

function localizedMeta(meta: { label_ar: string; label_en: string }): string {
    return locale.value === 'en'
        ? meta.label_en
        : meta.label_ar || meta.label_en;
}

const resourceLevelOptions = computed(() => [
    { value: 'none', label: trans('rolePermissions.grid.levelNone') },
    { value: 'read', label: trans('rolePermissions.grid.levelRead') },
    { value: 'write', label: trans('rolePermissions.grid.levelWrite') },
]);

const scopeLevelOptions = computed(() => [
    { value: 'none', label: trans('rolePermissions.grid.scopeNone') },
    ...Object.entries(props.catalog.scope_levels).map(([value, meta]) => ({
        value,
        label: localizedMeta(meta),
    })),
]);

function isScopable(key: string): boolean {
    return props.catalog.scopable_resources.includes(key);
}

function toggleRoute(key: string, checked: boolean) {
    routeAccess.value = { ...routeAccess.value, [key]: checked };
}
</script>

<template>
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AppCard
            :title="trans('rolePermissions.grid.routesTitle')"
            :subtitle="trans('rolePermissions.grid.routesSubtitle')"
            padding="lg"
        >
            <div class="max-h-[520px] space-y-2 overflow-y-auto pe-1">
                <div
                    v-for="(route, key) in catalog.routes"
                    :key="key"
                    role="button"
                    tabindex="0"
                    class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-surface-100 px-3 py-2 hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800"
                    :class="{ 'cursor-not-allowed opacity-60': locked }"
                    @click="
                        !locked &&
                        toggleRoute(String(key), !(routeAccess[key] === true))
                    "
                    @keydown.enter.prevent="
                        !locked &&
                        toggleRoute(String(key), !(routeAccess[key] === true))
                    "
                    @keydown.space.prevent="
                        !locked &&
                        toggleRoute(String(key), !(routeAccess[key] === true))
                    "
                >
                    <span
                        class="text-sm text-surface-800 dark:text-surface-200"
                        >{{ localizedMeta(route) }}</span
                    >
                    <span @click.stop>
                        <Checkbox
                            :model-value="routeAccess[key] === true"
                            binary
                            :disabled="locked"
                            @update:model-value="
                                (v) => toggleRoute(String(key), v === true)
                            "
                        />
                    </span>
                </div>
            </div>
        </AppCard>

        <AppCard
            :title="trans('rolePermissions.grid.resourcesTitle')"
            :subtitle="trans('rolePermissions.grid.resourcesSubtitle')"
            padding="lg"
        >
            <div class="space-y-3">
                <div
                    v-for="(resource, key) in catalog.resources"
                    :key="key"
                    class="flex flex-col gap-2 rounded-lg border border-surface-100 px-3 py-3 dark:border-surface-800"
                >
                    <span
                        class="text-sm font-medium text-surface-800 dark:text-surface-200"
                        >{{ localizedMeta(resource) }}</span
                    >
                    <div
                        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
                    >
                        <Select
                            v-model="resourceAccess[key]"
                            :options="resourceLevelOptions"
                            option-label="label"
                            option-value="value"
                            class="w-full sm:w-52"
                            :disabled="locked"
                        />
                        <Select
                            v-if="isScopable(key)"
                            v-model="resourceScopeAccess[key]"
                            :options="scopeLevelOptions"
                            option-label="label"
                            option-value="value"
                            class="w-full sm:w-52"
                            :disabled="locked"
                        />
                    </div>
                </div>
            </div>
        </AppCard>
    </div>
</template>
