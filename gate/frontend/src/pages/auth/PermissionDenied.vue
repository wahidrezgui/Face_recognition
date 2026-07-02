<template>
    <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <AppCard class="max-w-xl text-center" padding="lg">
            <div class="mb-4 text-5xl text-brand">
                <i class="pi pi-lock" />
            </div>
            <h1 class="text-2xl font-bold text-slate-900">{{ heading }}</h1>
            <p class="mt-3 text-slate-500">
                {{ message }}
            </p>
            <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <AppButton
                    v-if="showGoBack"
                    variant="secondary"
                    :disabled="loggingOut"
                    @click="goBack"
                >
                    الرجوع
                </AppButton>
                <AppButton
                    :disabled="loggingOut"
                    @click="returnToLogin"
                >
                    {{ loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج' }}
                </AppButton>
            </div>
        </AppCard>
    </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppCard from '../../components/ui/AppCard.vue';
import AppButton from '../../components/ui/AppButton.vue';
import { useAuth } from '../../composables/useAuth';
import { getRedirectPathForRole } from '../../api/auth';
import { getAuthRoleName, getAuthUser, isAuthenticated } from '../../lib/auth-session';

export default {
    components: { AppCard, AppButton },
    setup() {
        const route = useRoute();
        const router = useRouter();
        const { logout } = useAuth();
        const loggingOut = ref(false);

        const isMissingRole = computed(() => {
            if (route.query.reason === 'no_role') {
                return true;
            }

            const user = getAuthUser();
            return isAuthenticated(user) && !getAuthRoleName(user);
        });

        const heading = computed(() => (
            isMissingRole.value ? 'الحساب غير مكتمل' : 'الوصول مرفوض'
        ));

        const message = computed(() => (
            isMissingRole.value
                ? 'تم تسجيل الدخول عبر مرسال لكن لم يُعيَّن لك دور بعد. تواصل مع المسؤول لإكمال التفعيل.'
                : 'ليس لديك صلاحية للوصول إلى هذه الصفحة.'
        ));

        const showGoBack = computed(() => !isMissingRole.value);

        async function returnToLogin() {
            loggingOut.value = true;
            try {
                const redirectUrl = await logout();
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                    return;
                }
            } catch (err) {
                console.error('Logout failed:', err);
            } finally {
                loggingOut.value = false;
                await router.replace('/');
            }
        }

        function goBack() {
            const user = getAuthUser();
            if (isAuthenticated(user)) {
                router.push(getRedirectPathForRole(getAuthRoleName(user)));
                return;
            }
            router.push('/');
        }

        return {
            loggingOut,
            heading,
            message,
            showGoBack,
            returnToLogin,
            goBack,
        };
    },
};
</script>
