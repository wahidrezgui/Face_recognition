<script setup lang="ts">
import { X } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import { useSlots } from 'vue';
import { VueSidePanel } from 'vue3-side-panel';
import AppButton from '@/components/AppButton.vue';
import { useLocale } from '@/composables/useLocale';

/**
 * Shared side-panel chrome (header / scroll body / footer) so theme tweaks
 * live in one place instead of being copy-pasted across form panels.
 */
const open = defineModel<boolean>({ required: true });

const props = withDefaults(
    defineProps<{
        title?: string;
        subtitle?: string;
        width?: string;
        zIndex?: number;
        /** Wrap chrome in a <form> and emit `submit` on submit. */
        asForm?: boolean;
        showClose?: boolean;
        closeAriaLabel?: string;
        /** When false, the body slot manages its own padding/scroll (nested forms). */
        bodyPadding?: boolean;
    }>(),
    {
        title: undefined,
        subtitle: undefined,
        width: '480px',
        zIndex: 900,
        asForm: false,
        showClose: true,
        closeAriaLabel: undefined,
        bodyPadding: true,
    },
);

const emit = defineEmits<{
    closed: [];
    submit: [];
    close: [];
}>();

const slots = useSlots();
const { locale } = useLocale();

function close(): void {
    open.value = false;
    emit('close');
}
</script>

<template>
    <VueSidePanel
        :model-value="open"
        lock-scroll
        hide-close-btn
        :width="props.width"
        :z-index="props.zIndex"
        @update:model-value="open = $event"
        @closed="emit('closed')"
    >
        <component
            :is="props.asForm ? 'form' : 'div'"
            :novalidate="props.asForm ? true : undefined"
            class="flex h-full flex-col bg-surface-0 dark:bg-surface-900"
            :dir="locale === 'ar' ? 'rtl' : 'ltr'"
            @submit.prevent="props.asForm ? emit('submit') : undefined"
        >
            <div
                class="flex-none border-b border-surface-200 bg-surface-50 px-6 py-4 dark:border-surface-800 dark:bg-surface-950/50"
            >
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <slot name="header">
                            <h2
                                v-if="props.title"
                                class="text-lg font-semibold text-surface-800 dark:text-surface-100"
                            >
                                {{ props.title }}
                            </h2>
                            <p
                                v-if="props.subtitle"
                                class="mt-1 text-sm text-surface-500 dark:text-surface-400"
                            >
                                {{ props.subtitle }}
                            </p>
                        </slot>
                    </div>
                    <div class="flex shrink-0 items-start gap-2">
                        <slot name="header-actions" />
                        <AppButton
                            v-if="props.showClose"
                            type="button"
                            text
                            rounded
                            severity="secondary"
                            :aria-label="
                                props.closeAriaLabel ?? trans('common.cancel')
                            "
                            @click="close"
                        >
                            <X :size="18" />
                        </AppButton>
                    </div>
                </div>
                <div v-if="slots['header-extra']" class="mt-3">
                    <slot name="header-extra" />
                </div>
            </div>

            <div
                class="flex min-h-0 flex-1 flex-col"
                :class="
                    props.bodyPadding
                        ? 'overflow-y-auto px-6 py-6'
                        : 'overflow-hidden'
                "
            >
                <slot />
            </div>

            <div
                v-if="slots.footer"
                class="flex-none border-t border-surface-200 bg-surface-50 px-6 py-4 dark:border-surface-800 dark:bg-surface-950/50"
            >
                <slot name="footer" />
            </div>
        </component>
    </VueSidePanel>
</template>
