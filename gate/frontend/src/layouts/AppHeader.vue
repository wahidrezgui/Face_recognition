<template>
    <nav class="fixed z-40 w-full border-b border-slate-200 bg-white">
        <div class="flex h-16 items-center justify-between px-3 lg:px-5">
            <div class="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
                    :aria-expanded="isOpen"
                    aria-controls="app-sidebar"
                    :aria-label="t('header.openMenu')"
                    @click="toggleMobile"
                >
                    <i class="pi pi-bars text-xl" />
                </button>
                <router-link :to="homeRoute" class="flex items-center gap-2 text-lg font-bold text-brand">
                    <i class="pi pi-qrcode text-xl" />
                    <span class="hidden whitespace-nowrap sm:inline">{{ t('header.appTitle') }}</span>
                </router-link>
                <div class="hidden min-w-0 lg:block lg:ms-8">
                    <h2 class="truncate text-base font-bold text-slate-800">{{ pageTitle }}</h2>
                </div>
            </div>

            <div class="relative flex items-center gap-2">
                <button
                    type="button"
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    :aria-label="t('common.language')"
                    @click="toggleLocale"
                >
                    <i class="pi pi-language" />
                </button>
                <button
                    v-if="hasIssues"
                    type="button"
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600"
                    :aria-label="t('header.alerts')"
                    @click="$emit('toggle-issues')"
                >
                    <i class="pi pi-exclamation-triangle" />
                </button>
                <button
                    type="button"
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    :aria-label="t('header.fullscreen')"
                    @click="toggleFullScreen"
                >
                    <i class="pi pi-arrows-alt" />
                </button>
                <button
                    type="button"
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    :aria-label="t('header.accountMenu')"
                    @click="toggleDropdown"
                >
                    <i class="pi pi-user" />
                </button>

                <div
                    v-show="isOpenDropdown"
                    class="absolute top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg end-0"
                >
                    <div class="flex items-center gap-3 border-b border-slate-100 p-4">
                        <i class="pi pi-user text-3xl text-brand" />
                        <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-slate-800">{{ userFullname }}</p>
                            <p class="truncate text-xs text-slate-500">{{ username }}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        class="block w-full px-4 py-3 text-start text-sm text-slate-600 hover:bg-slate-50"
                        @click="toggleChangePasswordForm"
                    >
                        {{ t('header.changePassword') }}
                    </button>
                    <div v-show="showChangePasswordForm" class="border-b border-slate-100 px-4 py-3">
                        <form @submit.prevent="changePassword">
                            <label class="mb-2 block text-sm font-medium text-slate-700" for="newPassword">
                                {{ t('header.newPasswordLabel') }}
                            </label>
                            <input
                                id="newPassword"
                                v-model="newPassword"
                                type="password"
                                class="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                required
                            >
                            <label class="mb-2 block text-sm font-medium text-slate-700" for="confirmPassword">
                                {{ t('header.confirmPasswordLabel') }}
                            </label>
                            <input
                                id="confirmPassword"
                                v-model="confirmPassword"
                                type="password"
                                class="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                required
                            >
                            <div class="flex justify-end gap-2">
                                <AppButton variant="secondary" size="sm" type="button" @click="toggleChangePasswordForm">
                                    {{ t('header.cancel') }}
                                </AppButton>
                                <AppButton size="sm" type="submit">
                                    {{ t('header.save') }}
                                </AppButton>
                            </div>
                        </form>
                    </div>
                    <button
                        type="button"
                        class="block w-full px-4 py-3 text-start text-sm text-slate-600 hover:bg-slate-50"
                        @click="logout"
                    >
                        {{ t('header.logout') }}
                    </button>
                </div>
            </div>
        </div>
    </nav>
</template>

<script>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import AppButton from '../components/ui/AppButton.vue';
import { useSidebar } from '../composables/useSidebar';
import { useAuth } from '../composables/useAuth';
import { changePassword as changePasswordApi } from '../api/auth';
import { setLocale } from '../i18n';

export default {
    name: 'AppHeader',
    components: { AppButton },
    props: {
        hasIssues: { type: Boolean, default: false },
    },
    emits: ['toggle-issues'],
    setup() {
        const route = useRoute();
        const router = useRouter();
        const toast = useToast();
        const { t, locale } = useI18n();
        const { logout: authLogout } = useAuth();
        const { isOpen, toggleMobile } = useSidebar();

        function toggleLocale() {
            setLocale(locale.value === 'ar' ? 'en' : 'ar');
        }

        const isOpenDropdown = ref(false);
        const showChangePasswordForm = ref(false);
        const newPassword = ref('');
        const confirmPassword = ref('');
        const username = ref(localStorage.getItem('user_username') || '');
        const userFullname = ref(localStorage.getItem('user_fullname') || '');

        const pageTitle = computed(() => (route.meta?.titleKey ? t(route.meta.titleKey) : ''));

        const homeRoute = computed(() => '/dashboard');

        function toggleDropdown() {
            isOpenDropdown.value = !isOpenDropdown.value;
        }

        function toggleChangePasswordForm() {
            showChangePasswordForm.value = !showChangePasswordForm.value;
        }

        function toggleFullScreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }

        async function logout() {
            const result = await authLogout();
            localStorage.removeItem('default_base');
            localStorage.removeItem('user_username');
            localStorage.removeItem('user_fullname');
            localStorage.removeItem('account_id');
            localStorage.removeItem('dep_id');
            localStorage.removeItem('roles');
            isOpenDropdown.value = false;

            if (result?.redirect_url) {
                window.location.href = result.redirect_url;
                return;
            }

            router.push('/');
        }

        async function changePassword() {
            if (newPassword.value !== confirmPassword.value) {
                toast.add({ severity: 'error', summary: t('header.errorTitle'), detail: t('header.passwordMismatch'), life: 3000 });
                return;
            }

            try {
                await changePasswordApi({
                    id: localStorage.getItem('account_id'),
                    password: newPassword.value,
                    password_confirmation: confirmPassword.value,
                });
                toast.add({ severity: 'success', summary: t('header.successTitle'), detail: t('header.passwordChanged'), life: 3000 });
                toggleChangePasswordForm();
                newPassword.value = '';
                confirmPassword.value = '';
            } catch {
                toast.add({ severity: 'error', summary: t('header.errorTitle'), detail: t('header.passwordChangeFailed'), life: 3000 });
            }
        }

        return {
            t,
            toggleLocale,
            isOpen,
            toggleMobile,
            pageTitle,
            homeRoute,
            isOpenDropdown,
            showChangePasswordForm,
            newPassword,
            confirmPassword,
            username,
            userFullname,
            toggleDropdown,
            toggleChangePasswordForm,
            toggleFullScreen,
            logout,
            changePassword,
        };
    },
};
</script>
