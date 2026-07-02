<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="modelValue"
                class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                role="presentation"
            >
                <div
                    class="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
                    aria-hidden="true"
                    @click="handleBackdrop"
                />

                <div
                    dir="rtl"
                    class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl transition duration-200 ease-out"
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="titleId"
                    :aria-describedby="messageId"
                >
                    <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
                        <div class="flex min-w-0 items-start gap-3">
                            <div
                                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                :class="typeStyles.iconWrap"
                            >
                                <i :class="[typeStyles.icon, 'text-lg']" aria-hidden="true" />
                            </div>
                            <h2 :id="titleId" class="pt-1.5 text-lg font-semibold text-slate-900">
                                {{ title }}
                            </h2>
                        </div>
                        <button
                            v-if="showClose"
                            type="button"
                            class="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            aria-label="إغلاق"
                            @click="emitClose"
                        >
                            <i class="pi pi-times text-lg" aria-hidden="true" />
                        </button>
                    </div>

                    <div class="px-6 py-4">
                        <p :id="messageId" class="text-sm leading-6 text-slate-600">
                            {{ message }}
                        </p>
                        <slot />
                    </div>

                    <div
                        v-if="showActions"
                        class="flex flex-row-reverse flex-wrap items-center justify-start gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4"
                    >
                        <button
                            type="button"
                            class="inline-flex min-w-[5.5rem] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                            :class="confirmButtonClass"
                            :disabled="loading"
                            @click="$emit('confirm')"
                        >
                            <i v-if="loading" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
                            {{ confirmLabel }}
                        </button>
                        <button
                            v-if="showCancel"
                            type="button"
                            class="inline-flex min-w-[5.5rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            :disabled="loading"
                            @click="emitClose"
                        >
                            {{ cancelLabel }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script>
const TYPE_STYLES = {
    error: {
        icon: 'pi pi-times-circle',
        iconWrap: 'bg-red-100 text-red-600',
        confirm: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
        icon: 'pi pi-exclamation-triangle',
        iconWrap: 'bg-amber-100 text-amber-600',
        confirm: 'bg-amber-600 hover:bg-amber-700',
    },
    info: {
        icon: 'pi pi-info-circle',
        iconWrap: 'bg-sky-100 text-sky-600',
        confirm: 'bg-brand hover:bg-brand-dark',
    },
};

export default {
    name: 'AppDialog',
    props: {
        modelValue: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String,
            default: 'info',
            validator: (value) => ['error', 'warning', 'info'].includes(value),
        },
        title: {
            type: String,
            default: '',
        },
        message: {
            type: String,
            default: '',
        },
        confirmLabel: {
            type: String,
            default: 'موافق',
        },
        cancelLabel: {
            type: String,
            default: 'إلغاء',
        },
        showCancel: {
            type: Boolean,
            default: true,
        },
        showClose: {
            type: Boolean,
            default: true,
        },
        showActions: {
            type: Boolean,
            default: true,
        },
        confirmVariant: {
            type: String,
            default: 'primary',
            validator: (value) => ['primary', 'danger'].includes(value),
        },
        closeOnBackdrop: {
            type: Boolean,
            default: false,
        },
        loading: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['update:modelValue', 'confirm', 'cancel'],
    computed: {
        titleId() {
            return `app-dialog-title-${this.$.uid}`;
        },
        messageId() {
            return `app-dialog-message-${this.$.uid}`;
        },
        typeStyles() {
            return TYPE_STYLES[this.type] || TYPE_STYLES.info;
        },
        confirmButtonClass() {
            if (this.confirmVariant === 'danger') {
                return 'bg-red-600 hover:bg-red-700';
            }

            return this.typeStyles.confirm;
        },
    },
    methods: {
        emitClose() {
            this.$emit('update:modelValue', false);
            this.$emit('cancel');
        },
        handleBackdrop() {
            if (this.closeOnBackdrop) {
                this.emitClose();
            }
        },
    },
};
</script>
