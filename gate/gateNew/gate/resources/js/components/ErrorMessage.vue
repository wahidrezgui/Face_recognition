<script setup lang="ts">
import Message from 'primevue/message';

interface Props {
    message?: string;
}

const props = withDefaults(defineProps<Props>(), {
    message: undefined,
});
</script>

<template>
    <Message
        severity="error"
        :closable="false"
        icon="pi pi-exclamation-triangle"
    >
        <slot>{{ props.message }}</slot>
    </Message>
</template>
