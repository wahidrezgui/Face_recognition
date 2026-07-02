<template>
    <component
        :is="tag"
        :class="cardClasses"
    >
        <div
            v-if="hasHeader"
            class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6"
        >
            <div class="min-w-0">
                <h3 v-if="title" class="text-lg font-bold text-slate-900">{{ title }}</h3>
                <p v-if="subtitle" class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
            </div>
            <div v-if="$slots.headerAction" class="flex shrink-0 items-center gap-2">
                <slot name="headerAction" />
            </div>
        </div>

        <div v-if="variant === 'stat'" :class="bodyClasses">
            <div class="flex items-center gap-3">
                <div
                    v-if="icon"
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    :class="iconColor || 'bg-slate-100 text-slate-700'"
                >
                    <i :class="['pi', icon]" class="text-xl" />
                </div>
                <div class="min-w-0">
                    <span class="block text-2xl font-bold leading-none text-slate-900 sm:text-3xl">
                        <slot name="value">{{ value }}</slot>
                    </span>
                    <h3 v-if="title" class="mt-1 text-base font-normal text-slate-500">{{ title }}</h3>
                    <slot name="subtitle" />
                </div>
            </div>
            <slot />
        </div>

        <div v-else :class="bodyClasses">
            <slot />
        </div>

        <div
            v-if="$slots.footer"
            class="border-t border-slate-100 px-5 py-4 sm:px-6"
        >
            <slot name="footer" />
        </div>
    </component>
</template>

<script>
const VARIANT_CLASSES = {
    default: 'rounded-2xl border border-slate-200/80 bg-white shadow-sm',
    stat: 'rounded-2xl border border-slate-200/80 bg-white shadow-sm',
    bordered: 'rounded-2xl border-2 border-slate-200 bg-white',
    flat: 'rounded-2xl bg-white',
};

const PADDING_CLASSES = {
    sm: 'p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-4 sm:p-6 xl:p-8',
    none: '',
};

export default {
    name: 'AppCard',
    props: {
        tag: { type: String, default: 'div' },
        variant: {
            type: String,
            default: 'default',
            validator: (v) => ['default', 'stat', 'bordered', 'flat'].includes(v),
        },
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        icon: { type: String, default: '' },
        iconColor: { type: String, default: '' },
        value: { type: [String, Number], default: '' },
        padding: {
            type: String,
            default: 'md',
            validator: (v) => ['sm', 'md', 'lg', 'none'].includes(v),
        },
        borderColor: { type: String, default: '' },
    },
    computed: {
        hasHeader() {
            return (this.title || this.subtitle) && this.variant !== 'stat'
                ? true
                : Boolean(this.$slots.headerAction);
        },
        cardClasses() {
            const base = VARIANT_CLASSES[this.variant] || VARIANT_CLASSES.default;
            const border = this.borderColor ? `border ${this.borderColor}` : '';
            return [base, border, this.variant !== 'stat' && !this.hasHeader ? PADDING_CLASSES[this.padding] : ''].filter(Boolean);
        },
        bodyClasses() {
            if (this.variant === 'stat') {
                return PADDING_CLASSES[this.padding] || PADDING_CLASSES.md;
            }
            if (this.hasHeader) {
                return PADDING_CLASSES[this.padding] || PADDING_CLASSES.md;
            }
            return '';
        },
    },
};
</script>
