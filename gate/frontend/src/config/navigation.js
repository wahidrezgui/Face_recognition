import { navItemVisible } from '../lib/auth-roles';

export const navItems = [
    {
        to: '/dashboard',
        routeKey: 'dashboard',
        label: 'لوحة التحكم',
        icon: 'pi-chart-bar',
    },
    {
        to: '/departments',
        routeKey: 'departments',
        label: 'الوحدات',
        icon: 'pi-sitemap',
    },
    {
        to: '/users',
        routeKey: 'users',
        label: 'إدارة المستخدمين',
        icon: 'pi-users',
    },

    {
        to: '/bases',
        routeKey: 'bases',
        label: 'القواعد والبوابات',
        icon: 'pi-map-marker',
    },
    {
        to: '/employees',
        routeKey: 'employees',
        label: 'الموظفين',
        icon: 'pi-users',
    },
    {
        to: '/companies',
        routeKey: 'companies',
        label: 'الشركات',
        icon: 'pi-building',
    },
    {
        to: '/IndividualReport',
        routeKey: 'individual_report',
        label: 'التقارير',
        icon: 'pi-chart-bar',
    },
    {
        to: '/settings',
        routeKey: 'settings',
        label: 'إعدادات التوقيت',
        icon: 'pi-clock',
    },
    {
        to: '/badge',
        routeKey: 'badge',
        label: 'بطاقة الدخول',
        icon: 'pi-id-card',
    },
    {
        to: '/role-permissions',
        routeKey: 'role_permissions',
        label: 'صلاحيات الأدوار',
        icon: 'pi-shield',
    },
];

export function filterNavItems(user) {
    if (!user) {
        return [];
    }

    return navItems.filter((item) => navItemVisible(item, user));
}
