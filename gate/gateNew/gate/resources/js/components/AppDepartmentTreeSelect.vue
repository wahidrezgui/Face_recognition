<script setup lang="ts">
import TreeSelect from 'primevue/treeselect';
import type { TreeSelectOption } from '@/types';

defineProps<{
    modelValue: Record<string, boolean> | null;
    options: TreeSelectOption[];
    placeholder?: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: Record<string, boolean> | null];
}>();
</script>

<template>
    <TreeSelect
        :model-value="modelValue"
        :options="options"
        append-to="body"
        filter
        fluid
        :placeholder="placeholder"
        @update:model-value="
            (value) => emit('update:modelValue', value as Record<string, boolean> | null)
        "
    />
</template>
