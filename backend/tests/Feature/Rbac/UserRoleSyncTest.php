<?php

declare(strict_types=1);

namespace Tests\Feature\Rbac;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 7 acceptance test: assigning/removing a user's roles, and the
 * Last Tenant Admin protection (§16).
 */
class UserRoleSyncTest extends TestCase
{
    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-userrole-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'userrole.isolation-test']);

        $this->admin = $this->tenant->run(function () {
            $user = User::create([
                'username' => 'the.admin',
                'email' => 'admin@userrole-test.test',
                'password' => 'Secret123!',
                'first_name' => 'Admin',
                'status' => 'ACTIVE',
            ]);
            $user->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());

            return $user;
        });

        $this->postJson('http://userrole.isolation-test/api/auth/login', [
            'identifier' => 'the.admin',
            'password' => 'Secret123!',
        ])->assertOk();
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_assigning_and_removing_roles_is_audited(): void
    {
        $target = $this->tenant->run(fn () => User::create([
            'username' => 'target.user',
            'email' => 'target@userrole-test.test',
            'password' => 'Secret123!',
            'first_name' => 'Target',
            'status' => 'ACTIVE',
        ]));

        $this->putJson("http://userrole.isolation-test/api/tenant/users/{$target->id}/roles", [
            'roles' => ['TENANT_MANAGER'],
        ])->assertOk()->assertJsonCount(1, 'data.roles');

        $this->putJson("http://userrole.isolation-test/api/tenant/users/{$target->id}/roles", [
            'roles' => [],
        ])->assertOk()->assertJsonCount(0, 'data.roles');

        $this->tenant->run(function () {
            $this->assertTrue(AuditLog::where('event', 'ROLE_ASSIGNED')->exists());
            $this->assertTrue(AuditLog::where('event', 'ROLE_REMOVED')->exists());
        });
    }

    public function test_the_only_tenant_admin_cannot_be_stripped_of_the_role(): void
    {
        $this->putJson("http://userrole.isolation-test/api/tenant/users/{$this->admin->id}/roles", [
            'roles' => ['USER'],
        ])->assertStatus(422)->assertJsonPath('error.code', 'LAST_ADMIN_PROTECTED');

        $this->tenant->run(function () {
            $this->assertTrue($this->admin->fresh()->hasPermission('role.delete'));
        });
    }

    public function test_removing_tenant_admin_is_allowed_when_another_admin_remains(): void
    {
        $secondAdmin = $this->tenant->run(function () {
            $user = User::create([
                'username' => 'second.admin',
                'email' => 'second@userrole-test.test',
                'password' => 'Secret123!',
                'first_name' => 'Second',
                'status' => 'ACTIVE',
            ]);
            $user->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());

            return $user;
        });

        $this->putJson("http://userrole.isolation-test/api/tenant/users/{$this->admin->id}/roles", [
            'roles' => ['USER'],
        ])->assertOk();

        $this->tenant->run(function () use ($secondAdmin) {
            $this->assertTrue($secondAdmin->fresh()->hasPermission('role.delete'));
        });
    }
}
