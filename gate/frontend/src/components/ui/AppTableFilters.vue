<template>
    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-12" dir="rtl">
        <slot />
        <div v-if="showClear" class="flex items-end md:col-span-2">
            <button
                type="button"
                class="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                @click="$emit('clear')"
            >
                {{ clearLabel }}
            </button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'AppTableFilters',
    props: {
        showClear: {
            type: Boolean,
            default: true,
        },
        clearLabel: {
            type: String,
            default: 'مسح الفلاتر',
        },
    },
    emits: ['clear'],
};
</script>
