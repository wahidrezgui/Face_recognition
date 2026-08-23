<script setup lang="ts">
import { Link } from '@inertiajs/vue3';

export interface SegmentedTabItem {
    value: string;
    label: string;
    /** When set, renders an Inertia Link instead of a button. */
    href?: string;
}

/**
 * Shared segmented control used for report nav pills, role/user tabs,
 * badge front/back, and employee detail tabs.
 */
// Callers may use narrower string unions (TabId, SideKey, AccessTab).
const model = defineModel<string>({ required: true });

const props = withDefaults(
    defineProps<{
        items: SegmentedTabItem[];
        variant?: 'tabs' | 'pills';
    }>(),
    {
        variant: 'tabs',
    },
);

const emit = defineEmits<{
    select: [value: string];
}>();

function itemClass(value: string): string {
    const base =
        props.variant === 'pills'
            ? 'rounded-full px-3 py-1.5 text-sm font-medium transition'
            : 'rounded-md px-3 py-1.5 text-sm font-medium transition';

    if (value === model.value) {
        return `${base} bg-primary-600 text-white`;
    }

    if (props.variant === 'pills') {
        return `${base} bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700`;
    }

    return `${base} text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800`;
}

function activate(value: string): void {
    model.value = value;
    emit('select', value);
}
</script>

<template>
    <div class="flex flex-wrap gap-1" role="tablist">
        <template v-for="item in props.items" :key="item.value">
            <Link
                v-if="item.href"
                :href="item.href"
                role="tab"
                :aria-selected="item.value === model"
                :class="itemClass(item.value)"
            >
                {{ item.label }}
            </Link>
            <button
                v-else
                type="button"
                role="tab"
                :aria-selected="item.value === model"
                :class="itemClass(item.value)"
                @click="activate(item.value)"
            >
                {{ item.label }}
            </button>
        </template>
    </div>
</template>
