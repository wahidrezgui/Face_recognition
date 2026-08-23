<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { ChevronLeft, ChevronRight, X } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import { useLocale } from '@/composables/useLocale';
import { useSidebar } from '@/composables/useSidebar';
import { filterNavItems } from '@/config/navigation';
import SidebarNavItem from './SidebarNavItem.vue';

const page = usePage();
const { locale } = useLocale();
const { isOpen, isCollapsed, close, toggleCollapsed } = useSidebar();

const visibleItems = computed(() => filterNavItems(page.props.auth.user));

const CollapseChevron = computed(() =>
    locale.value === 'ar' ? ChevronRight : ChevronLeft,
);
const ExpandChevron = computed(() =>
    locale.value === 'ar' ? ChevronLeft : ChevronRight,
);
</script>

<template>
    <aside
        class="app-sidebar fixed start-0 top-0 z-30 flex h-full flex-col border-e border-surface-200 bg-surface-0 pt-16"
        :class="[
            isCollapsed ? 'w-20' : 'w-64',
            isOpen ? 'flex' : 'hidden lg:flex',
        ]"
        :aria-label="trans('sidebar.navLabel')"
    >
        <div
            class="flex items-center justify-between border-b border-surface-200 px-3 py-2"
        >
            <AppButton
                text
                rounded
                severity="secondary"
                class="hidden lg:flex"
                :aria-label="
                    isCollapsed
                        ? trans('sidebar.expand')
                        : trans('sidebar.collapse')
                "
                @click="toggleCollapsed"
            >
                <component
                    :is="isCollapsed ? ExpandChevron : CollapseChevron"
                    :size="18"
                />
            </AppButton>
            <AppButton
                text
                rounded
                severity="secondary"
                class="lg:hidden"
                :aria-label="trans('sidebar.close')"
                @click="close"
            >
                <X :size="18" />
            </AppButton>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4">
            <ul class="space-y-1">
                <template v-for="(item, index) in visibleItems" :key="index">
                    <li
                        v-if="item.type === 'separator'"
                        class="my-2 border-t border-surface-200 pt-2"
                        role="separator"
                    >
                        <span
                            v-if="item.labelKey && !isCollapsed"
                            class="block px-3 pb-1 text-xs font-semibold tracking-wide text-surface-600 uppercase dark:text-surface-500"
                        >
                            {{ trans(item.labelKey) }}
                        </span>
                    </li>
                    <li v-else>
                        <SidebarNavItem
                            :href="item.href"
                            :label="trans(item.labelKey)"
                            :icon="item.icon"
                            :collapsed="isCollapsed"
                        />
                    </li>
                </template>
            </ul>
        </nav>
    </aside>

    <div
        v-if="isOpen"
        class="fixed inset-0 z-20 bg-black/40 lg:hidden"
        aria-hidden="true"
        @click="close"
    />
</template>
