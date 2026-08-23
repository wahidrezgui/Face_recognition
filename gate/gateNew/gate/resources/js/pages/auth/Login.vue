<script setup lang="ts">
import { Head, useForm, usePage } from '@inertiajs/vue3';
import { Eye, EyeOff } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { ref } from 'vue';
import { store } from '@/actions/App/Http/Controllers/Inertia/Auth/AuthenticatedSessionController';
import AppButton from '@/components/AppButton.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import FormField from '@/components/FormField.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';

interface LoginPageProps {
    keycloak: {
        enabled: boolean;
        loginUrl: string | null;
    };
    [key: string]: unknown;
}

const page = usePage<LoginPageProps>();

const form = useForm({
    username: '',
    password: '',
});

const ssoLoading = ref(false);

function submit() {
    form.post(store.url(), {
        preserveScroll: true,
        onFinish: () => form.reset('password'),
    });
}

function startKeycloakLogin() {
    if (!page.props.keycloak.loginUrl || ssoLoading.value) {
        return;
    }

    ssoLoading.value = true;
    window.location.href = page.props.keycloak.loginUrl;
}
</script>

<template>
    <Head :title="trans('login.title')" />

    <AuthLayout>
        <div class="mb-8 text-center">
            <h1
                class="text-2xl font-semibold text-surface-900 sm:text-3xl dark:text-surface-100"
            >
                {{ trans('login.title') }}
            </h1>
            <p
                class="mt-3 text-sm leading-6 text-surface-500 sm:text-base dark:text-surface-400"
            >
                {{ trans('login.welcome') }}
            </p>
        </div>

        <ErrorMessage
            v-if="page.props.flash.error"
            :message="page.props.flash.error"
            class="mb-6"
        />

        <form novalidate class="space-y-5" @submit.prevent="submit">
            <FormField
                :label="trans('login.usernameLabel')"
                input-id="login-username"
                :error="form.errors.username"
                v-slot="{ id }"
            >
                <InputText
                    :id="id"
                    v-model="form.username"
                    type="text"
                    fluid
                    autocomplete="username"
                    :placeholder="trans('login.usernamePlaceholder')"
                    :invalid="!!form.errors.username"
                />
            </FormField>

            <FormField
                :label="trans('login.passwordLabel')"
                input-id="login-password"
                :error="form.errors.password"
                v-slot="{ id }"
            >
                <Password
                    :input-id="id"
                    v-model="form.password"
                    fluid
                    toggle-mask
                    :feedback="false"
                    input-class="pe-10"
                    autocomplete="current-password"
                    :placeholder="trans('login.passwordPlaceholder')"
                    :invalid="!!form.errors.password"
                >
                    <template #maskicon="{ toggleCallback }">
                        <EyeOff
                            class="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                            :size="18"
                            :aria-label="trans('login.hidePassword')"
                            @click="toggleCallback"
                        />
                    </template>
                    <template #unmaskicon="{ toggleCallback }">
                        <Eye
                            class="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                            :size="18"
                            :aria-label="trans('login.showPassword')"
                            @click="toggleCallback"
                        />
                    </template>
                </Password>
            </FormField>

            <AppButton
                type="submit"
                size="lg"
                fluid
                :disabled="form.processing"
                :loading="form.processing"
            >
                {{
                    form.processing
                        ? trans('login.signingIn')
                        : trans('login.submitLabel')
                }}
            </AppButton>
        </form>

        <template
            v-if="page.props.keycloak.enabled && page.props.keycloak.loginUrl"
        >
            <Divider align="center" class="my-8">
                <span
                    class="text-xs font-medium tracking-wide text-surface-400 uppercase"
                >
                    {{ trans('login.dividerLabel') }}
                </span>
            </Divider>

            <div
                class="rounded-xl border border-surface-200 bg-surface-50/80 p-4 dark:border-surface-700 dark:bg-surface-800/50"
            >
                <p
                    class="mb-3 text-center text-xs text-surface-500 dark:text-surface-400"
                >
                    {{ trans('login.ssoHelpText') }}
                </p>
                <AppButton
                    variant="secondary"
                    size="lg"
                    fluid
                    :disabled="ssoLoading"
                    :loading="ssoLoading"
                    @click="startKeycloakLogin"
                >
                    {{
                        ssoLoading
                            ? trans('login.redirectingToSso')
                            : trans('login.ssoButtonLabel')
                    }}
                </AppButton>
            </div>
        </template>
    </AuthLayout>
</template>
