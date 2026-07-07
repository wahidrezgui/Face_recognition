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

const appname = '  -   [القوات المسلحة القطرية - نظــام الدخـول والخـروج]';

const routes = [
    {
        path: '/',
        component: BlankLayout,
        children: [
            { path: '/', name: 'Login', component: Login, meta: { title: 'Login' + appname, hideNav: true, guest: true } },
            { path: '/auth/callback', name: 'AuthCallback', component: AuthCallback, meta: { title: 'Signing in' + appname, hideNav: true } },
            { path: '/auth/pending', name: 'AccountPending', component: AccountPendingActivation, meta: { title: 'تفعيل الحساب' + appname, hideNav: true } },
            { path: '/gate', name: 'Gate', component: Gate, meta: { title: 'Gate - Checkin / Checkout ' + appname, hideNav: true, requiresAuth: true, routeKey: 'gate' } },
            { path: '/gate/plate-search', name: 'GatePlateSearch', component: PlateMovements, meta: { title: 'بحث بالسيارة العسكرية' + appname, hideNav: true, requiresAuth: true, routeKey: 'gate_plate_search' } },
            { path: '/permission-denied', name: 'Permission', component: Permission, meta: { title: 'Permission Denied ' + appname, hideNav: true } },
        ],
    },
    {
        path: '/',
        component: AppShellLayout,
        children: [
            { path: '/home', redirect: '/dashboard' },
            { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { title: 'لوحة التحكم' + appname, requiresAuth: true, routeKey: 'dashboard' } },
            { path: '/departments', name: 'Departments', component: Departments, meta: { title: 'الوحدات' + appname, requiresAuth: true, routeKey: 'departments' } },
            { path: '/bases', name: 'Bases', component: Bases, meta: { title: 'القواعد والبوابات' + appname, requiresAuth: true, routeKey: 'bases' } },
            { path: '/role-permissions', name: 'RolePermissions', component: RolePermissions, meta: { title: 'صلاحيات الأدوار' + appname, requiresAuth: true, routeKey: 'role_permissions' } },
            { path: '/companies', name: 'Companies', component: Companies, meta: { title: 'الشركات' + appname, requiresAuth: true, routeKey: 'companies' } },
            { path: '/companies-reporting', name: 'CompaniesReporting', component: CompaniesReporting, meta: { title: 'تقارير الشركات' + appname, requiresAuth: true, routeKey: 'companies_reporting' } },
            { path: '/companies-issues', name: 'CompaniesIssues', component: CompaniesIssues, meta: { title: 'مشاكل الشركات' + appname, requiresAuth: true, routeKey: 'companies_issues' } },
            { path: '/employees', name: 'Employees', component: Employees, meta: { title: 'الموظفين' + appname, requiresAuth: true, routeKey: 'employees' } },
            { path: '/reports', name: 'Reports', component: Reports, meta: { title: 'التقارير' + appname, requiresAuth: true, routeKey: 'reports' } },
            { path: '/issues', name: 'Issues', component: Issues, meta: { title: 'المشاكل' + appname, requiresAuth: true, routeKey: 'issues' } },
            { path: '/exportReports', name: 'ExportReports', component: ExportReports, meta: { title: 'تصدير التقارير' + appname, requiresAuth: true, routeKey: 'export_reports' } },
            { path: '/unjustified', name: 'Unjustified', component: Unjustified, meta: { title: 'غير مبرر' + appname, requiresAuth: true, routeKey: 'unjustified' } },
            { path: '/justified', name: 'Justified', component: Justified, meta: { title: 'مبرر' + appname, requiresAuth: true, routeKey: 'justified' } },
            { path: '/IndividualReport', name: 'IndividualReport', component: IndividualReport, meta: { title: 'التقارير' + appname, requiresAuth: true, routeKey: 'individual_report' } },
            { path: '/badge', name: 'Badge', component: Badge, meta: { title: 'بطاقة الدخول' + appname, requiresAuth: true, routeKey: 'badge' } },
            { path: '/settings', name: 'Settings', component: Settings, meta: { title: 'إعدادات التوقيت' + appname, requiresAuth: true, routeKey: 'settings' } },
            { path: '/users', name: 'Users', component: Users, meta: { title: 'إدارة المستخدمين' + appname, requiresAuth: true, routeKey: 'users' } },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

registerRouterGuards(router);

export default router;
