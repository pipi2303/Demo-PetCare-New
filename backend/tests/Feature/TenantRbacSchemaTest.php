<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 2 acceptance test: proves the tenant-side schema (users, roles,
 * permissions, departments) and its Eloquent relationships actually work,
 * not just that the migrations run. Same real-tenant approach as
 * TenantIsolationTest (no RefreshDatabase — see that class for why).
 */
class TenantRbacSchemaTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-schema-tenant']);
        $this->tenant->domains()->create(['domain' => 'schema.isolation-test']);
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_user_can_be_assigned_a_role_and_inherits_its_permissions(): void
    {
        $this->tenant->run(function (): void {
            $user = User::create([
                'username' => 'budi.santoso',
                'email' => 'budi@tenant.test',
                'password' => bcrypt('secret'),
                'first_name' => 'Budi',
                'status' => 'ACTIVE',
            ]);

            $role = Role::create(['code' => 'DOCTOR', 'name' => 'Doctor']);
            $read = Permission::create(['code' => 'patient.read', 'name' => 'Read Patient']);
            $create = Permission::create(['code' => 'patient.create', 'name' => 'Create Patient']);
            $role->permissions()->attach([$read->id, $create->id]);

            $user->roles()->attach($role);

            $effectivePermissions = $user->roles()
                ->with('permissions')
                ->get()
                ->pluck('permissions')
                ->flatten()
                ->pluck('code')
                ->unique()
                ->values();

            $this->assertTrue($effectivePermissions->contains('patient.read'));
            $this->assertTrue($effectivePermissions->contains('patient.create'));
            $this->assertFalse($effectivePermissions->contains('patient.delete'));
        });
    }

    public function test_department_hierarchy_resolves_parent_and_children(): void
    {
        $this->tenant->run(function (): void {
            $medical = Department::create(['code' => 'MEDICAL', 'name' => 'Medical']);
            $cardiology = Department::create([
                'code' => 'CARDIOLOGY',
                'name' => 'Cardiology',
                'parent_id' => $medical->id,
            ]);

            $this->assertSame($medical->id, $cardiology->parent->id);
            $this->assertTrue($medical->children->contains('id', $cardiology->id));
        });
    }

    public function test_username_and_email_uniqueness_is_enforced_per_tenant_database(): void
    {
        $this->tenant->run(function (): void {
            User::create([
                'username' => 'budi.santoso',
                'email' => 'budi@tenant.test',
                'password' => bcrypt('secret'),
                'first_name' => 'Budi',
                'status' => 'ACTIVE',
            ]);

            $this->expectException(QueryException::class);

            User::create([
                'username' => 'budi.santoso',
                'email' => 'someoneelse@tenant.test',
                'password' => bcrypt('secret'),
                'first_name' => 'Duplicate',
                'status' => 'ACTIVE',
            ]);
        });
    }
}
