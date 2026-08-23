import { createRouter, createWebHistory } from 'vue-router';
import { registerRouterGuards } from './guards';

import Login from '../pages/auth/Login.vue';
import AuthCallback from '../pages/auth/AuthCallback.vue';
import AccountPendingActivation from '../pages/auth/AccountPendingActivation.vue';
import Permission from '../pages/auth/PermissionDenied.vue';
import Gate from '../pages/gate/GateKiosk.vue';
import PlateMovements from '../pages/gate/PlateMovements.vue';
import Dashboard from '../pages/admin/Dashboard.vue';
import Departments from '../pages/admin/Departments.vue';
import Bases from '../pages/admin/Bases.vue';
import Users from '../pages/admin/Users.vue';
import RolePermissions from '../pages/admin/RolePermissions.vue';
import Employees from '../pages/employees/Employees.vue';
import Companies from '../pages/companies/Companies.vue';
import CompaniesReporting from '../pages/companies/CompaniesReporting.vue';
import CompaniesIssues from '../pages/companies/CompaniesIssues.vue';
import IndividualReport from '../pages/reports/IndividualReport.vue';
import Reports from '../pages/reports/Reports.vue';
import ExportReports from '../pages/reports/ExportReports.vue';
import Issues from '../pages/issues/Issues.vue';
import Unjustified from '../pages/issues/Unjustified.vue';
import Justified from '../pages/issues/Justified.vue';
import Badge from '../pages/badge/Badge.vue';
import Settings from '../pages/settings/Settings.vue';
import { AppShellLayout, BlankLayout } from '../layouts';

const routes = [
    {
        path: '/',
        component: BlankLayout,
        children: [
            { path: '/', name: 'Login', component: Login, meta: { titleKey: 'routes.login', hideNav: true, guest: true } },
            { path: '/auth/callback', name: 'AuthCallback', component: AuthCallback, meta: { titleKey: 'routes.authCallback', hideNav: true } },
            { path: '/auth/pending', name: 'AccountPending', component: AccountPendingActivation, meta: { titleKey: 'routes.accountPending', hideNav: true } },
            { path: '/gate', name: 'Gate', component: Gate, meta: { titleKey: 'routes.gate', hideNav: true, requiresAuth: true, routeKey: 'gate' } },
            { path: '/gate/plate-search', name: 'GatePlateSearch', component: PlateMovements, meta: { titleKey: 'routes.gatePlateSearch', hideNav: true, requiresAuth: true, routeKey: 'gate_plate_search' } },
            { path: '/permission-denied', name: 'Permission', component: Permission, meta: { titleKey: 'routes.permissionDenied', hideNav: true } },
        ],
    },
    {
        path: '/',
        component: AppShellLayout,
        children: [
            { path: '/home', redirect: '/dashboard' },
            { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { titleKey: 'nav.dashboard', requiresAuth: true, routeKey: 'dashboard' } },
            { path: '/departments', name: 'Departments', component: Departments, meta: { titleKey: 'nav.departments', requiresAuth: true, routeKey: 'departments' } },
            { path: '/bases', name: 'Bases', component: Bases, meta: { titleKey: 'nav.bases', requiresAuth: true, routeKey: 'bases' } },
            { path: '/role-permissions', name: 'RolePermissions', component: RolePermissions, meta: { titleKey: 'nav.role_permissions', requiresAuth: true, routeKey: 'role_permissions' } },
            { path: '/companies', name: 'Companies', component: Companies, meta: { titleKey: 'nav.companies', requiresAuth: true, routeKey: 'companies' } },
            { path: '/companies-reporting', name: 'CompaniesReporting', component: CompaniesReporting, meta: { titleKey: 'routes.companiesReporting', requiresAuth: true, routeKey: 'companies_reporting' } },
            { path: '/companies-issues', name: 'CompaniesIssues', component: CompaniesIssues, meta: { titleKey: 'routes.companiesIssues', requiresAuth: true, routeKey: 'companies_issues' } },
            { path: '/employees', name: 'Employees', component: Employees, meta: { titleKey: 'nav.employees', requiresAuth: true, routeKey: 'employees' } },
            { path: '/reports', name: 'Reports', component: Reports, meta: { titleKey: 'routes.reports', requiresAuth: true, routeKey: 'reports' } },
            { path: '/issues', name: 'Issues', component: Issues, meta: { titleKey: 'routes.issues', requiresAuth: true, routeKey: 'issues' } },
            { path: '/exportReports', name: 'ExportReports', component: ExportReports, meta: { titleKey: 'routes.exportReports', requiresAuth: true, routeKey: 'export_reports' } },
            { path: '/unjustified', name: 'Unjustified', component: Unjustified, meta: { titleKey: 'routes.unjustified', requiresAuth: true, routeKey: 'unjustified' } },
            { path: '/justified', name: 'Justified', component: Justified, meta: { titleKey: 'routes.justified', requiresAuth: true, routeKey: 'justified' } },
            { path: '/IndividualReport', name: 'IndividualReport', component: IndividualReport, meta: { titleKey: 'nav.individual_report', requiresAuth: true, routeKey: 'individual_report' } },
            { path: '/badge', name: 'Badge', component: Badge, meta: { titleKey: 'nav.badge', requiresAuth: true, routeKey: 'badge' } },
            { path: '/settings', name: 'Settings', component: Settings, meta: { titleKey: 'nav.settings', requiresAuth: true, routeKey: 'settings' } },
            { path: '/users', name: 'Users', component: Users, meta: { titleKey: 'nav.users', requiresAuth: true, routeKey: 'users' } },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

registerRouterGuards(router);

export default router;
