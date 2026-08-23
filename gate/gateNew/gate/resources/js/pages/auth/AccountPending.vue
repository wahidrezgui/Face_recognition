<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { Hourglass } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Avatar from 'primevue/avatar';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import { ref } from 'vue';
import { create as loginCreate } from '@/actions/App/Http/Controllers/Inertia/Auth/AuthenticatedSessionController';
import AppButton from '@/components/AppButton.vue';
import { useToast } from '@/composables/useToast';
import AuthLayout from '@/layouts/AuthLayout.vue';

interface PendingProfile {
    sub: string | null;
    preferred_username: string | null;
    email: string | null;
    name: string | null;
    user_id: number | null;
    login_username: string | null;
    created: boolean;
    recorded_at?: string;
    [key: string]: unknown;
}

interface AccountPendingPageProps {
    profile: PendingProfile;
    keycloak: {
        enabled: boolean;
        loginUrl: string | null;
    };
    [key: string]: unknown;
}

const props = defineProps<AccountPendingPageProps>();

const toast = useToast();
const copyError = ref('');

function buildProfilePayload() {
    const payload: Record<string, unknown> = {
        name: props.profile.name,
        id: props.profile.user_id,
        sub: props.profile.sub,
        email: props.profile.email,
        username: props.profile.preferred_username,
        login_username: props.profile.login_username,
    };

    return Object.fromEntries(
        Object.entries(payload).filter(
            ([, value]) => value !== null && value !== '',
        ),
    );
}

async function copyProfileJson() {
    copyError.value = '';
    const text = JSON.stringify(buildProfilePayload(), null, 2);

    try {
        await navigator.clipboard.writeText(text);
        toast.success(trans('accountPending.copied'));
    } catch {
        copyError.value = trans('accountPending.copyError');
    }
}

function formatDate(value?: string) {
    if (!value) {
        return '';
    }

    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch {
        return value;
    }
}
</script>

<template>
    <Head :title="trans('accountPending.title')" />

    <AuthLayout max-width="2xl">
        <div class="mb-6 text-center">
            <Avatar
                shape="circle"
                size="xlarge"
                class="mb-4 bg-amber-100! text-amber-700! dark:bg-amber-950/50! dark:text-amber-300!"
            >
                <!-- Keep these numbers in sync with SEVERITY_STYLES.warn.chip (lib/severityStyles.ts) —
                     Avatar needs `!important` overrides here, so the class string can't be reused directly. -->
                <Hourglass :size="28" />
            </Avatar>
            <h1
                class="text-2xl font-semibold text-surface-900 dark:text-surface-100"
            >
                {{ trans('accountPending.title') }}
            </h1>
            <p
                class="mt-3 text-sm leading-7 text-surface-600 sm:text-base dark:text-surface-400"
            >
                {{ trans('accountPending.description') }}
            </p>
        </div>

        <ol class="mb-8 grid gap-3 sm:grid-cols-3">
            <li
                class="flex flex-col items-center gap-2 rounded-xl border border-surface-200 bg-surface-0 px-4 py-3 text-center dark:border-surface-700 dark:bg-surface-900"
            >
                <Tag value="1" severity="success" rounded />
                <span class="text-sm text-surface-700 dark:text-surface-300">{{
                    trans('accountPending.stepVerified')
                }}</span>
            </li>
            <li
                class="flex flex-col items-center gap-2 rounded-xl border border-surface-200 bg-surface-0 px-4 py-3 text-center dark:border-surface-700 dark:bg-surface-900"
            >
                <Tag value="2" severity="warn" rounded />
                <span
                    class="text-sm font-medium text-surface-700 dark:text-surface-300"
                    >{{ trans('accountPending.stepAwaiting') }}</span
                >
            </li>
            <li
                class="flex flex-col items-center gap-2 rounded-xl border border-surface-200 bg-surface-0 px-4 py-3 text-center dark:border-surface-700 dark:bg-surface-900"
            >
                <Tag value="3" severity="secondary" rounded />
                <span class="text-sm text-surface-700 dark:text-surface-300">{{
                    trans('accountPending.stepSignInAgain')
                }}</span>
            </li>
        </ol>

        <div class="space-y-5">
            <div
                class="flex flex-col gap-3 rounded-xl border border-surface-200 bg-surface-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-surface-700 dark:bg-surface-800"
            >
                <div>
                    <p
                        class="text-sm font-medium text-surface-800 dark:text-surface-200"
                    >
                        {{ trans('accountPending.copyPrompt') }}
                    </p>
                    <p
                        v-if="props.profile.recorded_at"
                        class="mt-1 text-xs text-surface-500 dark:text-surface-400"
                    >
                        {{ trans('accountPending.lastUpdated') }}
                        {{ formatDate(props.profile.recorded_at) }}
                    </p>
                    <p
                        v-if="copyError"
                        class="mt-1 text-xs text-red-600 dark:text-red-400"
                    >
                        {{ copyError }}
                    </p>
                </div>
                <AppButton size="md" class="sm:w-auto" @click="copyProfileJson">
                    {{ trans('accountPending.copyAll') }}
                </AppButton>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
                <Card
                    v-if="props.profile.user_id"
                    :pt="{ body: { class: 'p-4' } }"
                >
                    <template #content>
                        <p
                            class="text-xs text-surface-500 dark:text-surface-400"
                        >
                            {{ trans('accountPending.userId') }}
                        </p>
                        <p
                            class="mt-1 font-semibold text-surface-900 dark:text-surface-100"
                        >
                            {{ props.profile.user_id }}
                        </p>
                    </template>
                </Card>
                <Card
                    v-if="props.profile.name"
                    :pt="{ body: { class: 'p-4' } }"
                >
                    <template #content>
                        <p
                            class="text-xs text-surface-500 dark:text-surface-400"
                        >
                            {{ trans('accountPending.name') }}
                        </p>
                        <p
                            class="mt-1 font-semibold text-surface-900 dark:text-surface-100"
                        >
                            {{ props.profile.name }}
                        </p>
                    </template>
                </Card>
                <Card
                    v-if="props.profile.preferred_username"
                    :pt="{ body: { class: 'p-4' } }"
                >
                    <template #content>
                        <p
                            class="text-xs text-surface-500 dark:text-surface-400"
                        >
                            {{ trans('accountPending.username') }}
                        </p>
                        <p
                            class="mt-1 font-semibold text-surface-900 dark:text-surface-100"
                        >
                            {{ props.profile.preferred_username }}
                        </p>
                    </template>
                </Card>
                <Card
                    v-if="props.profile.email"
                    :pt="{ body: { class: 'p-4' } }"
                >
                    <template #content>
                        <p
                            class="text-xs text-surface-500 dark:text-surface-400"
                        >
                            {{ trans('accountPending.email') }}
                        </p>
                        <p
                            class="mt-1 font-semibold break-all text-surface-900 dark:text-surface-100"
                        >
                            {{ props.profile.email }}
                        </p>
                    </template>
                </Card>
            </div>
        </div>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <AppButton
                variant="secondary"
                :href="loginCreate.url()"
                class="sm:w-auto"
                >{{ trans('accountPending.backToLogin') }}</AppButton
            >
            <AppButton
                v-if="props.keycloak.loginUrl"
                :href="props.keycloak.loginUrl"
                class="sm:w-auto"
            >
                {{ trans('accountPending.retry') }}
            </AppButton>
        </div>
    </AuthLayout>
</template>
