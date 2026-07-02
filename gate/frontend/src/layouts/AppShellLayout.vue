<template>
    <div class="min-h-screen bg-slate-50">
        <AppHeader :has-issues="hasIssues" @toggle-issues="toggleQuick" />
        <AppSidebar id="app-sidebar" />

        <div
            class="app-shell-main bg-slate-50 transition-[padding] motion-reduce:transition-none"
            :class="mainShellClass"
        >
            <main>
                <router-view />
            </main>
        </div>

        <Toast />
    </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import Toast from 'primevue/toast';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import { useSidebar } from '../composables/useSidebar';

export default {
    name: 'AppShellLayout',
    components: {
        AppHeader,
        AppSidebar,
        Toast,
    },
    setup() {
        const { mainShellClass, close } = useSidebar();
        const hasIssues = ref(false);

        function toggleQuick() {
            // reserved for issues panel
        }

        function handleEscape(event) {
            if (event.key === 'Escape') {
                close();
            }
        }

        onMounted(() => {
            document.addEventListener('keydown', handleEscape);
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleEscape);
        });

        return {
            mainShellClass,
            hasIssues,
            toggleQuick,
        };
    },
};
</script>
