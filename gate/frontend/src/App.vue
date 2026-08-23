<template>
    <router-view />
    <AppDialogHost />
</template>

<script>
import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppDialogHost from './components/ui/AppDialogHost.vue';

export default {
    name: 'App',
    components: {
        AppDialogHost,
    },
    setup() {
        const route = useRoute();
        const { t } = useI18n();

        // Keeps the tab title in sync when the user switches language without navigating.
        watchEffect(() => {
            if (route.meta?.titleKey) {
                document.title = t(route.meta.titleKey) + t('app.titleSuffix');
            }
        });
    },
};
</script>
