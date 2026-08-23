<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import AppLoader from './AppLoader.vue';
import ErrorMessage from './ErrorMessage.vue';

interface Props {
    pending?: boolean;
    error?: boolean;
    errorMessage?: string;
    loadingLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    pending: false,
    error: false,
    errorMessage: undefined,
    loadingLabel: undefined,
});
</script>

<template>
    <div class="relative">
        <AppLoader
            v-if="props.pending"
            variant="inline"
            :loading="true"
            :label="props.loadingLabel ?? trans('common.loading')"
        />
        <ErrorMessage
            v-else-if="props.error"
            :message="props.errorMessage ?? trans('common.loadError')"
        />
        <slot v-else />
    </div>
</template>
