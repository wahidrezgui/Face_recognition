<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import type { Component } from 'vue';
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface Props {
    href: string;
    label: string;
    icon: Component;
    collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    collapsed: false,
});

const page = usePage();
const isActive = computed(() => page.url === props.href);
</script>

<template>
    <Link
        :href="props.href"
        :title="props.collapsed ? props.label : undefined"
        :class="
            cn(
                'group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-surface-800 transition-colors hover:bg-surface-100 dark:text-surface-900',
                props.collapsed ? 'justify-center' : 'justify-end',
                isActive ? 'bg-primary text-white hover:bg-primary' : '',
            )
        "
    >
        <component :is="props.icon" class="shrink-0" :size="20" />
        <span
            v-if="!props.collapsed"
            class="flex-1 text-start text-sm font-medium"
            >{{ props.label }}</span
        >
    </Link>
</template>
