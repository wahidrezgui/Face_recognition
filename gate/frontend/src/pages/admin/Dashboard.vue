<template>
    <QueryState :pending="pending" :error="Boolean(errorMessage)" :error-message="errorMessage" :loading-label="loadingLabel">
        <PageContainer :title="pageTitle" :description="scopeLabel">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
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

            <div class="mt-6 grid grid-cols-1 gap-4" :class="chartGridClass">
                <AppCard
                    v-if="showPresenceChart"
                    :title="t('dashboard.charts.presenceTitle')"
                    :subtitle="t('dashboard.charts.presenceSubtitle')"
                    padding="lg"
                >
                    <Chart v-if="chartHasData(chartPresence)" type="bar" :data="chartPresence" :options="barChartOptions" />
                    <p v-else class="py-10 text-center text-sm text-slate-500">{{ t('dashboard.charts.presenceEmpty') }}</p>
                </AppCard>

                <AppCard
                    v-if="showIssuesByDepartmentChart"
                    :title="t('dashboard.charts.issuesByDeptTitle')"
                    :subtitle="t('dashboard.charts.issuesByDeptSubtitle')"
                    padding="lg"
                >
                    <Chart v-if="chartHasData(chartIssuesByDepartment)" type="bar" :data="chartIssuesByDepartment" :options="barChartOptions" />
                    <p v-else class="py-10 text-center text-sm text-slate-500">{{ t('dashboard.charts.issuesByDeptEmpty') }}</p>
                </AppCard>

                <AppCard
                    v-if="showRegistrationChart"
                    :title="t('dashboard.charts.registrationTitle')"
                    :subtitle="t('dashboard.charts.registrationSubtitle')"
                    padding="lg"
                >
                    <Chart v-if="chartHasData(chartRegistration)" type="bar" :data="chartRegistration" :options="barChartOptions" />
                    <p v-else class="py-10 text-center text-sm text-slate-500">{{ t('dashboard.charts.registrationEmpty') }}</p>
                </AppCard>
            </div>

            <AppCard
                v-if="showIssuesTrendChart"
                class="mt-6"
                :title="t('dashboard.charts.issuesTrendTitle')"
                :subtitle="t('dashboard.charts.issuesTrendSubtitle')"
                padding="lg"
            >
                <Chart v-if="chartHasData(chartIssuesTrend)" type="line" :data="chartIssuesTrend" :options="lineChartOptions" />
                <p v-else class="py-10 text-center text-sm text-slate-500">{{ t('dashboard.charts.issuesTrendEmpty') }}</p>
            </AppCard>
        </PageContainer>
    </QueryState>
</template>

<script>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Chart from 'primevue/chart';
import QueryState from '../../components/shared/QueryState.vue';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import { useDashboard } from '../../composables/useDashboard';
import { canReadResource, canWriteResource, isGlobalScope } from '../../lib/auth-roles';
import { getAuthUser } from '../../lib/auth-session';

const emptyBarChart = {
    labels: [],
    datasets: [{ label: 'No data', data: [] }],
};

const emptyLineChart = {
    labels: [],
    datasets: [{ label: 'No data', data: [] }],
};

