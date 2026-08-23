<script setup lang="ts">
import { TreePine } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import { computed, ref, watch } from 'vue';
import AppCard from '@/components/AppCard.vue';
import SegmentedTabs from '@/components/SegmentedTabs.vue';
import { useLocale } from '@/composables/useLocale';
import {
    countTreeNodes,
    extractOrganizationRoots,
    nodeLabel,
} from '@/lib/organization/departmentTreeHelpers';
import type { DepartmentNode } from '@/types';
import DepartmentHierarchySectionCard from './DepartmentHierarchySectionCard.vue';

interface Props {
    departments: DepartmentNode[];
    canDelete?: boolean;
    canManage?: boolean;
    emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
    canDelete: false,
    canManage: true,
    emptyMessage: '',
});

const emit = defineEmits<{
    'create-child': [id: number | string | null];
    edit: [id: number | string | null];
    delete: [id: number | string | null];
}>();

const { locale } = useLocale();

const activeRootKey = ref<string>('');

const organizationRoots = computed(() =>
    extractOrganizationRoots(props.departments),
);

function rootKey(root: DepartmentNode | null): string {
    const key = root?.key ?? root?.id ?? '';

    return String(key);
}

function rootChildCount(root: DepartmentNode): number {
    return countTreeNodes(root.children);
}

const rootTabItems = computed(() =>
    organizationRoots.value.map((root) => {
        const count = rootChildCount(root);
        const label = nodeLabel(root, locale.value);

        return {
            value: rootKey(root),
            label: count ? `${label} (${count})` : label,
        };
    }),
);

const activeRoot = computed(() => {
    if (!organizationRoots.value.length) {
        return null;
    }

    return (
        organizationRoots.value.find(
            (root) => rootKey(root) === activeRootKey.value,
        ) ?? organizationRoots.value[0]
    );
});

watch(
    organizationRoots,
    (roots) => {
        const stillValid = roots.some(
            (root) => rootKey(root) === activeRootKey.value,
        );

        if (!stillValid) {
            activeRootKey.value = roots.length ? rootKey(roots[0]) : '';
        }
    },
    { immediate: true },
);
</script>

<template>
    <div class="flex min-h-0 flex-1 flex-col">
        <AppCard v-if="departments.length === 0" padding="lg">
            <div
                class="rounded-xl border border-dashed border-surface-200 p-10 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400"
            >
                <TreePine
                    :size="32"
                    class="mx-auto mb-2 text-surface-300 dark:text-surface-600"
                />
                {{ emptyMessage || trans('departments.tree.emptyMessage') }}
            </div>
        </AppCard>

        <template v-else>
            <div v-if="rootTabItems.length > 1" class="mb-3 flex-shrink-0">
                <SegmentedTabs
                    v-model="activeRootKey"
                    :items="rootTabItems"
                    variant="pills"
                />
            </div>

            <DepartmentHierarchySectionCard
                v-if="activeRoot"
                :key="rootKey(activeRoot)"
                :root-node="activeRoot"
                :can-delete="canDelete"
                :can-manage="canManage"
                class="min-h-0 flex-1"
                @create-child="emit('create-child', $event)"
                @edit="emit('edit', $event)"
                @delete="emit('delete', $event)"
            />
        </template>
    </div>
</template>
