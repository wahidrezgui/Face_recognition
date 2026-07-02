<template>
    <AppLoader :loading="loading" variant="overlay" :label="label" />
</template>

<script>
import AppLoader from '../shared/AppLoader.vue';

export default {
    name: 'ReportLoadingOverlay',
    components: {
        AppLoader,
    },
    props: {
        loading: {
            type: Boolean,
            default: false,
        },
        label: {
            type: String,
            default: 'جاري التحميل...',
        },
    },
};
</script>
