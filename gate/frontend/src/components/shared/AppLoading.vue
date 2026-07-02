<template>
    <AppLoader :loading="true" variant="inline" :label="label" />
</template>

<script>
import AppLoader from './AppLoader.vue';

export default {
    components: {
        AppLoader,
    },
    props: {
        label: {
            type: String,
            default: 'Loading…',
        },
    },
};
</script>
