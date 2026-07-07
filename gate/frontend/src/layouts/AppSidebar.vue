<template>
    <aside
        class="app-sidebar fixed top-0 right-0 z-30 flex h-full flex-col bg-brand pt-16 motion-reduce:transition-none"
        :class="[
            { 'is-collapsed': isCollapsed },
            isOpen ? 'flex' : 'hidden lg:flex',
        ]"
        aria-label="القائمة الجانبية"
    >
        <div class="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <button
                v-if="!isCollapsed"
                type="button"
                class="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:flex"
                aria-label="طي القائمة"
                @click="toggleCollapsed"
            >
                <i class="pi pi-angle-double-right text-lg" />
            </button>
            <button
                v-else
                type="button"
                class="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:flex"
                aria-label="توسيع القائمة"
                @click="toggleCollapsed"
            >
                <i class="pi pi-angle-double-left text-lg" />
            </button>
            <button
                type="button"
                class="min-h-[44px] min-w-[44px] rounded-lg text-white hover:bg-white/10 lg:hidden"
                aria-label="إغلاق القائمة"
                @click="close"
            >
                <i class="pi pi-times text-lg" />
            </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4">
            <ul class="space-y-1">
                <li v-for="item in visibleItems" :key="item.to">
                    <SidebarNavItem
                        :to="item.to"
                        :label="item.label"
                        :icon="item.icon"
                        :collapsed="isCollapsed"
                    />
                </li>
            </ul>
            <img
                v-if="!isCollapsed"
                src="/nationalday2.png"
                class="mt-6 w-full rounded-lg"
                alt=""
            >
        </nav>
    </aside>

    <div
        v-if="isOpen"
        class="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
        aria-hidden="true"
        @click="close"
    />
</template>

<script>
import { computed } from 'vue';
import SidebarNavItem from './SidebarNavItem.vue';
import { useSidebar } from '../composables/useSidebar';
import { filterNavItems } from '../config/navigation';
import { useAuth } from '../composables/useAuth';

export default {
    name: 'AppSidebar',
    components: { SidebarNavItem },
    setup() {
        const { user } = useAuth();
        const {
            isOpen,
            isCollapsed,
            close,
            toggleCollapsed,
        } = useSidebar();

        const visibleItems = computed(() => filterNavItems(user.value));

        return {
            isOpen,
            isCollapsed,
            visibleItems,
            close,
            toggleCollapsed,
        };
    },
};
</script>
