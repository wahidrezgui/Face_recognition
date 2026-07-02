<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Dashboard department scope by role
    |--------------------------------------------------------------------------
    |
    | global    — entire organization (Super Admin)
    | hierarchy — user's dep_id + all sub-departments
    | self      — user's dep_id only, no children
    |
    */
    'scope_by_role' => [
        'Super Admin' => 'global',
        'Admin' => 'hierarchy',
        'Local Admin' => 'self',
        'Reporting' => 'hierarchy',
    ],
];
