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
import AllUsers from '../pages/admin/AllUsers.vue';
import Dep from '../pages/organization/MyDepartments.vue';
import Database from '../pages/employees/Database.vue';
import Companies from '../pages/companies/Companies.vue';
import CompaniesReporting from '../pages/companies/CompaniesReporting.vue';
import CompaniesIssues from '../pages/companies/CompaniesIssues.vue';
import IndividualReport from '../pages/reports/IndividualReport.vue';
import Reports from '../pages/reports/Reports.vue';
import ReportsNew from '../pages/reports/ReportsNew.vue';
import ExportReports from '../pages/reports/ExportReports.vue';
import Advanced from '../pages/reports/Advanced.vue';
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
            { path: '/gate', name: 'Gate', component: Gate, meta: { title: 'Gate - Checkin / Checkout ' + appname, hideNav: true, requiresAuth: true, roles: 'Gate Guard' } },
            { path: '/gate/plate-search', name: 'GatePlateSearch', component: PlateMovements, meta: { title: 'بحث بالسيارة العسكرية' + appname, hideNav: true, requiresAuth: true, roles: 'Gate Guard' } },
            { path: '/permission-denied', name: 'Permission', component: Permission, meta: { title: 'Permission Denied ' + appname, hideNav: true } },
        ],
    },
    {
        path: '/',
        component: AppShellLayout,
        children: [
            { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { title: 'لوحة الإدارة' + appname, requiresAuth: true, roles: 'Super Admin' } },
            { path: '/bases', name: 'Bases', component: Bases, meta: { title: 'القواعد والبوابات' + appname, requiresAuth: true, roles: 'Super Admin' } },
            { path: '/allusers', name: 'Allusers', component: AllUsers, meta: { title: 'إدارة المستخدمين' + appname, requiresAuth: true, roles: 'Super Admin' } },
            { path: '/home', name: 'Home', component: Dashboard, meta: { title: 'لوحة التحكم' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/mydepartments', name: 'Dep', component: Dep, meta: { title: 'الوحدات' + appname, requiresAuth: true, roles: ['Admin', 'Gate Pass Provider', 'Local Admin'] } },
            { path: '/companies', name: 'Companies', component: Companies, meta: { title: 'الشركات' + appname, requiresAuth: true, roles: ['Admin', 'Gate Pass Provider'] } },
            { path: '/companies-reporting', name: 'CompaniesReporting', component: CompaniesReporting, meta: { title: 'تقارير الشركات' + appname, requiresAuth: true, roles: ['Admin', 'Gate Pass Provider'] } },
            { path: '/companies-issues', name: 'CompaniesIssues', component: CompaniesIssues, meta: { title: 'مشاكل الشركات' + appname, requiresAuth: true, roles: ['Admin', 'Gate Pass Provider'] } },
            { path: '/database', name: 'Database', component: Database, meta: { title: 'الموظفين' + appname, requiresAuth: true, roles: ['Admin', 'Gate Pass Provider', 'Local Admin'] } },
            { path: '/reports', name: 'Reports', component: Reports, meta: { title: 'التقارير' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/reportsnew', name: 'ReportsNew', component: ReportsNew, meta: { title: 'التقارير الجديدة' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/issues', name: 'Issues', component: Issues, meta: { title: 'المشاكل' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/exportReports', name: 'ExportReports', component: ExportReports, meta: { title: 'تصدير التقارير' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/unjustified', name: 'Unjustified', component: Unjustified, meta: { title: 'غير مبرر' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/justified', name: 'Justified', component: Justified, meta: { title: 'مبرر' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/IndividualReport', name: 'IndividualReport', component: IndividualReport, meta: { title: 'التقارير' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/advanced', name: 'Advanced', component: Advanced, meta: { title: 'متقدم' + appname, requiresAuth: true, roles: ['Admin', 'Reporting', 'Local Admin'] } },
            { path: '/badge', name: 'Badge', component: Badge, meta: { title: 'بطاقة الدخول' + appname, requiresAuth: true, roles: ['Admin', 'Gate Pass Provider'] } },
            { path: '/settings', name: 'Settings', component: Settings, meta: { title: 'إعدادات التوقيت' + appname, requiresAuth: true, roles: 'Admin' } },
            { path: '/users', name: 'Users', component: AllUsers, meta: { title: 'إدارة المستخدمين' + appname, requiresAuth: true, roles: ['Admin', 'Local Admin'] } },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

registerRouterGuards(router);

export default router;
