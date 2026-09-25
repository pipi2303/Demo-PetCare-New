<?php

declare(strict_types=1);

namespace Tests\Feature\UserManagement;

use App\Models\Department;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 9 acceptance test: Department (§9.6, hierarchical) and Branch
 * (§9.7) CRUD, permission-guarded.
 */
class DepartmentBranchTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-deptbranch-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'deptbranch.isolation-test']);

        $this->tenant->run(function () {
            $admin = User::create([
                'username' => 'the.admin', 'email' => 'admin@deptbranch-test.test',
                'password' => 'Secret123!', 'first_name' => 'Admin', 'status' => 'ACTIVE',
            ]);
            $admin->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());

            $manager = User::create([
                'username' => 'the.manager', 'email' => 'manager@deptbranch-test.test',
                'password' => 'Secret123!', 'first_name' => 'Manager', 'status' => 'ACTIVE',
            ]);
            $manager->roles()->attach(Role::where('code', 'TENANT_MANAGER')->firstOrFail());
        });
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    private function loginAs(string $username): void
    {
        $this->postJson('http://deptbranch.isolation-test/api/auth/login', [
            'identifier' => $username, 'password' => 'Secret123!',
        ])->assertOk();
    }

    public function test_tenant_admin_can_manage_a_department_hierarchy(): void
    {
        $this->loginAs('the.admin');

        $parent = $this->postJson('http://deptbranch.isolation-test/api/tenant/departments', [
            'code' => 'MEDICAL', 'name' => 'Medical',
        ])->assertCreated();

        $child = $this->postJson('http://deptbranch.isolation-test/api/tenant/departments', [
            'code' => 'CARDIOLOGY', 'name' => 'Cardiology', 'parent_id' => $parent->json('data.id'),
        ])->assertCreated();

        $this->getJson('http://deptbranch.isolation-test/api/tenant/departments/'.$parent->json('data.id'))
            ->assertOk()
            ->assertJsonPath('data.children.0.id', $child->json('data.id'));

        $this->patchJson('http://deptbranch.isolation-test/api/tenant/departments/'.$child->json('data.id'), [
            'name' => 'Cardiology Renamed',
        ])->assertOk()->assertJsonPath('data.name', 'Cardiology Renamed');

        $this->deleteJson('http://deptbranch.isolation-test/api/tenant/departments/'.$child->json('data.id'))->assertOk();

        $this->tenant->run(function () use ($child) {
            $this->assertFalse(Department::where('id', $child->json('data.id'))->exists());
        });
    }

    public function test_tenant_admin_can_manage_branches(): void
    {
        $this->loginAs('the.admin');

        $created = $this->postJson('http://deptbranch.isolation-test/api/tenant/branches', [
            'code' => 'BANDUNG', 'name' => 'Bandung',
        ])->assertCreated();

        $this->getJson('http://deptbranch.isolation-test/api/tenant/branches')->assertOk()->assertJsonCount(1, 'data');

        $this->patchJson('http://deptbranch.isolation-test/api/tenant/branches/'.$created->json('data.id'), [
            'name' => 'Bandung Branch',
        ])->assertOk();

        $this->deleteJson('http://deptbranch.isolation-test/api/tenant/branches/'.$created->json('data.id'))->assertOk();
    }

    public function test_tenant_manager_can_read_but_not_manage_departments(): void
    {
        $this->loginAs('the.manager');

        $this->getJson('http://deptbranch.isolation-test/api/tenant/departments')->assertOk();

        $this->postJson('http://deptbranch.isolation-test/api/tenant/departments', [
            'code' => 'FINANCE', 'name' => 'Finance',
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }
}
