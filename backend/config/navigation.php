<?php

declare(strict_types=1);

/**
 * Master menu tree (§8.4). The frontend never defines this — it only
 * renders whatever GET /api/navigation returns, filtered per request by
 * NavigationService against the current tenant's enabled features and the
 * current user's permissions ("Menu tidak boleh sepenuhnya hard-coded"
 * means the frontend doesn't own it; the definition living in backend
 * code, dynamically filtered per request, satisfies that).
 *
 * Each item: code, label, route, icon, optional `feature` (a Feature code
 * — the tenant must have it enabled), optional `permission` (the user
 * must hold it), optional `children` (same shape, recursive).
 *
 * The business-module items below (Patient Management, Appointment, ...)
 * are feature-gated only — permission codes like `patient.read` don't
 * exist in our catalog yet (Phase 4 seeded only the generic administrative
 * set). They'll gain their own permission gate once Phase 9+ actually
 * builds those modules; until then, having the feature enabled is enough
 * to see the menu entry.
 */
return [
    'items' => [
        [
            'code' => 'DASHBOARD',
            'label' => 'Dashboard',
            'route' => '/dashboard',
            'icon' => 'dashboard',
        ],
        [
            'code' => 'USER_MANAGEMENT',
            'label' => 'User Management',
            'route' => '/users',
            'icon' => 'users',
            'permission' => 'user.read',
        ],
        [
            'code' => 'ROLE_MANAGEMENT',
            'label' => 'Role Management',
            'route' => '/roles',
            'icon' => 'shield',
            'permission' => 'role.read',
        ],
        [
            'code' => 'PATIENT_MANAGEMENT',
            'label' => 'Patient Management',
            'icon' => 'patients',
            'feature' => 'PATIENT_MANAGEMENT',
            'children' => [
                [
                    'code' => 'PATIENT_LIST',
                    'label' => 'Patients',
                    'route' => '/patients',
                    'icon' => 'patients',
                ],
            ],
        ],
        [
            'code' => 'APPOINTMENT',
            'label' => 'Appointment',
            'route' => '/appointments',
            'icon' => 'calendar',
            'feature' => 'APPOINTMENT',
        ],
        [
            'code' => 'PHARMACY',
            'label' => 'Pharmacy',
            'route' => '/pharmacy',
            'icon' => 'pill',
            'feature' => 'PHARMACY',
        ],
        [
            'code' => 'LABORATORY',
            'label' => 'Laboratory',
            'route' => '/laboratory',
            'icon' => 'flask',
            'feature' => 'LABORATORY',
        ],
        [
            'code' => 'BILLING',
            'label' => 'Billing',
            'route' => '/billing',
            'icon' => 'receipt',
            'feature' => 'BILLING',
        ],
        [
            'code' => 'REPORTING',
            'label' => 'Reporting',
            'route' => '/reports',
            'icon' => 'chart',
            'feature' => 'REPORTING',
        ],
        [
            'code' => 'AI',
            'label' => 'AI',
            'route' => '/ai',
            'icon' => 'sparkles',
            'feature' => 'AI',
        ],
    ],
];
