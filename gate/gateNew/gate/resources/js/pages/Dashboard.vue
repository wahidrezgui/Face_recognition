<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3';
import {
    CircleCheck,
    DoorClosed,
    DoorOpen,
    FolderTree,
    Hourglass,
    Map,
    MapPin,
    Printer,
    ThumbsUp,
    Users,
} from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import { computed } from 'vue';
import type { Component } from 'vue';
import AppCard from '@/components/AppCard.vue';
import PageContainer from '@/components/PageContainer.vue';
import AppLayout from '@/layouts/AppLayout.vue';
import {
    canReadResource,
    canWriteResource,
    isGlobalScope,
} from '@/lib/auth-roles';
import { SEVERITY_STYLES } from '@/lib/severityStyles';
import type { Severity } from '@/lib/severityStyles';

defineOptions({ layout: AppLayout });

interface DashboardStats {
    departments: number;
    bases: number;
    gates: number;
    zones: number;
    employees: number;
    pending: number;
    printed: number;
    collected: number;
    checkInsToday: number;
    checkOutsToday: number;
    scope: string;
    scopeLabel: string;
}

interface DashboardPageProps {
    stats: DashboardStats;
    [key: string]: unknown;
}

const page = usePage<DashboardPageProps>();
const user = computed(() => page.props.auth.user);
const stats = computed(() => page.props.stats);

const isGlobalDashboard = computed(() =>
    isGlobalScope('dashboard', user.value),
);

type StatKey = Exclude<keyof DashboardStats, 'scope' | 'scopeLabel'>;

interface StatCard {
    id: StatKey;
    title: string;
    icon: Component;
    iconColor: string;
    borderColor: string;
}

function statColors(severity: Severity): {
    iconColor: string;
    borderColor: string;
} {
    return {
        iconColor: SEVERITY_STYLES[severity].chip,
        borderColor: SEVERITY_STYLES[severity].border,
    };
}

const visibleStatCards = computed<StatCard[]>(() => {
    const cards: (StatCard & { visible: boolean })[] = [
        {
            id: 'employees',
            title: trans('dashboard.stats.employees'),
            icon: Users,
            ...statColors('secondary'),
            visible:
                canReadResource('employees', user.value) ||
                canReadResource('reports', user.value),
        },
        {
            id: 'checkInsToday',
            title: trans('dashboard.stats.checkInsToday'),
            icon: CircleCheck,
            ...statColors('success'),
            visible: canReadResource('reports', user.value),
        },
        {
            id: 'checkOutsToday',
            title: trans('dashboard.stats.checkOutsToday'),
            icon: DoorOpen,
            ...statColors('danger'),
            visible: canReadResource('reports', user.value),
        },
        {
            id: 'pending',
            title: trans('dashboard.stats.pending'),
            icon: Hourglass,
            ...statColors('warn'),
            visible: canWriteResource('employees', user.value),
        },
        {
            id: 'printed',
            title: trans('dashboard.stats.printed'),
            icon: Printer,
            ...statColors('info'),
            visible: canWriteResource('employees', user.value),
        },
        {
            id: 'collected',
            title: trans('dashboard.stats.collected'),
            icon: ThumbsUp,
            ...statColors('success'),
            visible: canWriteResource('employees', user.value),
        },
        {
            id: 'departments',
            title: trans('dashboard.stats.departments'),
            icon: FolderTree,
            ...statColors('info'),
            visible:
                isGlobalDashboard.value &&
                canReadResource('departments', user.value),
        },
        {
            id: 'bases',
            title: trans('dashboard.stats.bases'),
            icon: MapPin,
            ...statColors('success'),
            visible:
                isGlobalDashboard.value &&
                canReadResource('departments', user.value),
        },
        {
            id: 'gates',
            title: trans('dashboard.stats.gates'),
            icon: DoorClosed,
            ...statColors('primary'),
            visible:
                isGlobalDashboard.value &&
                canReadResource('departments', user.value),
        },
        {
            id: 'zones',
            title: trans('dashboard.stats.zones'),
            icon: Map,
            ...statColors('danger'),
            visible:
                isGlobalDashboard.value &&
                canReadResource('departments', user.value),
        },
    ];

    return cards.filter((card) => card.visible);
});

function cardValue(card: StatCard): number {
    return stats.value[card.id] ?? 0;
}
</script>

<template>
    <Head :title="trans('dashboard.pageTitleGlobal')" />

    <PageContainer
        :title="trans('dashboard.pageTitleGlobal')"
        :description="stats.scopeLabel"
    >
        <div
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
        >
            <AppCard
                v-for="card in visibleStatCards"
                :key="card.id"
                variant="stat"
                :title="card.title"
                :icon="card.icon"
                :icon-color="card.iconColor"
                :border-color="card.borderColor"
                :value="cardValue(card)"
            />
        </div>
    </PageContainer>
</template>
