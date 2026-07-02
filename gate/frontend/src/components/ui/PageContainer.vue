<template>
    <div class="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <header
            v-if="title || description || $slots.actions"
            class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
            <div class="min-w-0">
                <h1 v-if="title" class="text-2xl font-bold text-slate-900">{{ title }}</h1>
                <p v-if="description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
            </div>
            <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
                <slot name="actions" />
            </div>
        </header>
        <slot />
    </div>
</template>

<script>
export default {
    name: 'PageContainer',
    props: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
    },
};
</script>
