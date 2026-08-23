<script setup lang="ts">
import {
    Building2,
    ChevronDown,
    ChevronUp,
    Network,
    Pencil,
    Plus,
    Trash2,
} from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import AppButton from '@/components/AppButton.vue';
import { useLocale } from '@/composables/useLocale';
import {
    baseLabel,
    linkedBases,
    nodeId,
    nodeLabel,
} from '@/lib/organization/departmentTreeHelpers';
import type { DecoratedDepartmentNode } from '@/types';

interface Props {
    nodes: DecoratedDepartmentNode[];
    depth?: number;
    collapsedKeys?: Record<string | number, boolean>;
    canDelete?: boolean;
    canManage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    depth: 0,
    collapsedKeys: () => ({}),
    canDelete: false,
    canManage: true,
});

const emit = defineEmits<{
    'update:collapsedKeys': [value: Record<string | number, boolean>];
    'create-child': [id: number | string | null];
    edit: [id: number | string | null];
    delete: [id: number | string | null];
}>();

defineOptions({
    inheritAttrs: false,
});

const { locale } = useLocale();

const DEPTH_ACCENT = [
    'border-s-primary-500',
    'border-s-primary-400',
    'border-s-primary-300',
    'border-s-primary-200',
    'border-s-surface-400',
];

function hasChildren(node: DecoratedDepartmentNode): boolean {
    return Boolean(node.children?.length);
}

function isExpanded(node: DecoratedDepartmentNode): boolean {
    return props.collapsedKeys[node.key] === undefined;
}

function toggle(node: DecoratedDepartmentNode) {
    const next = { ...props.collapsedKeys };

    if (next[node.key] === undefined) {
        next[node.key] = true;
    } else {
        delete next[node.key];
    }

    emit('update:collapsedKeys', next);
}

function depthAccent(node: DecoratedDepartmentNode): string {
    return DEPTH_ACCENT[
        Math.min(node.depth ?? props.depth, DEPTH_ACCENT.length - 1)
    ];
}
</script>

<template>
    <ul
        class="list-none p-0"
        :class="
            depth === 0
                ? ''
                : 'ms-4 mt-1 border-s border-dashed border-surface-200 ps-6 dark:border-surface-700'
        "
    >
        <li
            v-for="node in nodes"
            :key="node.key"
            :class="{ 'mt-1.5': depth > 0 }"
        >
            <div
                class="flex items-center gap-2 rounded-lg border border-s-4 border-surface-200 bg-surface-0 px-2.5 py-2 dark:border-surface-700 dark:bg-surface-900"
                :class="[
                    depthAccent(node),
                    node.isTreeRoot
                        ? 'bg-gradient-to-b from-surface-0 to-primary-50/40 dark:to-primary-950/20'
                        : '',
                ]"
            >
                <AppButton
                    v-if="hasChildren(node)"
                    text
                    rounded
                    size="small"
                    :aria-label="
                        isExpanded(node)
                            ? trans('departments.row.collapse')
                            : trans('departments.row.expand')
                    "
                    @click="toggle(node)"
                >
                    <ChevronUp v-if="isExpanded(node)" :size="15" />
                    <ChevronDown v-else :size="15" />
                </AppButton>
                <span
                    v-else
                    class="inline-block w-8 shrink-0"
                    aria-hidden="true"
                />

                <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400"
                >
                    <Network v-if="node.isTreeRoot" :size="14" />
                    <Building2 v-else :size="14" />
                </span>

                <div class="min-w-0 flex-1">
                    <span
                        class="flex flex-wrap items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-100"
                    >
                        {{ nodeLabel(node, locale) }}
                        <span
                            v-if="node.isTreeRoot"
                            class="rounded-full bg-primary-600 px-2 py-0.5 text-[0.65rem] font-bold text-white"
                        >
                            {{ trans('departments.row.rootBadge') }}
                        </span>
                    </span>
                    <span
                        v-if="
                            node.name_en &&
                            node.name_en !== nodeLabel(node, locale)
                        "
                        dir="ltr"
                        class="block text-xs text-surface-500 dark:text-surface-400"
                    >
                        {{ node.name_en }}
                    </span>
                    <div
                        v-if="linkedBases(node).length"
                        class="mt-1 flex flex-wrap gap-1"
                    >
                        <span
                            v-for="base in linkedBases(node)"
                            :key="base.id"
                            :title="base.name_en"
                            class="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[0.65rem] font-semibold text-primary-700 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-400"
                        >
                            {{ baseLabel(base, locale) }}
                        </span>
                    </div>
                </div>

                <span
                    v-if="node.childCount"
                    :title="
                        trans('departments.row.childCount', {
                            count: String(node.childCount),
                        })
                    "
                    class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-surface-100 px-1.5 text-xs font-bold text-surface-600 dark:bg-surface-800 dark:text-surface-300"
                >
                    {{ node.childCount }}
                </span>

                <div
                    v-if="canManage"
                    class="flex shrink-0 items-center gap-0.5"
                >
                    <AppButton
                        text
                        rounded
                        size="small"
                        severity="secondary"
                        :aria-label="trans('departments.row.addChild')"
                        :title="trans('departments.row.addChild')"
                        @click.stop="emit('create-child', nodeId(node))"
                    >
                        <Plus :size="15" />
                    </AppButton>
                    <AppButton
                        text
                        rounded
                        size="small"
                        severity="info"
                        :aria-label="trans('departments.row.editLabel')"
                        :title="trans('departments.row.editTitle')"
                        @click.stop="emit('edit', nodeId(node))"
                    >
                        <Pencil :size="15" />
                    </AppButton>
                    <AppButton
                        v-if="canDelete"
                        text
                        rounded
                        size="small"
                        severity="danger"
                        :aria-label="trans('departments.row.deleteLabel')"
                        :title="trans('departments.row.deleteTitle')"
                        @click.stop="emit('delete', nodeId(node))"
                    >
                        <Trash2 :size="15" />
                    </AppButton>
                </div>
            </div>

            <DepartmentTreeRows
                v-if="hasChildren(node) && isExpanded(node)"
                :nodes="node.children"
                :depth="depth + 1"
                :collapsed-keys="collapsedKeys"
                :can-delete="canDelete"
                :can-manage="canManage"
                @update:collapsed-keys="emit('update:collapsedKeys', $event)"
                @create-child="emit('create-child', $event)"
                @edit="emit('edit', $event)"
                @delete="emit('delete', $event)"
            />
        </li>
    </ul>
</template>