const STAT_CARDS = [
    {
        id: 'employees',
        titleKey: 'dashboard.stats.employees',
        field: 'employees',
        icon: 'pi-users',
        iconColor: 'bg-slate-100 text-slate-700',
        borderColor: 'border-slate-200',
        visible: (user) => canReadResource('employees', user) || canReadResource('reports', user),
    },
    {
        id: 'checkInsToday',
        titleKey: 'dashboard.stats.checkInsToday',
        field: 'checkInsToday',
        icon: 'pi-sign-in',
        iconColor: 'bg-emerald-700 text-white',
        borderColor: 'border-emerald-200',
        visible: (user) => canReadResource('reports', user),
    },
    {
        id: 'checkOutsToday',
        titleKey: 'dashboard.stats.checkOutsToday',
        field: 'checkOutsToday',
        icon: 'pi-sign-out',
        iconColor: 'bg-red-700 text-white',
        borderColor: 'border-red-200',
        visible: (user) => canReadResource('reports', user),
    },
    {
        id: 'pending',
        titleKey: 'dashboard.stats.pending',
        field: 'pending',
        icon: 'pi-user',
        iconColor: 'bg-orange-100 text-orange-700',
        borderColor: 'border-orange-200',
        visible: (user) => canWriteResource('employees', user),
    },
    {
        id: 'printed',
        titleKey: 'dashboard.stats.printed',
        field: 'printed',
        icon: 'pi-print',
        iconColor: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200',
        visible: (user) => canWriteResource('employees', user),
    },
    {
        id: 'collected',
        titleKey: 'dashboard.stats.collected',
        field: 'collected',
        icon: 'pi-thumbs-up',
        iconColor: 'bg-green-100 text-green-700',
        borderColor: 'border-green-200',
        visible: (user) => canWriteResource('employees', user),
    },
    {
        id: 'departments',
        titleKey: 'dashboard.stats.departments',
        field: 'departments',
        icon: 'pi-sitemap',
        iconColor: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200',
        visible: (user) => isGlobalScope('dashboard', user) && canReadResource('departments', user),
    },
    {
        id: 'bases',
        titleKey: 'dashboard.stats.bases',
        field: 'bases',
        icon: 'pi-map-marker',
        iconColor: 'bg-green-100 text-green-700',
        borderColor: 'border-green-200',
        visible: (user) => isGlobalScope('dashboard', user) && canReadResource('departments', user),
    },
    {
        id: 'gates',
        titleKey: 'dashboard.stats.gates',
        field: 'gates',
        icon: 'pi-qrcode',
        iconColor: 'bg-indigo-500 text-white',
        borderColor: 'border-indigo-200',
        visible: (user) => isGlobalScope('dashboard', user) && canReadResource('departments', user),
    },
    {
        id: 'zones',
        titleKey: 'dashboard.stats.zones',
        field: 'zones',
        icon: 'pi-stop-circle',
        iconColor: 'bg-red-400 text-white',
        borderColor: 'border-red-200',
        visible: (user) => isGlobalScope('dashboard', user) && canReadResource('departments', user),
    },
];

function buildBarChartOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    return {
        plugins: {
            legend: {
                labels: {
                    color: textColor,
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                    font: {
                        weight: 500,
                    },
                },
                grid: {
                    display: false,
                    drawBorder: false,
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: textColorSecondary,
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false,
                },
            },
        },
    };
}

function buildLineChartOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    return {
        plugins: {
            legend: {
                labels: {
                    color: textColor,
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false,
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: textColorSecondary,
                    precision: 0,
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false,
                },
            },
        },
    };
}

