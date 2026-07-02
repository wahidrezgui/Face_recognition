<template>
    <router-view />
    <AppDialogHost />
</template>

<script>
import AppDialogHost from './components/ui/AppDialogHost.vue';

export default {
    name: 'App',
    components: {
        AppDialogHost,
    },
};
</script>
