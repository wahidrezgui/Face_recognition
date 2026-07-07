<?php

/**
 * Spatie permission middleware strings for API routes.
 * Names match config/access.php: {resource}.read, {resource}.write
 */
return [
    'read_employees' => 'permission:employees.read|employees.write',
    'write_employees' => 'permission:employees.write',

    'read_departments' => 'permission:departments.read|departments.write',
    'write_departments' => 'permission:departments.write',

    'read_companies' => 'permission:companies.read|companies.write',
    'write_companies' => 'permission:companies.write',

    'read_users' => 'permission:users.read|users.write',
    'write_users' => 'permission:users.write',

    'read_reports' => 'permission:reports.read|reports.write',
    'write_reports' => 'permission:reports.write',

    'read_settings' => 'permission:settings.read|settings.write',
    'write_settings' => 'permission:settings.write',

    'manage_role_permissions' => 'permission:route.role_permissions',
];
