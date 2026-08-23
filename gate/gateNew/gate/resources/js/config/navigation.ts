import {
    Briefcase,
    Building,
    Building2,
    FileText,
    FileWarning,
    FolderTree,
    History,
    IdCard,
    LayoutDashboard,
    MapPin,
    Settings as SettingsIcon,
    ShieldAlert,
    ShieldCheck,
    UserRound,
    Users,
} from '@lucide/vue';
import type { Component } from 'vue';
import {
    activity_log,
    badge,
    company_badge,
    bases,
    companies,
    companies_deactivated_employees,
    companies_reporting,
    deactivated_employees,
    departments,
    employees,
    home,
    reports,
    role_permissions,
    settings,
    users,
} from '@/routes';
import type { User } from '@/types';

export interface NavLinkItem {
    type: 'link';
    href: string;
    labelKey: string;
    icon: Component;
}

export interface NavSeparatorItem {
    type: 'separator';
    labelKey?: string;
}

export type NavItem = NavLinkItem | NavSeparatorItem;

export const navItems: NavItem[] = [
    {
        type: 'link',
        href: home.url(),
        labelKey: 'nav.dashboard',
        icon: LayoutDashboard,
    },
    {
        type: 'link',
        href: departments.url(),
        labelKey: 'nav.departments',
        icon: FolderTree,
    },
    { type: 'link', href: bases.url(), labelKey: 'nav.bases', icon: MapPin },
    {
        type: 'link',
        href: companies.url(),
        labelKey: 'nav.companies',
        icon: Building2,
    },
    {
        type: 'link',
        href: employees.url(),
        labelKey: 'nav.employees',
        icon: UserRound,
    },
    {
        type: 'link',
        href: reports.url(),
        labelKey: 'nav.reports',
        icon: FileText,
    },
    {
        type: 'link',
        href: companies_reporting.url(),
        labelKey: 'nav.companies_reporting',
        icon: Building,
    },
    {
        type: 'link',
        href: deactivated_employees.url(),
        labelKey: 'nav.card_compliance',
        icon: ShieldAlert,
    },
    {
        type: 'link',
        href: companies_deactivated_employees.url(),
        labelKey: 'nav.companies_card_compliance',
        icon: FileWarning,
    },
    { type: 'separator', labelKey: 'nav.settings_section' },
    {
        type: 'link',
        href: settings.url(),
        labelKey: 'nav.settings',
        icon: SettingsIcon,
    },
    { type: 'link', href: badge.url(), labelKey: 'nav.badge', icon: IdCard },
    {
        type: 'link',
        href: company_badge.url(),
        labelKey: 'nav.companyBadge',
        icon: Briefcase,
    },
    { type: 'link', href: users.url(), labelKey: 'nav.users', icon: Users },
    {
        type: 'link',
        href: role_permissions.url(),
        labelKey: 'nav.role_permissions',
        icon: ShieldCheck,
    },
    {
        type: 'link',
        href: activity_log.url(),
        labelKey: 'nav.activity_log',
        icon: History,
    },
];

// Permission-based gating isn't ported yet (depends on the old app's
// AccessCatalog/permissions payload) — every item is visible to any
// authenticated user until that lands with the pages that need it.
export function filterNavItems(user: User | null): NavItem[] {
    if (!user) {
        return [];
    }

    return navItems;
}
