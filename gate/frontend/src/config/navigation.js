import { navItemVisible } from '../lib/auth-roles';

export const navItems = [
    {
        to: '/dashboard',
        routeKey: 'dashboard',
        labelKey: 'nav.dashboard',
        icon: 'pi-chart-bar',
    },
    {
        to: '/departments',
        routeKey: 'departments',
        labelKey: 'nav.departments',
        icon: 'pi-sitemap',
    },
    {
        to: '/users',
        routeKey: 'users',
        labelKey: 'nav.users',
        icon: 'pi-users',
    },

    {
        to: '/bases',
        routeKey: 'bases',
        labelKey: 'nav.bases',
        icon: 'pi-map-marker',
    },
    {
        to: '/employees',
        routeKey: 'employees',
        labelKey: 'nav.employees',
        icon: 'pi-users',
    },
    {
        to: '/companies',
        routeKey: 'companies',
        labelKey: 'nav.companies',
        icon: 'pi-building',
    },
    {
        to: '/IndividualReport',
        routeKey: 'individual_report',
        labelKey: 'nav.individual_report',
        icon: 'pi-chart-bar',
    },
    {
        to: '/settings',
        routeKey: 'settings',
        labelKey: 'nav.settings',
        icon: 'pi-clock',
    },
    {
        to: '/badge',
        routeKey: 'badge',
        labelKey: 'nav.badge',
        icon: 'pi-id-card',
    },
    {
        to: '/role-permissions',
        routeKey: 'role_permissions',
        labelKey: 'nav.role_permissions',
        icon: 'pi-shield',
    },
];

export function filterNavItems(user) {
    if (!user) {
        return [];
    }

    return navItems.filter((item) => navItemVisible(item, user));
}
