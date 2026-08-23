<script setup lang="ts">
import { ChevronsDown, ChevronsUp, Search } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import { useLocale } from '@/composables/useLocale';
import {
    buildDefaultCollapsedKeys,
    collectCollapsibleKeys,
    decorateDepartmentNode,
    filterDepartmentTree,
} from '@/lib/organization/departmentTreeHelpers';
import type { DepartmentNode } from '@/types';
import DepartmentTreeRows from './DepartmentTreeRows.vue';

interface Props {
    rootNode: DepartmentNode;
    canDelete?: boolean;
    canManage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    canDelete: false,
    canManage: true,
});

const emit = defineEmits<{
    'create-child': [id: number | string | null];
    edit: [id: number | string | null];
    delete: [id: number | string | null];
}>();

const { locale } = useLocale();

const treeFilter = ref('');
const collapsedKeys = ref<Record<string | number, boolean>>({});

const decoratedRoot = computed(() => {
    const filtered = filterDepartmentTree([props.rootNode], treeFilter.value);

    return filtered[0]
        ? decorateDepartmentNode(filtered[0], 0, locale.value)
        : null;
});

function applyDefaultCollapse() {
    collapsedKeys.value = decoratedRoot.value
        ? buildDefaultCollapsedKeys(decoratedRoot.value, 1)
        : {};
}

function expandAll() {
    collapsedKeys.value = {};
}

function collapseAll() {
    collapsedKeys.value = decoratedRoot.value
        ? collectCollapsibleKeys(decoratedRoot.value)
        : {};
}

watch(
    () => props.rootNode?.id ?? props.rootNode?.key,
    () => applyDefaultCollapse(),
    { immediate: true },
);

watch(treeFilter, (value) => {
    if (value.trim()) {
        collapsedKeys.value = {};
    } else {
        applyDefaultCollapse();
    }
});
</script>

<template>
    <AppCard padding="md" class="flex min-h-0 flex-1 flex-col">
        <div class="mb-3 flex shrink-0 items-center gap-2">
            <IconField class="flex-1">
                <InputIcon>
                    <Search :size="15" />
                </InputIcon>
                <InputText
                    v-model="treeFilter"
                    fluid
                    :placeholder="
                        trans('departments.hierarchy.searchPlaceholder')
                    "
                />
            </IconField>

            <AppButton
                text
                rounded
                severity="secondary"
                :aria-label="trans('departments.hierarchy.expandAll')"
                :title="trans('departments.hierarchy.expandAll')"
                @click="expandAll"
            >
                <ChevronsDown :size="17" />
            </AppButton>
            <AppButton
                text
                rounded
                severity="secondary"
                :aria-label="trans('departments.hierarchy.collapseAll')"
                :title="trans('departments.hierarchy.collapseAll')"
                @click="collapseAll"
            >
                <ChevronsUp :size="17" />
            </AppButton>
        </div>

        <div
            v-if="!decoratedRoot"
            class="rounded-lg border border-dashed border-surface-200 p-4 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400"
        >
            {{ trans('departments.hierarchy.noResults') }}
        </div>

        <div
            v-else
            class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-950/40"
        >
            <DepartmentTreeRows
                :nodes="[decoratedRoot]"
                :collapsed-keys="collapsedKeys"
                :can-delete="canDelete"
                :can-manage="canManage"
                @update:collapsed-keys="collapsedKeys = $event"
                @create-child="emit('create-child', $event)"
                @edit="emit('edit', $event)"
                @delete="emit('delete', $event)"
            />
        </div>
    </AppCard>
</template>
