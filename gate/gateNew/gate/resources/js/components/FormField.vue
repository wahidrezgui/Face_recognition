<script setup lang="ts">
import { computed, useId } from 'vue';
import InputError from '@/components/InputError.vue';

/**
 * Label + control + error with a wired `for`/`id` pair so fields are
 * click-to-focus and screen-reader friendly.
 */
const props = withDefaults(
    defineProps<{
        label: string;
        required?: boolean;
        error?: string;
        inputId?: string;
        class?: string;
    }>(),
    {
        required: false,
        error: undefined,
        inputId: undefined,
        class: undefined,
    },
);

const autoId = useId();
const id = computed(() => props.inputId ?? autoId);
</script>

<template>
    <div :class="props.class">
        <label
            :for="id"
            class="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            {{ props.label }}
            <span v-if="props.required" class="text-red-500">*</span>
        </label>
        <slot :id="id" />
        <InputError :message="props.error" />
    </div>
</template>
