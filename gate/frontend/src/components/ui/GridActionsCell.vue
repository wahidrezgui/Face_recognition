<template>
    <div class="flex items-center justify-end gap-1">
        <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            title="تعديل"
            aria-label="تعديل"
            @click.stop="onEdit"
        >
            <i class="pi pi-pencil text-sm" aria-hidden="true" />
        </button>
        <button
            v-if="showDelete"
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            title="حذف"
            aria-label="حذف"
            @click.stop="onDelete"
        >
            <i class="pi pi-trash text-sm" aria-hidden="true" />
        </button>
    </div>
</template>

<script>
export default {
    name: 'GridActionsCell',
    computed: {
        showDelete() {
            return this.params.showDelete !== false;
        },
    },
    methods: {
        onEdit() {
            this.params.context?.onRowEdit?.(this.params.data);
        },
        onDelete() {
            this.params.context?.onRowDelete?.(this.params.data);
        },
    },
};
</script>
