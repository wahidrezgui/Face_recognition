<script setup lang="ts">
import PCard from 'primevue/card';
import type { Component } from 'vue';
import { computed, useSlots } from 'vue';
import { cn } from '@/lib/utils';

interface Props {
    variant?: 'default' | 'stat' | 'bordered' | 'flat';
    title?: string;
    subtitle?: string;
    icon?: Component | string;
    iconColor?: string;
    value?: string | number;
    padding?: 'sm' | 'md' | 'lg' | 'none';
    borderColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
    title: undefined,
    subtitle: undefined,
    icon: undefined,
    iconColor: undefined,
    value: undefined,
    padding: 'md',
    borderColor: undefined,
});

const slots = useSlots();

const VARIANT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
    default: 'shadow-sm',
    stat: 'rounded-2xl border border-surface-200 bg-surface-0 shadow-sm',
    bordered: 'border-2 border-surface-200',
    flat: 'shadow-none',
};

const PADDING_CLASSES: Record<NonNullable<Props['padding']>, string> = {
    sm: 'p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-4 sm:p-6 xl:p-8',
    none: 'p-0',
};

const statBodyClasses = computed(() => PADDING_CLASSES[props.padding]);
</script>

<template>
    <div
        v-if="props.variant === 'stat'"
        :class="cn(VARIANT_CLASSES.stat, props.borderColor, statBodyClasses)"
    >
        <div class="flex items-center gap-3">
            <div
                v-if="props.icon"
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                :class="props.iconColor || 'bg-surface-100 text-surface-800'"
            >
                <component
                    :is="props.icon"
                    v-if="typeof props.icon !== 'string'"
                    :size="22"
                />
                <span v-else class="text-xl">{{ props.icon }}</span>
            </div>
            <div class="min-w-0">
                <span
                    class="block text-2xl leading-none font-bold text-surface-900 sm:text-3xl"
                >
                    <slot name="value">{{ props.value }}</slot>
                </span>
                <h3
                    v-if="props.title"
                    class="mt-1 text-base font-normal text-surface-600 dark:text-surface-500"
                >
                    {{ props.title }}
                </h3>
                <slot name="subtitle" />
            </div>
        </div>
        <slot />
    </div>

    <PCard
        v-else
        :class="cn(VARIANT_CLASSES[props.variant], props.borderColor)"
        :pt="{ body: { class: PADDING_CLASSES[props.padding] } }"
    >
        <template v-if="props.title" #title>{{ props.title }}</template>
        <template v-if="props.subtitle" #subtitle>{{
            props.subtitle
        }}</template>
        <template v-if="slots.headerAction" #header>
            <div
                class="flex shrink-0 items-center justify-end gap-2 px-5 pt-4 sm:px-6"
            >
                <slot name="headerAction" />
            </div>
        </template>
        <template #content>
            <slot />
        </template>
        <template v-if="slots.footer" #footer>
            <slot name="footer" />
        </template>
    </PCard>
</template>
