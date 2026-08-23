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
        v-if="props.message"
        severity="error"
        variant="simple"
        size="small"
        class="mt-2"
    >
        {{ props.message }}
    </Message>
</template>
