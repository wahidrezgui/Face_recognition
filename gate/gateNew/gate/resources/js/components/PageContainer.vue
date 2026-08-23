<script setup lang="ts">
import { useSlots } from 'vue';

interface Props {
    title?: string;
    description?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: undefined,
    description: undefined,
});

const slots = useSlots();
</script>

<template>
    <div class="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <header
            v-if="props.title || props.description || slots.actions"
            class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
            <div class="min-w-0">
                <h1
                    v-if="props.title"
                    class="text-2xl font-bold text-surface-900"
                >
                    {{ props.title }}
                </h1>
                <p
                    v-if="props.description"
                    class="mt-1 text-sm text-surface-600 dark:text-surface-500"
                >
                    {{ props.description }}
                </p>
            </div>
            <div
                v-if="slots.actions"
                class="flex shrink-0 flex-wrap items-center gap-2"
            >
                <slot name="actions" />
            </div>
        </header>
        <slot />
    </div>
</template>
