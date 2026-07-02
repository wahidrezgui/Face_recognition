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
                    title="الحضور — آخر 7 أيام"
                    subtitle="عدد الدخول والخروج اليومي"
                    padding="lg"
                >
                    <Chart v-if="chartPresence.datasets[0].data.length" type="bar" :data="chartPresence" :options="barChartOptions" />
                    <p v-else class="py-10 text-center text-sm text-slate-500">لا توجد بيانات حضور لهذه الفترة.</p>
                </AppCard>

                <AppCard
                    v-if="showIssuesByDepartmentChart"
                    title="مخالفات اليوم حسب الوحدة"
                    subtitle="تأخر الدخول وخروج مبكر لكل وحدة"
                    padding="lg"
                >
                    <Chart v-if="chartIssuesByDepartment.datasets[0].data.length" type="bar" :data="chartIssuesByDepartment" :options="barChartOptions" />
                    <p v-else class="py-10 text-center text-sm text-slate-500">لا توجد مخالفات مسجلة اليوم.</p>
                </AppCard>

                <AppCard
                    v-if="showRegistrationChart"
                    title="التسجيل — آخر 7 أيام"
                    subtitle="الموظفون المسجلون حديثاً"
                    padding="lg"
                >
                    <Chart v-if="chartRegistration.datasets[0].data.length" type="bar" :data="chartRegistration" :options="barChartOptions" />
                    <p v-else class="py-10 text-center text-sm text-slate-500">لا توجد بيانات تسجيل لهذه الفترة.</p>
                </AppCard>
            </div>

            <AppCard
                v-if="showIssuesTrendChart"
                class="mt-6"
                title="اتجاه المخالفات — آخر 7 أيام"
                subtitle="تطور تأخر الدخول والخروج المبكر"
                padding="lg"
            >
                <Chart v-if="chartIssuesTrend.datasets[0].data.length" type="line" :data="chartIssuesTrend" :options="lineChartOptions" />
                <p v-else class="py-10 text-center text-sm text-slate-500">لا توجد بيانات مخالفات لهذه الفترة.</p>
            </AppCard>
        </PageContainer>
    </QueryState>
</template>

<script>
import { computed } from 'vue';
import Chart from 'primevue/chart';
import QueryState from '../../components/shared/QueryState.vue';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import { useDashboard } from '../../composables/useDashboard';
import { userHasRole } from '../../lib/auth-session';

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
        title: 'الموظفون',
        field: 'employees',
        icon: 'pi-users',
        iconColor: 'bg-slate-100 text-slate-700',
        borderColor: 'border-slate-200',
        roles: ['Super Admin', 'Admin', 'Local Admin', 'Reporting'],
    },
    {
        id: 'checkInsToday',
        title: 'دخول اليوم',
        field: 'checkInsToday',
        icon: 'pi-sign-in',
        iconColor: 'bg-emerald-700 text-white',
        borderColor: 'border-emerald-200',
        roles: ['Super Admin', 'Admin', 'Local Admin', 'Reporting'],
    },
    {
        id: 'checkOutsToday',
        title: 'خروج اليوم',
        field: 'checkOutsToday',
        icon: 'pi-sign-out',
        iconColor: 'bg-red-700 text-white',
        borderColor: 'border-red-200',
        roles: ['Super Admin', 'Admin', 'Local Admin', 'Reporting'],
    },
    {
        id: 'pending',
        title: 'قيد الانتظار',
        field: 'pending',
        icon: 'pi-user',
        iconColor: 'bg-orange-100 text-orange-700',
        borderColor: 'border-orange-200',
        roles: ['Admin', 'Local Admin'],
    },
    {
        id: 'printed',
        title: 'مطبوع',
        field: 'printed',
        icon: 'pi-print',
        iconColor: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200',
        roles: ['Admin', 'Local Admin'],
    },
    {
        id: 'collected',
        title: 'مستلم',
        field: 'collected',
        icon: 'pi-thumbs-up',
        iconColor: 'bg-green-100 text-green-700',
        borderColor: 'border-green-200',
        roles: ['Admin', 'Local Admin'],
    },
    {
        id: 'departments',
        title: 'الأقسام',
        field: 'departments',
        icon: 'pi-sitemap',
        iconColor: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200',
        roles: ['Super Admin'],
    },
    {
        id: 'bases',
        title: 'القواعد',
        field: 'bases',
        icon: 'pi-map-marker',
        iconColor: 'bg-green-100 text-green-700',
        borderColor: 'border-green-200',
        roles: ['Super Admin'],
    },
    {
        id: 'gates',
        title: 'البوابات',
        field: 'gates',
        icon: 'pi-qrcode',
        iconColor: 'bg-indigo-500 text-white',
        borderColor: 'border-indigo-200',
        roles: ['Super Admin'],
    },
    {
        id: 'zones',
        title: 'المناطق',
        field: 'zones',
        icon: 'pi-stop-circle',
        iconColor: 'bg-red-400 text-white',
        borderColor: 'border-red-200',
        roles: ['Super Admin'],
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
        const {
            stats,
            reports,
            scopeLabel,
            pending,
            errorMessage,
            isSuperAdmin,
        } = useDashboard();

        const pageTitle = computed(() => (isSuperAdmin.value ? 'لوحة الإدارة' : 'لوحة التحكم'));
        const loadingLabel = computed(() => (
            isSuperAdmin.value ? 'جاري تحميل لوحة الإدارة…' : 'جاري تحميل لوحة التحكم…'
        ));

        const visibleStatCards = computed(() => STAT_CARDS.filter((card) => userHasRole(card.roles)));

        const showPresenceChart = computed(() => userHasRole(['Super Admin', 'Admin', 'Local Admin', 'Reporting']));
        const showIssuesByDepartmentChart = computed(() => userHasRole('Super Admin'));
        const showIssuesTrendChart = computed(() => userHasRole('Super Admin'));
        const showRegistrationChart = computed(() => userHasRole(['Admin', 'Local Admin']));

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
            return stats.value[card.field] ?? 0;
        }

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
                        label: 'دخول',
                        backgroundColor: root.getPropertyValue('--green-600'),
                        borderColor: root.getPropertyValue('--green-600'),
                        data: presence.nbIn,
                    },
                    {
                        label: 'خروج',
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
                        label: 'تسجيل جديد',
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
                        label: 'تأخر دخول',
                        backgroundColor: root.getPropertyValue('--orange-500'),
                        borderColor: root.getPropertyValue('--orange-500'),
                        data: issues.lateEntry,
                    },
                    {
                        label: 'خروج مبكر',
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
                        label: 'تأخر دخول',
                        data: trend.lateEntry,
                        borderColor: root.getPropertyValue('--orange-500'),
                        backgroundColor: root.getPropertyValue('--orange-500'),
                        tension: 0.3,
                        fill: false,
                    },
                    {
                        label: 'خروج مبكر',
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
            stats,
            pending,
            errorMessage,
            pageTitle,
            loadingLabel,
            scopeLabel,
            visibleStatCards,
            cardValue,
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
