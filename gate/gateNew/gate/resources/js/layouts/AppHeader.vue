<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3';
import {
    Maximize,
    Menu as MenuIcon,
    Minimize,
    Moon,
    Sun,
    UserCircle,
} from '@lucide/vue';
import { Globe } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import PMenu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';
import { computed, ref } from 'vue';
import { destroy } from '@/actions/App/Http/Controllers/Inertia/Auth/AuthenticatedSessionController';
import { edit as editProfile } from '@/actions/App/Http/Controllers/Inertia/ProfileController';
import AppButton from '@/components/AppButton.vue';
import { useColorMode } from '@/composables/useColorMode';
import { useLocale } from '@/composables/useLocale';
import { useSidebar } from '@/composables/useSidebar';

const page = usePage();
const { locale, setLocale } = useLocale();
const { isDark, toggleMode } = useColorMode();
const { toggleMobile } = useSidebar();

const accountMenu = ref<InstanceType<typeof PMenu> | null>(null);
const isFullscreen = ref(false);

const accountMenuItems = computed<MenuItem[]>(() => [
    {
        label: trans('header.myProfile'),
        command: () => router.visit(editProfile.url()),
    },
    {
        label: trans('header.logout'),
        command: logout,
    },
]);

function toggleLocale() {
    setLocale(locale.value === 'ar' ? 'en' : 'ar');
}

function toggleAccountMenu(event: MouseEvent) {
    accountMenu.value?.toggle(event);
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        isFullscreen.value = true;
    } else {
        document.exitFullscreen();
        isFullscreen.value = false;
    }
}

function logout() {
    router.post(destroy.url());
}
</script>

<template>
    <nav class="fixed z-40 w-full border-b border-surface-200 bg-surface-0">
        <div class="flex h-16 items-center justify-between px-3 lg:px-5">
            <div class="flex min-w-0 items-center gap-2">
                <AppButton
                    text
                    rounded
                    class="lg:hidden"
                    :aria-label="trans('header.openMenu')"
                    @click="toggleMobile"
                >
                    <MenuIcon :size="20" />
                </AppButton>
                <span class="text-lg font-bold text-surface-900">{{
                    trans('header.appTitle')
                }}</span>
            </div>

            <div class="flex items-center gap-2">
                <AppButton
                    severity="secondary"
                    outlined
                    size="small"
                    :aria-label="trans('common.language')"
                    @click="toggleLocale"
                >
                    {{
                        locale === 'ar'
                            ? trans('common.english')
                            : trans('common.arabic')
                    }}
                    <Globe :size="18" />
                </AppButton>
                <AppButton
                    severity="secondary"
                    outlined
                    :aria-label="
                        isDark
                            ? trans('header.toggleLight')
                            : trans('header.toggleDark')
                    "
                    @click="toggleMode"
                >
                    <Sun v-if="isDark" :size="18" />
                    <Moon v-else :size="18" />
                </AppButton>
                <AppButton
                    severity="secondary"
                    outlined
                    :aria-label="trans('header.fullscreen')"
                    @click="toggleFullScreen"
                >
                    <Minimize v-if="isFullscreen" :size="18" />
                    <Maximize v-else :size="18" />
                </AppButton>
                <AppButton
                    severity="secondary"
                    outlined
                    :aria-label="trans('header.accountMenu')"
                    @click="toggleAccountMenu"
                >
                    <UserCircle :size="18" />
                </AppButton>

                <PMenu ref="accountMenu" :model="accountMenuItems" popup>
                    <template #start>
                        <div
                            class="border-b border-surface-100 p-4 dark:border-surface-800"
                        >
                            <p
                                class="truncate text-sm font-semibold text-surface-800 dark:text-surface-200"
                            >
                                {{ page.props.auth.user?.firstname }}
                                {{ page.props.auth.user?.lastname }}
                            </p>
                            <p
                                class="truncate text-xs text-surface-500 dark:text-surface-400"
                            >
                                {{ page.props.auth.user?.username }}
                            </p>
                        </div>
                    </template>
                </PMenu>
            </div>
        </div>
    </nav>
</template>
