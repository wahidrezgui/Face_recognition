<template>
    <div class="relative" :class="wrapperClass">
        <AppLoader v-if="pending" variant="inline" :loading="true" :label="loadingLabel" />
        <div
            v-else-if="error"
            class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
        >
            {{ errorMessage }}
        </div>
        <slot v-else />
    </div>
</template>

<script>
import AppLoader from './AppLoader.vue';

export default {
    components: {
        AppLoader,
    },
    props: {
        pending: {
            type: Boolean,
            default: false,
        },
        error: {
            type: [Object, Boolean],
            default: null,
        },
        errorMessage: {
            type: String,
            default: 'Something went wrong while loading data.',
        },
        loadingLabel: {
            type: String,
            default: 'Loading…',
        },
        wrapperClass: {
            type: String,
            default: '',
        },
    },
};
</script>
