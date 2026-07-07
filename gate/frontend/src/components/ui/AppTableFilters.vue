<template>
    <div class="app-table-filters grid grid-cols-1 gap-4 md:grid-cols-12" dir="rtl">
        <slot />
        <div v-if="showClear && active" class="flex items-end md:col-span-2">
            <button
                type="button"
                class="app-table-filters__clear"
                @click="$emit('clear')"
            >
                <i class="pi pi-filter-slash" aria-hidden="true" />
                <span>{{ clearLabel }}</span>
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
        active: {
            type: Boolean,
            default: false,
        },
        clearLabel: {
            type: String,
            default: 'مسح الفلاتر',
        },
    },
    emits: ['clear'],
};
</script>

<style scoped>
.app-table-filters__clear {
    display: inline-flex;
    height: 2.5rem;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border-radius: 0.5rem;
    border: 1px solid #fcd34d;
    background: #fffbeb;
    padding-inline: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #92400e;
    transition: background-color 0.15s ease, border-color 0.15s ease;
}

.app-table-filters__clear:hover {
    background: #fef3c7;
    border-color: #fbbf24;
}

.app-table-filters__clear:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-brand, #0d9488) 40%, transparent);
    outline-offset: 2px;
}
</style>
