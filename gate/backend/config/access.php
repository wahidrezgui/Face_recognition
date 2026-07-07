<?php

/**
 * Application access catalog — single source of truth for permissions.
 *
 * Permission names: route.{key}, {resource}.read, {resource}.write, {resource}.scope.{level}
 *
 * Route visibility in the SPA is enforced via route.* permissions from /me.
 * Do not duplicate role-to-route mappings in the frontend; use default_route_access
 * here for seeding and for roles with no explicit DB permissions.
 */
return [
    'super_admin_role' => 'Super Admin',

    'scope_levels' => [
        'global' => ['label_ar' => 'كل الوحدات', 'label_en' => 'Global'],
        'hierarchy' => ['label_ar' => 'الوحدة + الفرعية', 'label_en' => 'Unit + children'],
        'self' => ['label_ar' => 'الوحدة فقط', 'label_en' => 'Unit only'],
    ],

    /** Resources that support per-resource data scope permissions. */
    'scopable_resources' => ['dashboard', 'users', 'departments'],

    'routes' => [
        'dashboard' => ['path' => '/dashboard', 'label_ar' => 'لوحة التحكم', 'label_en' => 'Dashboard'],
        'departments' => ['path' => '/departments', 'label_ar' => 'الوحدات', 'label_en' => 'Departments'],
        'bases' => ['path' => '/bases', 'label_ar' => 'القواعد والبوابات', 'label_en' => 'Bases'],
        'companies' => ['path' => '/companies', 'label_ar' => 'الشركات', 'label_en' => 'Companies'],
        'companies_reporting' => ['path' => '/companies-reporting', 'label_ar' => 'تقارير الشركات', 'label_en' => 'Companies Reporting'],
        'companies_issues' => ['path' => '/companies-issues', 'label_ar' => 'مشاكل الشركات', 'label_en' => 'Companies Issues'],
        'employees' => ['path' => '/employees', 'label_ar' => 'الموظفين', 'label_en' => 'Employees'],
        'reports' => ['path' => '/reports', 'label_ar' => 'التقارير', 'label_en' => 'Reports'],
        'issues' => ['path' => '/issues', 'label_ar' => 'المشاكل', 'label_en' => 'Issues'],
        'export_reports' => ['path' => '/exportReports', 'label_ar' => 'تصدير التقارير', 'label_en' => 'Export Reports'],
        'unjustified' => ['path' => '/unjustified', 'label_ar' => 'غير مبرر', 'label_en' => 'Unjustified'],
        'justified' => ['path' => '/justified', 'label_ar' => 'مبرر', 'label_en' => 'Justified'],
        'individual_report' => ['path' => '/IndividualReport', 'label_ar' => 'التقارير الفردية', 'label_en' => 'Individual Report'],
        'badge' => ['path' => '/badge', 'label_ar' => 'بطاقة الدخول', 'label_en' => 'Badge'],
        'settings' => ['path' => '/settings', 'label_ar' => 'إعدادات التوقيت', 'label_en' => 'Settings'],
        'users' => ['path' => '/users', 'label_ar' => 'إدارة المستخدمين', 'label_en' => 'Users'],
        'role_permissions' => ['path' => '/role-permissions', 'label_ar' => 'صلاحيات الأدوار', 'label_en' => 'Role Permissions'],
        'gate' => ['path' => '/gate', 'label_ar' => 'البوابة - دخول / خروج', 'label_en' => 'Gate - Check-in / Check-out'],
        'gate_plate_search' => ['path' => '/gate/plate-search', 'label_ar' => 'بحث بالسيارة العسكرية', 'label_en' => 'Military Plate Search'],
    ],

    'resources' => [
        'dashboard' => ['label_ar' => 'لوحة التحكم', 'label_en' => 'Dashboard', 'scopable' => true],
        'departments' => ['label_ar' => 'الوحدات / الهيكل', 'label_en' => 'Departments', 'scopable' => true],
        'employees' => ['label_ar' => 'الموظفين', 'label_en' => 'Employees', 'scopable' => false],
        'companies' => ['label_ar' => 'الشركات', 'label_en' => 'Companies', 'scopable' => false],
        'reports' => ['label_ar' => 'التقارير', 'label_en' => 'Reports', 'scopable' => false],
        'users' => ['label_ar' => 'المستخدمين', 'label_en' => 'Users', 'scopable' => true],
        'settings' => ['label_ar' => 'الإعدادات', 'label_en' => 'Settings', 'scopable' => false],
    ],

    

    /** Default route keys per role (seeded + /me fallback when DB permissions are empty). */
    'default_route_access' => [
        'Super Admin' => ['*'],
        'Admin' => [
            'dashboard', 'departments', 'companies', 'companies_reporting', 'companies_issues',
            'employees', 'reports', 'issues', 'export_reports', 'unjustified', 'justified',
            'individual_report', 'badge', 'settings', 'users',
        ],
        'Local Admin' => [
            'dashboard', 'departments', 'employees', 'reports', 'issues', 'export_reports',
            'unjustified', 'justified', 'individual_report', 'users',
        ],
        'Gate Pass Provider' => [
            'departments', 'companies', 'companies_reporting', 'companies_issues',
            'employees', 'badge',
        ],
        'Reporting' => [
            'dashboard', 'reports', 'issues', 'export_reports', 'unjustified', 'justified', 'individual_report',
        ],
        'Inspector' => [
            'departments', 'companies', 'employees', 'reports', 'export_reports',
            'unjustified', 'justified', 'individual_report',
        ],
        'Gate Guard' => ['gate', 'gate_plate_search'],
    ],

    'default_resource_access' => [
        'Super Admin' => ['*' => ['read', 'write']],
        'Admin' => [
            'dashboard' => ['read'],
            'departments' => ['read', 'write'],
            'employees' => ['read', 'write'],
            'companies' => ['read', 'write'],
            'reports' => ['read', 'write'],
            'users' => ['read', 'write'],
            'settings' => ['read', 'write'],
        ],
        'Local Admin' => [
            'dashboard' => ['read'],
            'departments' => ['read', 'write'],
            'employees' => ['read', 'write'],
            'reports' => ['read', 'write'],
            'users' => ['read', 'write'],
        ],
        'Gate Pass Provider' => [
            'departments' => ['read'],
            'employees' => ['read', 'write'],
            'companies' => ['read', 'write'],
        ],
        'Reporting' => [
            'dashboard' => ['read'],
            'reports' => ['read', 'write'],
        ],
        'Inspector' => [
            'departments' => ['read'],
            'employees' => ['read'],
            'companies' => ['read'],
            'reports' => ['read'],
        ],
        'Gate Guard' => [],
    ],

    /**
     * Default data scope per scopable resource per role.
     * Values: global | hierarchy | self
     */
    'default_resource_scope' => [
        'Super Admin' => [
            'dashboard' => 'global',
            'users' => 'global',
            'departments' => 'global',
        ],
        'Admin' => [
            'dashboard' => 'hierarchy',
            'users' => 'hierarchy',
            'departments' => 'hierarchy',
        ],
        'Local Admin' => [
            'dashboard' => 'self',
            'users' => 'hierarchy',
            'departments' => 'self',
        ],
        'Gate Pass Provider' => [
            'departments' => 'hierarchy',
        ],
        'Reporting' => [
            'dashboard' => 'hierarchy',
        ],
        'Inspector' => [
            'dashboard' => 'hierarchy',
            'departments' => 'global',
            'users' => 'hierarchy',
        ],
        'Gate Guard' => [],
    ],

    /**
     * Roles an actor may assign when creating/editing users (names must exist in DB).
     * Use ['*'] to allow every role from the roles table.
     */
    'assignable_roles' => [
        'Super Admin' => ['*'],
        'Admin' => ['Admin', 'Local Admin', 'Gate Pass Provider', 'Gate Guard', 'Reporting', 'Inspector'],
        'Local Admin' => ['Reporting', 'Local Admin'],
    ],

    /** Role names that require dep_id on user create/update. */
    'roles_requiring_department' => ['Admin', 'Local Admin', 'Reporting'],
];
