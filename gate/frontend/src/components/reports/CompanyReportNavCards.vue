<template>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    <div>
                        <span class="block text-base font-bold leading-snug text-slate-900">
                            {{ card.titleEn }}
                        </span>
                        <span class="block text-sm text-slate-500">{{ card.subtitle }}</span>
                    </div>
                </div>
            </AppCard>
        </router-link>
    </div>
</template>

<script>
import AppCard from '../ui/AppCard.vue';

const CARDS = [
    {
        to: '/companies-reporting',
        icon: 'pi-chart-bar',
        titleEn: 'Basic',
        subtitle: 'Basic Reports',
        iconColor: 'bg-brand-muted text-brand',
    },
    {
        to: '/companies-issues',
        icon: 'pi-exclamation-triangle',
        titleEn: 'Issues',
        subtitle: 'Issues Reports',
        iconColor: 'bg-amber-100 text-amber-700',
    },
];

export default {
    name: 'CompanyReportNavCards',
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
