<template>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <router-link
            v-for="card in cards"
            :key="card.to"
            :to="card.to"
            :title="card.titleEn"
            class="group block no-underline"
        >
            <AppCard
                padding="sm"
                class="h-full transition-all duration-200 group-hover:border-brand/40 group-hover:shadow-md"
                :class="isActive(card.to)
                    ? 'border-brand bg-brand-muted/50 ring-2 ring-brand/25'
                    : ''"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                        :class="card.iconColor"
                    >
                        <i :class="['pi', card.icon, 'text-lg']" />
                    </div>
                    <span class="text-base font-bold leading-snug text-slate-900">
                        {{ card.titleAr }}
                    </span>
                </div>
            </AppCard>
        </router-link>
    </div>
</template>

<script>
import AppCard from '../ui/AppCard.vue';

const CARDS = [
    {
        to: '/IndividualReport',
        icon: 'pi-chart-bar',
        titleEn: 'Advanced Report',
        titleAr: 'تقرير متقدم',
        iconColor: 'bg-brand-muted text-brand',
    },
    {
        to: '/reports',
        icon: 'pi-chart-bar',
        titleEn: 'Daily Basic Reports',
        titleAr: 'تقارير التسجيل اليومية',
        iconColor: 'bg-slate-100 text-slate-600',
    },
    {
        to: '/issues',
        icon: 'pi-exclamation-triangle',
        titleEn: 'Daily Issues Reports',
        titleAr: 'تقارير التأخير اليومية',
        iconColor: 'bg-amber-100 text-amber-700',
    },
    {
        to: '/exportReports',
        icon: 'pi-chart-line',
        titleEn: 'Export Issues Reports',
        titleAr: 'استخراج تقارير التأخير',
        iconColor: 'bg-indigo-100 text-indigo-700',
    },
    {
        to: '/unjustified',
        icon: 'pi-flag',
        titleEn: 'Unjustified Issues',
        titleAr: 'بدون عذر',
        iconColor: 'bg-red-100 text-red-600',
    },
    {
        to: '/justified',
        icon: 'pi-flag',
        titleEn: 'Justified Issues',
        titleAr: 'بعذر',
        iconColor: 'bg-emerald-100 text-emerald-700',
    },
];

export default {
    name: 'ReportNavCards',
    components: { AppCard },
    data() {
        return { cards: CARDS };
    },
    methods: {
        isActive(path) {
            return this.$route.path.toLowerCase() === path.toLowerCase();
        },
    },
};
</script>
