<?php

declare(strict_types=1);

namespace Tests\Feature\Rbac;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 7 acceptance test: role/permission management API and the
 * Permission Guard protecting it (Master Prompt §7, §21 "Role").
 */
class RoleManagementTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-rbac-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'rbac.isolation-test']);
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    private function loginAs(string $username): void
    {
        $this->postJson('http://rbac.isolation-test/api/auth/login', [
            'identifier' => $username,
            'password' => 'Secret123!',
        ])->assertOk();
    }

    private function makeUser(string $username, string $roleCode): User
    {
        return $this->tenant->run(function () use ($username, $roleCode) {
            $user = User::create([
                'username' => $username,
                'email' => "{$username}@rbac-test.test",
                'password' => 'Secret123!',
                'first_name' => 'Test',
                'status' => 'ACTIVE',
            ]);

            $role = Role::where('code', $roleCode)->firstOrFail();
            $user->roles()->attach($role);

            return $user;
        });
    }

    public function test_a_user_without_role_read_is_forbidden(): void
    {
        $this->makeUser('plain.user', 'USER');
        $this->loginAs('plain.user');

        $this->getJson('http://rbac.isolation-test/api/tenant/roles')
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_tenant_admin_can_manage_roles_and_their_permissions(): void
    {
        $this->makeUser('the.admin', 'TENANT_ADMIN');
        $this->loginAs('the.admin');

        $this->getJson('http://rbac.isolation-test/api/tenant/roles')->assertOk();
        $this->getJson('http://rbac.isolation-test/api/tenant/permissions')->assertOk();

        $created = $this->postJson('http://rbac.isolation-test/api/tenant/roles', [
            'code' => 'BILLING_CLERK',
            'name' => 'Billing Clerk',
        ])->assertCreated();

        $roleId = $created->json('data.id');

        $this->putJson("http://rbac.isolation-test/api/tenant/roles/{$roleId}/permissions", [
            'permissions' => ['user.read', 'permission.read'],
        ])->assertOk()->assertJsonCount(2, 'data.permissions');

        $this->patchJson("http://rbac.isolation-test/api/tenant/roles/{$roleId}", [
            'name' => 'Billing Clerk (Renamed)',
        ])->assertOk()->assertJsonPath('data.name', 'Billing Clerk (Renamed)');

        $this->deleteJson("http://rbac.isolation-test/api/tenant/roles/{$roleId}")->assertOk();

        $this->tenant->run(function () {
            $this->assertFalse(Role::where('code', 'BILLING_CLERK')->exists());
        });
    }

    public function test_permission_sync_is_reflected_in_a_users_effective_permissions(): void
    {
        $user = $this->makeUser('scoped.user', 'USER');

        $this->tenant->run(function () use ($user) {
            $role = Role::where('code', 'USER')->firstOrFail();
            $permission = Permission::where('code', 'feature.read')->firstOrFail();
            $role->permissions()->syncWithoutDetaching([$permission->id]);

            $this->assertTrue($user->fresh()->hasPermission('feature.read'));
            $this->assertTrue($user->fresh()->hasPermission('menu.read')); // already seeded onto USER
            $this->assertFalse($user->fresh()->hasPermission('role.delete'));
        });
    }

    public function test_a_user_with_multiple_roles_gets_the_union_of_their_permissions(): void
    {
        $user = $this->makeUser('multi.role', 'USER');

        $this->tenant->run(function () use ($user) {
            $manager = Role::where('code', 'TENANT_MANAGER')->firstOrFail();
            $user->roles()->attach($manager);

            $codes = $user->fresh()->permissionCodes();

            $this->assertTrue($codes->contains('menu.read')); // from USER
            $this->assertTrue($codes->contains('user.read')); // from TENANT_MANAGER
        });
    }
}
