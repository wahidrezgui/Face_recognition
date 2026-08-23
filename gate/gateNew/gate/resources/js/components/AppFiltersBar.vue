<script setup lang="ts">
/**
 * Shared filter chrome density so Users / Employees / Reports filter rows
 * use the same responsive grid breakpoints.
 */
withDefaults(
    defineProps<{
        /** denser = more columns on xl (employees); default = users/reports. */
        density?: 'default' | 'dense';
    }>(),
    {
        density: 'default',
    },
);
</script>

<template>
    <div>
        <div
            class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            :class="density === 'dense' ? 'xl:grid-cols-6' : 'xl:grid-cols-5'"
        >
            <slot />
        </div>
        <div
            v-if="$slots.actions"
            class="mt-3 flex flex-wrap items-center justify-between gap-2"
        >
            <slot name="actions" />
        </div>
    </div>
</template>
