<template>
    <router-link
        :to="to"
        class="group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-white transition-colors hover:bg-white/15"
        :class="[
            collapsed ? 'justify-center' : 'justify-end',
            { 'bg-brand-muted text-brand hover:bg-brand-muted': isActive },
        ]"
        :title="collapsed ? label : undefined"
    >
        <i :class="['pi', icon, 'text-lg shrink-0']" />
        <span
            v-if="!collapsed"
            class="flex-1 text-start text-sm font-medium"
        >{{ label }}</span>
        
    </router-link>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
    name: 'SidebarNavItem',
    props: {
        to: { type: String, required: true },
        label: { type: String, required: true },
        icon: { type: String, required: true },
        collapsed: { type: Boolean, default: false },
    },
    setup(props) {
        const route = useRoute();
        const isActive = computed(() => route.path === props.to);

        return { isActive };
    },
};
</script>
