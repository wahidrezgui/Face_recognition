<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import { Frown, Lock, ServerCrash, TimerReset, Wrench } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import { computed } from 'vue';
import type { Component } from 'vue';
import { destroy } from '@/actions/App/Http/Controllers/Inertia/Auth/AuthenticatedSessionController';
import AppButton from '@/components/AppButton.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';

interface ErrorPageProps {
    status: number;
    [key: string]: unknown;
}

const props = defineProps<ErrorPageProps>();

const CONTENT: Record<number, { icon: Component; titleKey: string; descriptionKey: string }> = {
    403: {
        icon: Lock,
        titleKey: 'errors.403.title',
        descriptionKey: 'errors.403.description',
    },
    404: {
        icon: Frown,
        titleKey: 'errors.404.title',
        descriptionKey: 'errors.404.description',
    },
    419: {
        icon: TimerReset,
        titleKey: 'errors.419.title',
        descriptionKey: 'errors.419.description',
    },
    500: {
        icon: ServerCrash,
        titleKey: 'errors.500.title',
        descriptionKey: 'errors.500.description',
    },
    503: {
        icon: Wrench,
        titleKey: 'errors.503.title',
        descriptionKey: 'errors.503.description',
    },
};

const content = computed(() => CONTENT[props.status] ?? CONTENT[500]);

function goHome() {
    router.visit('/');
}

function logout() {
    router.post(destroy.url());
}
</script>

<template>
    <Head :title="trans(content.titleKey)" />

    <AuthLayout>
        <div class="text-center">
            <div
                class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
            >
                <component :is="content.icon" :size="28" />
            </div>
            <p class="text-sm font-medium text-surface-400 dark:text-surface-500">
                {{ props.status }}
            </p>
            <h1 class="mt-1 text-2xl font-semibold text-surface-900 dark:text-surface-100">
                {{ trans(content.titleKey) }}
            </h1>
            <p class="mt-3 text-sm leading-7 text-surface-600 sm:text-base dark:text-surface-400">
                {{ trans(content.descriptionKey) }}
            </p>
        </div>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <AppButton severity="secondary" @click="logout">
                {{ trans('header.logout') }}
            </AppButton>
            <AppButton @click="goHome">
                {{ trans('errors.backHome') }}
            </AppButton>
        </div>
    </AuthLayout>
</template>
