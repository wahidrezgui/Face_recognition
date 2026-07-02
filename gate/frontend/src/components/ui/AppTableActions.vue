<template>
    <div class="flex items-center justify-end gap-1">
        <button
            v-if="showEdit"
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            :title="editLabel"
            :aria-label="editLabel"
            @click="$emit('edit')"
        >
            <i class="pi pi-pencil text-sm" aria-hidden="true" />
        </button>
        <button
            v-if="showDelete"
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            :title="deleteLabel"
            :aria-label="deleteLabel"
            @click="$emit('delete')"
        >
            <i class="pi pi-trash text-sm" aria-hidden="true" />
        </button>
        <slot />
    </div>
</template>

<script>
export default {
    name: 'AppTableActions',
    props: {
        showEdit: {
            type: Boolean,
            default: true,
        },
        showDelete: {
            type: Boolean,
            default: true,
        },
        editLabel: {
            type: String,
            default: 'تعديل',
        },
        deleteLabel: {
            type: String,
            default: 'حذف',
        },
    },
    emits: ['edit', 'delete'],
};
</script>
