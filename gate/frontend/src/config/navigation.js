export const navItems = [
    {
        to: '/dashboard',
        label: 'لوحة الإدارة',
        icon: 'pi-chart-bar',
        roles: ['Super Admin'],
    },
    {
        to: '/allusers',
        label: 'إدارة المستخدمين',
        icon: 'pi-users',
        roles: ['Super Admin'],
    },
    // {
    //     to: '/departments',
    //     label: 'الأقسام',
    //     icon: 'pi-sitemap',
    //     roles: ['Super Admin'],
    // },
    {
        to: '/bases',
        label: 'القواعد والبوابات',
        icon: 'pi-map-marker',
        roles: ['Super Admin'],
    },
    {
        to: '/home',
        label: 'لوحة التحكم',
        icon: 'pi-home',
        roles: ['Admin', 'Reporting', 'Local Admin'],
    },
    {
        to: '/mydepartments',
        label: 'الوحدات',
        icon: 'pi-sitemap',
        roles: ['Admin', 'Local Admin'],
    },
    {
        to: '/database',
        label: 'الموظفين',
        icon: 'pi-users',
        roles: ['Admin', 'Gate Pass Provider', 'Local Admin'],
    },
    {
        to: '/companies',
        label: 'الشركات',
        icon: 'pi-building',
        roles: ['Admin', 'Gate Pass Provider'],
    },
    {
        to: '/IndividualReport',
        label: 'التقارير',
        icon: 'pi-chart-bar',
        roles: ['Admin', 'Reporting', 'Local Admin'],
    },
    {
        to: '/settings',
        label: 'إعدادات التوقيت',
        icon: 'pi-clock',
        roles: ['Admin'],
    },
    {
        to: '/users',
        label: 'إدارة المستخدمين',
        icon: 'pi-user',
        roles: ['Admin', 'Local Admin'],
    },
];

export function filterNavItems(role) {
    if (!role) {
        return [];
    }

    return navItems.filter((item) => item.roles.includes(role));
}
