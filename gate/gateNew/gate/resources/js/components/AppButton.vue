<script setup lang="ts">
import PButton from 'primevue/button';
import { computed, useAttrs } from 'vue';

/**
 * Canonical action button — thin wrapper over PrimeVue Button so product code
 * never imports `primevue/button` directly. Theme (Al Adaam primary) flows
 * through Aura tokens automatically.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        type?: 'button' | 'submit' | 'reset';
        severity?:
            | 'primary'
            | 'secondary'
            | 'success'
            | 'info'
            | 'warn'
            | 'danger'
            | 'contrast'
            | 'help';
        /** @deprecated Prefer `severity="secondary"` — kept for Login/AccountPending. */
        variant?: 'primary' | 'secondary';
        size?: 'small' | 'large' | 'md' | 'lg';
        outlined?: boolean;
        text?: boolean;
        rounded?: boolean;
        disabled?: boolean;
        loading?: boolean;
        fluid?: boolean;
        icon?: string;
        label?: string;
        href?: string;
        as?: string;
    }>(),
    {
        type: 'button',
        severity: undefined,
        variant: undefined,
        size: undefined,
        outlined: false,
        text: false,
        rounded: false,
        disabled: false,
        loading: false,
        fluid: false,
        icon: undefined,
        label: undefined,
        href: undefined,
        as: undefined,
    },
);

const attrs = useAttrs();

const resolvedSeverity = computed(() => {
    if (props.severity) {
        return props.severity === 'primary' ? undefined : props.severity;
    }

    if (props.variant === 'secondary') {
        return 'secondary';
    }

    return undefined;
});

const resolvedSize = computed(() => {
    if (props.size === 'md' || props.size === undefined) {
        return undefined;
    }

    if (props.size === 'lg') {
        return 'large';
    }

    return props.size;
});

const linkAs = computed(() => props.as ?? (props.href ? 'a' : undefined));
</script>

<template>
    <PButton
        :type="props.href || linkAs === 'a' ? undefined : props.type"
        :as="linkAs"
        :href="props.href"
        :severity="resolvedSeverity"
        :size="resolvedSize"
        :outlined="props.outlined"
        :text="props.text"
        :rounded="props.rounded"
        :disabled="props.disabled"
        :loading="props.loading"
        :fluid="props.fluid"
        :icon="props.icon"
        :label="props.label"
        v-bind="attrs"
    >
        <slot />
    </PButton>
</template>
