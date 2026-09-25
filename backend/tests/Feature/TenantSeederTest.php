<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Database\Seeders\TenantRolesAndPermissionsSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 4 acceptance test: default tenant roles/permissions are seeded
 * correctly and the seeder is idempotent (Master Prompt Phase 4 Seed Rules).
 */
class TenantSeederTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-seeder-tenant']);
        $this->tenant->domains()->create(['domain' => 'seeder.isolation-test']);
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_default_roles_and_permissions_are_seeded_with_expected_grants(): void
    {
        $this->tenant->run(function (): void {
            (new TenantRolesAndPermissionsSeeder)->run();

            $this->assertSame(['TENANT_ADMIN', 'TENANT_MANAGER', 'USER'], Role::pluck('code')->sort()->values()->all());

            $admin = Role::where('code', 'TENANT_ADMIN')->first();
            $manager = Role::where('code', 'TENANT_MANAGER')->first();
            $user = Role::where('code', 'USER')->first();

            $this->assertSame(Permission::count(), $admin->permissions()->count());
            $this->assertTrue($manager->permissions->pluck('code')->contains('user.read'));
            $this->assertFalse($manager->permissions->pluck('code')->contains('user.delete'));
            $this->assertSame(['menu.read'], $user->permissions->pluck('code')->all());
        });
    }

    public function test_seeding_twice_does_not_create_duplicates(): void
    {
        $this->tenant->run(function (): void {
            (new TenantRolesAndPermissionsSeeder)->run();
            (new TenantRolesAndPermissionsSeeder)->run();

            $this->assertSame(3, Role::count());
            // 13 from Phase 4 + department.manage/branch.manage added in
            // Phase 9.
            $this->assertSame(15, Permission::count());
            $this->assertSame(
                Permission::count(),
                Role::where('code', 'TENANT_ADMIN')->first()->permissions()->count()
            );
        });
    }
}
