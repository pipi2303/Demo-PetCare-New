<?php

declare(strict_types=1);

namespace Tests\Feature\UserManagement;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 9 acceptance test: Last Tenant Admin protection (§16) extended to
 * destroy/suspend/deactivate, on top of Phase 7's role-removal coverage.
 */
class LastAdminProtectionTest extends TestCase
{
    private Tenant $tenant;

    private User $solyAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-lastadmin2-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'lastadmin2.isolation-test']);

        $this->solyAdmin = $this->tenant->run(function () {
            $admin = User::create([
                'username' => 'the.admin', 'email' => 'admin@lastadmin2-test.test',
                'password' => 'Secret123!', 'first_name' => 'Admin', 'status' => 'ACTIVE',
            ]);
            $admin->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());

            return $admin;
        });

        $this->postJson('http://lastadmin2.isolation-test/api/auth/login', [
            'identifier' => 'the.admin', 'password' => 'Secret123!',
        ])->assertOk();
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_the_sole_admin_cannot_be_suspended_deactivated_or_deleted(): void
    {
        $id = $this->solyAdmin->id;

        $this->postJson("http://lastadmin2.isolation-test/api/tenant/users/{$id}/suspend")
            ->assertStatus(422)->assertJsonPath('error.code', 'LAST_ADMIN_PROTECTED');

        $this->postJson("http://lastadmin2.isolation-test/api/tenant/users/{$id}/deactivate")
            ->assertStatus(422)->assertJsonPath('error.code', 'LAST_ADMIN_PROTECTED');

        $this->deleteJson("http://lastadmin2.isolation-test/api/tenant/users/{$id}")
            ->assertStatus(422)->assertJsonPath('error.code', 'LAST_ADMIN_PROTECTED');
    }

    public function test_a_second_admin_can_be_suspended_deactivated_or_deleted(): void
    {
        $second = $this->tenant->run(function () {
            $admin = User::create([
                'username' => 'second.admin', 'email' => 'second@lastadmin2-test.test',
                'password' => 'Secret123!', 'first_name' => 'Second', 'status' => 'ACTIVE',
            ]);
            $admin->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());

            return $admin;
        });

        $this->postJson("http://lastadmin2.isolation-test/api/tenant/users/{$second->id}/suspend")->assertOk();
        $this->postJson("http://lastadmin2.isolation-test/api/tenant/users/{$second->id}/activate")->assertOk();
        $this->deleteJson("http://lastadmin2.isolation-test/api/tenant/users/{$second->id}")->assertOk();
    }

    public function test_a_regular_user_can_always_be_suspended(): void
    {
        $regular = $this->tenant->run(function () {
            $user = User::create([
                'username' => 'regular.user', 'email' => 'regular@lastadmin2-test.test',
                'password' => 'Secret123!', 'first_name' => 'Regular', 'status' => 'ACTIVE',
            ]);
            $user->roles()->attach(Role::where('code', 'USER')->firstOrFail());

            return $user;
        });

        $this->postJson("http://lastadmin2.isolation-test/api/tenant/users/{$regular->id}/suspend")->assertOk();
    }
}
