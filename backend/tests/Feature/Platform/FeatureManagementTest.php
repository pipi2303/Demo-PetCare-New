<?php

declare(strict_types=1);

namespace Tests\Feature\Platform;

use App\Models\Feature;
use App\Models\PlatformAuditLog;
use App\Models\PlatformUser;
use App\Models\Tenant;
use App\Models\TenantFeature;
use App\Models\TenantProvisioningJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Phase 8 acceptance test: feature catalog management and its effect on
 * tenant provisioning (Master Prompt §8.1–8.3).
 */
class FeatureManagementTest extends TestCase
{
    private PlatformUser $platformAdmin;

    private string $central;

    protected function setUp(): void
    {
        parent::setUp();

        $this->central = config('tenancy.database.central_connection');

        $this->platformAdmin = PlatformUser::create([
            'username' => 'superadmin',
            'email' => 'admin@feature-mgmt-test.test',
            'password' => 'Secret123!',
            'first_name' => 'Super',
            'status' => 'ACTIVE',
        ]);

        Feature::on($this->central)->create(['code' => 'PATIENT_MANAGEMENT', 'name' => 'Patient Management']);
        Feature::on($this->central)->create(['code' => 'PHARMACY', 'name' => 'Pharmacy']);
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');

        foreach (Tenant::on($this->central)->get() as $tenant) {
            TenantProvisioningJob::on($this->central)->where('tenant_id', $tenant->id)->delete();

            try {
                $tenant->delete();
            } catch (\Throwable) {
                DB::table('tenants')->where('id', $tenant->id)->delete();
            }
        }

        TenantFeature::on($this->central)->delete();
        Feature::on($this->central)->delete();
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

    public function test_platform_admin_can_list_the_feature_catalog(): void
    {
        $this->loginAsPlatformAdmin();

        $this->getJson('/api/platform/features')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_provisioning_a_tenant_with_selected_features_enables_exactly_those(): void
    {
        Mail::fake();
        $this->loginAsPlatformAdmin();

        $this->postJson('/api/platform/tenants', [
            'id' => 'feat-prov-tenant',
            'name' => 'Feature Provisioning Tenant',
            'domain' => 'feat-prov.isolation-test',
            'admin' => ['first_name' => 'Budi', 'email' => 'budi@feat-prov.test'],
            'features' => ['PATIENT_MANAGEMENT'],
        ])->assertCreated();

        $response = $this->getJson('/api/platform/tenants/feat-prov-tenant/features')->assertOk();

        $enabled = collect($response->json('data'))->where('enabled', true)->pluck('code');
        $this->assertSame(['PATIENT_MANAGEMENT'], $enabled->values()->all());
    }

    public function test_syncing_tenant_features_toggles_state_and_audits_each_change(): void
    {
        Mail::fake();
        $this->loginAsPlatformAdmin();

        $this->postJson('/api/platform/tenants', [
            'id' => 'feat-sync-tenant',
            'name' => 'Feature Sync Tenant',
            'domain' => 'feat-sync.isolation-test',
            'admin' => ['first_name' => 'Budi', 'email' => 'budi@feat-sync.test'],
            'features' => ['PATIENT_MANAGEMENT'],
        ])->assertCreated();

        $this->putJson('/api/platform/tenants/feat-sync-tenant/features', [
            'features' => ['PHARMACY'],
        ])->assertOk();

        $response = $this->getJson('/api/platform/tenants/feat-sync-tenant/features')->assertOk();
        $enabled = collect($response->json('data'))->where('enabled', true)->pluck('code');
        $this->assertSame(['PHARMACY'], $enabled->values()->all());

        // Provisioning's $tenant->run(...) calls leave the default
        // connection on 'tenant' for the rest of this process — pin these
        // explicitly, same as everywhere else central tables are queried
        // after a tenant operation.
        $this->assertTrue(PlatformAuditLog::on($this->central)->where('event', 'FEATURE_ENABLED')
            ->where('target_id', 'feat-sync-tenant')->exists());
        $this->assertTrue(PlatformAuditLog::on($this->central)->where('event', 'FEATURE_DISABLED')
            ->where('target_id', 'feat-sync-tenant')->exists());
    }
}
