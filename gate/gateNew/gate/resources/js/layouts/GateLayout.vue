<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3';
import { Globe, LogOut, Moon, Sun } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { computed } from 'vue';
import { destroy } from '@/actions/App/Http/Controllers/Inertia/Auth/AuthenticatedSessionController';
import AppButton from '@/components/AppButton.vue';
import { useColorMode } from '@/composables/useColorMode';
import { useLocale } from '@/composables/useLocale';

const page = usePage();
const { locale, setLocale } = useLocale();
const { isDark, toggleMode } = useColorMode();

const toastPosition = computed(() =>
    locale.value === 'ar' ? 'top-left' : 'top-right',
);

function toggleLocale() {
    setLocale(locale.value === 'ar' ? 'en' : 'ar');
}

function logout() {
    router.post(destroy.url());
}
</script>

<template>
    <div
        class="flex h-dvh flex-col overflow-hidden bg-surface-50 text-surface-900"
    >
        <header
            class="flex shrink-0 items-center justify-between gap-3 border-b border-surface-200 bg-surface-0 px-4 py-3"
        >
            <AppButton
                severity="secondary"
                outlined
                size="small"
                @click="logout"
            >
                <LogOut :size="16" />
                {{ trans('header.logout') }}
            </AppButton>

            <p
                class="text-center text-[11px] font-semibold tracking-[0.2em] text-primary uppercase"
            >
                {{ trans('header.appTitle') }}
            </p>

            <div class="flex items-center gap-3">
                <AppButton
                    severity="secondary"
                    outlined
                    size="small"
                    :aria-label="
                        isDark
                            ? trans('header.toggleLight')
                            : trans('header.toggleDark')
                    "
                    @click="toggleMode"
                >
                    <Sun v-if="isDark" :size="16" />
                    <Moon v-else :size="16" />
                </AppButton>
                <AppButton
                    severity="secondary"
                    outlined
                    size="small"
                    :aria-label="trans('common.language')"
                    @click="toggleLocale"
                >
                    <Globe :size="16" />
                </AppButton>
                <div class="min-w-[4.5rem] text-end">
                    <p class="text-xs text-surface-500 dark:text-surface-400">
                        {{ trans('welcome') }}
                    </p>
                    <p
                        class="truncate text-sm font-bold text-surface-800 dark:text-surface-100"
                    >
                        {{ page.props.auth.user?.firstname }}
                        {{ page.props.auth.user?.lastname }}
                    </p>
                </div>
            </div>
        </header>

        <main class="min-h-0 flex-1 overflow-y-auto">
            <slot />
        </main>

        <Toast :position="toastPosition" />
        <ConfirmDialog />
    </div>
</template>
