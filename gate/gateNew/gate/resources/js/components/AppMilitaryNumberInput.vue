<script setup lang="ts">
import InputText from 'primevue/inputtext';

defineProps<{ placeholder?: string }>();

const model = defineModel<string>({ required: true });
</script>

<template>
    <InputText v-model="model" :placeholder="placeholder" fluid inputmode="numeric" />
</template>