export default {
    components: {
        Chart,
        QueryState,
        PageContainer,
        AppCard,
    },
    setup() {
        const { t } = useI18n();
        const {
            stats,
            reports,
            scopeLabel,
            pending,
            errorMessage,
            isGlobalDashboard,
        } = useDashboard();

        const pageTitle = computed(() => (
            isGlobalDashboard.value ? t('dashboard.pageTitleGlobal') : t('dashboard.pageTitleScoped')
        ));
        const loadingLabel = computed(() => (
            isGlobalDashboard.value ? t('dashboard.loadingGlobal') : t('dashboard.loadingScoped')
        ));

        const visibleStatCards = computed(() => {
            const user = getAuthUser();
            return STAT_CARDS.filter((card) => {
                if (['departments', 'bases', 'gates', 'zones'].includes(card.id)) {
                    return isGlobalDashboard.value && card.visible(user);
                }
                return card.visible(user);
            }).map((card) => ({ ...card, title: t(card.titleKey) }));
        });

        const showPresenceChart = computed(() => canReadResource('reports', getAuthUser()));
        const showIssuesByDepartmentChart = computed(() => isGlobalDashboard.value);
        const showIssuesTrendChart = computed(() => isGlobalDashboard.value);
        const showRegistrationChart = computed(() => canWriteResource('employees', getAuthUser()));

        const chartGridClass = computed(() => {
            const count = [
                showPresenceChart.value,
                showIssuesByDepartmentChart.value,
                showRegistrationChart.value,
            ].filter(Boolean).length;

            if (count >= 2) {
                return 'xl:grid-cols-2';
            }

            return '';
        });

        function cardValue(card) {
            return stats.value?.[card.field] ?? 0;
        }

        const chartHasData = (chart) => Boolean(chart?.datasets?.[0]?.data?.length);

        const chartPresence = computed(() => {
            const presence = reports.value?.presence;
            if (!presence?.dayIn?.length) {
                return emptyBarChart;
            }

            const root = getComputedStyle(document.documentElement);

            return {
                labels: presence.dayIn,
                datasets: [
                    {
                        label: t('dashboard.charts.checkIn'),
                        backgroundColor: root.getPropertyValue('--green-600'),
                        borderColor: root.getPropertyValue('--green-600'),
                        data: presence.nbIn,
                    },
                    {
                        label: t('dashboard.charts.checkOut'),
                        backgroundColor: root.getPropertyValue('--red-600'),
                        borderColor: root.getPropertyValue('--red-600'),
                        data: presence.nbOut,
                    },
                ],
            };
        });

        const chartRegistration = computed(() => {
            const registration = reports.value?.registration;
            if (!registration?.day?.length) {
                return emptyBarChart;
            }

            const root = getComputedStyle(document.documentElement);

            return {
                labels: registration.day,
                datasets: [
                    {
                        label: t('dashboard.charts.newRegistration'),
                        backgroundColor: root.getPropertyValue('--blue-600'),
                        borderColor: root.getPropertyValue('--blue-600'),
                        data: registration.nb,
                    },
                ],
            };
        });

        const chartIssuesByDepartment = computed(() => {
            const issues = reports.value?.issuesByDepartment;
            if (!issues?.labels?.length) {
                return emptyBarChart;
            }

            const root = getComputedStyle(document.documentElement);

            return {
                labels: issues.labels,
                datasets: [
                    {
                        label: t('dashboard.charts.lateEntry'),
                        backgroundColor: root.getPropertyValue('--orange-500'),
                        borderColor: root.getPropertyValue('--orange-500'),
                        data: issues.lateEntry,
                    },
                    {
                        label: t('dashboard.charts.earlyExit'),
                        backgroundColor: root.getPropertyValue('--yellow-500'),
                        borderColor: root.getPropertyValue('--yellow-500'),
                        data: issues.earlyExit,
                    },
                ],
            };
        });

        const chartIssuesTrend = computed(() => {
            const trend = reports.value?.issuesTrend;
            if (!trend?.days?.length) {
                return emptyLineChart;
            }

            const root = getComputedStyle(document.documentElement);

            return {
                labels: trend.days,
                datasets: [
                    {
                        label: t('dashboard.charts.lateEntry'),
                        data: trend.lateEntry,
                        borderColor: root.getPropertyValue('--orange-500'),
                        backgroundColor: root.getPropertyValue('--orange-500'),
                        tension: 0.3,
                        fill: false,
                    },
                    {
                        label: t('dashboard.charts.earlyExit'),
                        data: trend.earlyExit,
                        borderColor: root.getPropertyValue('--yellow-500'),
                        backgroundColor: root.getPropertyValue('--yellow-500'),
                        tension: 0.3,
                        fill: false,
                    },
                ],
            };
        });

        return {
            t,
            stats,
            pending,
            errorMessage,
            pageTitle,
            loadingLabel,
            scopeLabel,
            visibleStatCards,
            cardValue,
            chartHasData,
            showPresenceChart,
            showIssuesByDepartmentChart,
            showIssuesTrendChart,
            showRegistrationChart,
            chartGridClass,
            chartPresence,
            chartRegistration,
            chartIssuesByDepartment,
            chartIssuesTrend,
            barChartOptions: buildBarChartOptions(),
            lineChartOptions: buildLineChartOptions(),
        };
    },
};
</script>
