<?php

declare(strict_types=1);

namespace Tests\Feature\Platform;

use App\Exceptions\ApiException;
use App\Models\PlatformAuditLog;
use App\Models\PlatformUser;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantProvisioningJob;
use App\Models\User;
use App\Models\UserInvitation;
use App\Services\Tenant\TenantProvisioningService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Phase 6 acceptance test: the tenant provisioning pipeline (Master Prompt
 * §6, §27). No RefreshDatabase — provisioning creates real physical tenant
 * databases (see TenantIsolationTest for why that's incompatible with it).
 */
class TenantProvisioningTest extends TestCase
{
    private PlatformUser $platformAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->platformAdmin = PlatformUser::create([
            'username' => 'superadmin',
            'email' => 'admin@provisioning-test.test',
            'password' => 'Secret123!',
            'first_name' => 'Super',
            'status' => 'ACTIVE',
        ]);
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');

        // $tenant->delete() already fires TenantDeleted -> DeleteDatabase
        // (Phase 1), so it alone drops the physical database — no need to
        // call the manager directly too. It's wrapped here only because a
        // tenant whose DB was already dropped by
        // TenantProvisioningService::recordFailure() makes that DeleteDatabase
        // job fail (nothing left to drop); the row still needs removing.
        foreach (Tenant::all() as $tenant) {
            TenantProvisioningJob::where('tenant_id', $tenant->id)->delete();

            try {
                $tenant->delete();
            } catch (\Throwable $e) {
                DB::table('tenants')->where('id', $tenant->id)->delete();
            }
        }

        // forceDelete, not delete: PlatformUser uses SoftDeletes, and a
        // soft-deleted row would still violate the username/email unique
        // constraints on the next test method's insert.
        $this->platformAdmin->forceDelete();

        parent::tearDown();
    }

    private function loginAsPlatformAdmin(): void
    {
        $this->postJson('/api/platform/auth/login', [
            'identifier' => 'superadmin',
            'password' => 'Secret123!',
        ])->assertOk();
    }

    public function test_provisioning_a_tenant_requires_authentication(): void
    {
        $this->postJson('/api/platform/tenants', [
            'id' => 'no-auth-tenant',
            'name' => 'No Auth',
            'domain' => 'no-auth.isolation-test',
            'admin' => ['first_name' => 'X', 'email' => 'x@no-auth.test'],
        ])->assertStatus(401);
    }

    public function test_platform_admin_can_provision_a_fully_working_tenant(): void
    {
        Mail::fake();
        $this->loginAsPlatformAdmin();

        $response = $this->postJson('/api/platform/tenants', [
            'id' => 'prov-test-tenant',
            'name' => 'Provisioning Test Clinic',
            'domain' => 'prov-test.isolation-test',
            'admin' => ['first_name' => 'Budi', 'last_name' => 'Santoso', 'email' => 'budi@prov-test.test'],
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'ACTIVE');

        $tenant = Tenant::find('prov-test-tenant');
        $this->assertNotNull($tenant);
        $this->assertTrue($tenant->database()->manager()->databaseExists($tenant->database()->getName()));

        $this->assertSame(
            'COMPLETED',
            TenantProvisioningJob::where('tenant_id', 'prov-test-tenant')->latest('id')->first()->status,
        );

        $this->assertTrue(PlatformAuditLog::where('event', 'TENANT_CREATED')->where('target_id', 'prov-test-tenant')->exists());

        $tenant->run(function () {
            $admin = User::where('email', 'budi@prov-test.test')->first();

            $this->assertNotNull($admin);
            $this->assertSame('INVITED', $admin->status);
            $this->assertTrue($admin->roles->pluck('code')->contains('TENANT_ADMIN'));
            $this->assertTrue(UserInvitation::where('user_id', $admin->id)->whereNull('accepted_at')->exists());

            // Seeded automatically by the TenantCreated pipeline (Phase 4's
            // seeder, now wired into provisioning).
            $this->assertSame(3, Role::count());
        });
    }

    public function test_duplicate_tenant_id_is_rejected_by_validation(): void
    {
        $this->loginAsPlatformAdmin();

        Tenant::create(['id' => 'existing-tenant', 'status' => 'ACTIVE']);

        $this->postJson('/api/platform/tenants', [
            'id' => 'existing-tenant',
            'name' => 'Duplicate',
            'domain' => 'dup.isolation-test',
            'admin' => ['first_name' => 'X', 'email' => 'x@dup.test'],
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_a_failure_after_the_database_exists_keeps_the_tenant_and_job_but_drops_the_database(): void
    {
        Mail::fake();

        // A domain collision the service itself hits (not the FormRequest,
        // which would reject it before ever reaching the service) —
        // simulates a failure after the tenant row + physical DB already
        // exist, exercising the actual rollback path.
        $other = Tenant::create(['id' => 'other-tenant', 'status' => 'ACTIVE']);
        $other->domains()->create(['domain' => 'taken.isolation-test']);

        try {
            app(TenantProvisioningService::class)->provision([
                'id' => 'failing-tenant',
                'name' => 'Failing Tenant',
                'domain' => 'taken.isolation-test', // already used by $other
                'admin' => ['first_name' => 'X', 'email' => 'x@failing-tenant.test'],
            ]);
            $this->fail('Expected provisioning to throw.');
        } catch (ApiException $e) {
            $this->assertSame('PROVISIONING_FAILED', $e->errorCode);
        }

        $tenant = Tenant::find('failing-tenant');
        $this->assertNotNull($tenant, 'the tenant row must survive a failure so its job stays inspectable');
        $this->assertSame('SUSPENDED', $tenant->status);

        $job = TenantProvisioningJob::where('tenant_id', 'failing-tenant')->latest('id')->first();
        $this->assertNotNull($job);
        $this->assertSame('FAILED', $job->status);
        $this->assertNotNull($job->error_message);

        DB::purge('tenant');
        $this->assertFalse($tenant->database()->manager()->databaseExists($tenant->database()->getName()));
    }

    public function test_retry_provisioning_recovers_a_failed_tenant_without_duplicating_the_admin(): void
    {
        Mail::fake();

        $other = Tenant::create(['id' => 'other-tenant-2', 'status' => 'ACTIVE']);
        $other->domains()->create(['domain' => 'taken2.isolation-test']);

        try {
            app(TenantProvisioningService::class)->provision([
                'id' => 'retry-tenant',
                'name' => 'Retry Tenant',
                'domain' => 'taken2.isolation-test',
                'admin' => ['first_name' => 'Budi', 'email' => 'budi@retry-tenant.test'],
            ]);
        } catch (ApiException) {
            // expected — see the failure test above
        }

        // Fix the collision, then retry against the same tenant row.
        $other->delete();

        $this->loginAsPlatformAdmin();
        $this->postJson('/api/platform/tenants/retry-tenant/retry-provisioning')
            ->assertOk()
            ->assertJsonPath('data.status', 'ACTIVE');

        $tenant = Tenant::find('retry-tenant');
        $this->assertTrue($tenant->domains()->where('domain', 'taken2.isolation-test')->exists());

        $tenant->run(function () {
            $this->assertSame(1, User::where('email', 'budi@retry-tenant.test')->count());
        });
    }
}
