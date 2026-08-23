<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { computed } from 'vue';
import SegmentedTabs from '@/components/SegmentedTabs.vue';
import {
    companies_deactivated_employees,
    companies_deactivated_unreturned_cards,
    companies_expired_cards,
    companies_issues,
    companies_reporting,
    deactivated_employees,
    deactivated_unreturned_cards,
    expired_cards,
    export_reports,
    individual_report,
    issues,
    justified,
    reports,
    unjustified,
} from '@/routes';
import type { ReportPresetKey } from '@/types/reports';

const props = defineProps<{ activeKey: ReportPresetKey }>();

const page = usePage();

interface ReportNavLink {
    key: ReportPresetKey;
    labelKey: string;
    href: string;
}

const coreLinks: ReportNavLink[] = [
    { key: 'reports' as const, labelKey: 'nav.reports', href: reports.url() },
    { key: 'issues' as const, labelKey: 'nav.issues', href: issues.url() },
    {
        key: 'justified' as const,
        labelKey: 'nav.justified',
        href: justified.url(),
    },
    {
        key: 'unjustified' as const,
        labelKey: 'nav.unjustified',
        href: unjustified.url(),
    },
    {
        key: 'export' as const,
        labelKey: 'nav.export_reports',
        href: export_reports.url(),
    },
    {
        key: 'individual' as const,
        labelKey: 'nav.individual_report',
        href: individual_report.url(),
    },
];

const companyLinks: ReportNavLink[] = [
    {
        key: 'companiesReporting' as const,
        labelKey: 'nav.companies_reporting',
        href: companies_reporting.url(),
    },
    {
        key: 'companiesIssues' as const,
        labelKey: 'nav.companies_issues',
        href: companies_issues.url(),
    },
];

const statusLinks: ReportNavLink[] = [
    {
        key: 'deactivatedEmployees' as const,
        labelKey: 'nav.deactivated_employees',
        href: deactivated_employees.url(),
    },
    {
        key: 'expiredCards' as const,
        labelKey: 'nav.expired_cards',
        href: expired_cards.url(),
    },
    {
        key: 'deactivatedUnreturnedCards' as const,
        labelKey: 'nav.deactivated_unreturned_cards',
        href: deactivated_unreturned_cards.url(),
    },
];

const companyStatusLinks: ReportNavLink[] = [
    {
        key: 'companiesDeactivatedEmployees' as const,
        labelKey: 'nav.companies_deactivated_employees',
        href: companies_deactivated_employees.url(),
    },
    {
        key: 'companiesExpiredCards' as const,
        labelKey: 'nav.companies_expired_cards',
        href: companies_expired_cards.url(),
    },
    {
        key: 'companiesDeactivatedUnreturnedCards' as const,
        labelKey: 'nav.companies_deactivated_unreturned_cards',
        href: companies_deactivated_unreturned_cards.url(),
    },
];

const linkGroups: ReportNavLink[][] = [
    coreLinks,
    companyLinks,
    statusLinks,
    companyStatusLinks,
];

const routeKeyByPreset: Record<string, string> = {
    reports: 'reports',
    issues: 'issues',
    justified: 'justified',
    unjustified: 'unjustified',
    export: 'export_reports',
    individual: 'individual_report',
    companiesReporting: 'companies_reporting',
    companiesIssues: 'companies_issues',
    deactivatedEmployees: 'deactivated_employees',
    expiredCards: 'expired_cards',
    deactivatedUnreturnedCards: 'deactivated_unreturned_cards',
    companiesDeactivatedEmployees: 'companies_deactivated_employees',
    companiesExpiredCards: 'companies_expired_cards',
    companiesDeactivatedUnreturnedCards: 'companies_deactivated_unreturned_cards',
};

function canAccess(presetKey: string): boolean {
    const permissions = page.props.auth.user?.permissions ?? [];

    return permissions.includes(`route.${routeKeyByPreset[presetKey]}`);
}

const links = computed(() => {
    const source =
        linkGroups.find((group) =>
            group.some((link) => link.key === props.activeKey),
        ) ?? coreLinks;

    return source
        .filter((link) => canAccess(link.key))
        .map((link) => ({
            value: link.key,
            label: trans(link.labelKey),
            href: link.href,
        }));
});
</script>

<template>
    <div v-if="links.length > 1" class="mb-4">
        <SegmentedTabs
            :model-value="props.activeKey"
            :items="links"
            variant="pills"
        />
    </div>
</template>
