<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Default tenant roles + permissions (Master Prompt Phase 4).
 *
 * Deliberately excludes `tenant.read/create/update/delete` from the doc's
 * permission list: that authority belongs solely to the Platform Admin (a
 * coarse enum role, per the Phase 2 decision not to give the platform side
 * a granular permission table) — a tenant can never manage tenant records
 * from inside its own scope, so those codes would have nothing to check.
 * See the Phase 3/4 plan for the full rationale.
 *
 * Idempotent: safe to run against the same tenant database repeatedly
 * (updateOrCreate + syncWithoutDetaching never produce duplicates).
 */
class TenantRolesAndPermissionsSeeder extends Seeder
{
    /**
     * Default permission catalog, grouped by the tenant role that gets it.
     * TENANT_ADMIN implicitly receives every permission listed here.
     *
     * @var array<string, list<string>>
     */
    private const PERMISSIONS_BY_ROLE = [
        'TENANT_MANAGER' => [
            'user.read', 'user.update',
            'role.read',
            'permission.read',
            'feature.read',
            'menu.read',
        ],
        'USER' => [
            'menu.read',
        ],
    ];

    private const ALL_PERMISSIONS = [
        'user.read', 'user.create', 'user.update', 'user.delete',
        'role.read', 'role.create', 'role.update', 'role.delete',
        'permission.read',
        'feature.read', 'feature.manage',
        'menu.read', 'menu.manage',
        // Phase 9 — not in the doc's Phase 4 list, added since departments/
        // branches need their own gate; TENANT_ADMIN only (below), not
        // TENANT_MANAGER's read-leaning grant.
        'department.manage', 'branch.manage',
    ];

    public function run(): void
    {
        $permissions = collect(self::ALL_PERMISSIONS)->mapWithKeys(function (string $code) {
            $permission = Permission::updateOrCreate(
                ['code' => $code],
                ['name' => $this->humanize($code)],
            );

            return [$code => $permission];
        });

        $roles = collect(['TENANT_ADMIN', 'TENANT_MANAGER', 'USER'])->mapWithKeys(function (string $code) {
            $role = Role::updateOrCreate(
                ['code' => $code],
                ['name' => $this->humanize($code)],
            );

            return [$code => $role];
        });

        $roles['TENANT_ADMIN']->permissions()->syncWithoutDetaching(
            $permissions->pluck('id')->all()
        );

        foreach (self::PERMISSIONS_BY_ROLE as $roleCode => $permissionCodes) {
            $roles[$roleCode]->permissions()->syncWithoutDetaching(
                $permissions->only($permissionCodes)->pluck('id')->all()
            );
        }
    }

    private function humanize(string $code): string
    {
        return str($code)->replace(['.', '_'], ' ')->title()->toString();
    }
}
