<template>
    <component
        :is="tag"
        :type="tag === 'button' ? type : undefined"
        :disabled="disabled"
        :class="buttonClasses"
        v-bind="$attrs"
    >
        <slot />
    </component>
</template>

<script>
const VARIANT_CLASSES = {
    primary: 'bg-brand text-white hover:bg-brand-light focus:ring-brand/30',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
    ghost: 'bg-transparent text-brand hover:bg-brand-muted focus:ring-brand/20',
    accent: 'bg-accent-gold text-white hover:brightness-110 focus:ring-accent-gold/30',
};

const SIZE_CLASSES = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
};

export default {
    name: 'AppButton',
    inheritAttrs: false,
    props: {
        tag: { type: String, default: 'button' },
        type: { type: String, default: 'button' },
        variant: {
            type: String,
            default: 'primary',
            validator: (v) => ['primary', 'secondary', 'danger', 'ghost', 'accent'].includes(v),
        },
        size: {
            type: String,
            default: 'md',
            validator: (v) => ['sm', 'md', 'lg'].includes(v),
        },
        disabled: { type: Boolean, default: false },
    },
    computed: {
        buttonClasses() {
            return [
                'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
                VARIANT_CLASSES[this.variant],
                SIZE_CLASSES[this.size],
            ];
        },
    },
};
</script>
