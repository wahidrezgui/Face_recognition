<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner';
import Skeleton from 'primevue/skeleton';

interface Props {
    loading?: boolean;
    label?: string;
    variant?: 'overlay' | 'inline' | 'card';
    fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: true,
    label: undefined,
    variant: 'inline',
    fullscreen: true,
});
</script>

<template>
    <div
        v-if="props.loading"
        role="status"
        aria-live="polite"
        :aria-label="props.label"
    >
        <div
            v-if="props.variant === 'card'"
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        >
            <div
                v-for="n in 6"
                :key="n"
                class="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-700 dark:bg-surface-900"
            >
                <Skeleton shape="circle" size="3rem" />
                <div class="flex-1 space-y-2">
                    <Skeleton width="60%" height="0.75rem" />
                    <Skeleton width="40%" height="0.75rem" />
                </div>
            </div>
        </div>

        <div
            v-else-if="props.variant === 'overlay'"
            :class="props.fullscreen ? 'fixed' : 'absolute'"
            class="inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-surface-0/80 backdrop-blur-[2px] dark:bg-surface-950/80"
        >
            <ProgressSpinner
                style="width: 2.5rem; height: 2.5rem"
                stroke-width="4"
            />
            <p
                v-if="props.label"
                class="text-sm font-medium text-surface-600 dark:text-surface-300"
            >
                {{ props.label }}
            </p>
        </div>

        <div
            v-else
            class="flex flex-col items-center justify-center gap-3 px-4 py-12 text-surface-600 dark:text-surface-300"
        >
            <ProgressSpinner
                style="width: 2.5rem; height: 2.5rem"
                stroke-width="4"
            />
            <p v-if="props.label" class="text-sm font-medium">
                {{ props.label }}
            </p>
        </div>
    </div>
</template>
