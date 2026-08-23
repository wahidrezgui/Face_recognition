<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { computed, onMounted, onUnmounted } from 'vue';
import { useLocale } from '@/composables/useLocale';
import { useSidebar } from '@/composables/useSidebar';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';

const { isCollapsed, close } = useSidebar();
const { locale } = useLocale();

// PrimeVue's toast positions are physical (`top-right`/`top-left`), not
// logical, so flip it manually to stay at the inline-end edge under RTL.
const toastPosition = computed(() =>
    locale.value === 'ar' ? 'top-left' : 'top-right',
);

function handleEscape(event: KeyboardEvent) {
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
</script>

<template>
    <div class="min-h-screen bg-surface-50 text-surface-900">
        <AppHeader />
        <AppSidebar />

        <div
            class="pt-16 transition-[padding] motion-reduce:transition-none"
            :class="isCollapsed ? 'lg:ps-20' : 'lg:ps-64'"
        >
            <main>
                <slot />
            </main>
        </div>

        <Toast :position="toastPosition" />
        <ConfirmDialog />
    </div>
</template>
