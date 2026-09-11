<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Feature;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantFeature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 2 acceptance test for the central (platform) catalog schema:
 * plans, features, and a tenant's actual enabled features (§8.2 — feature
 * "tenant has the module" is distinct from permission "user may act").
 *
 * Safe to use RefreshDatabase here: unlike the tenant-isolation tests, none
 * of this touches CREATE DATABASE, so wrapping the central connection in a
 * transaction is not a problem.
 */
class PlatformCatalogSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_plan_bundles_default_features(): void
    {
        $plan = Plan::create(['code' => 'PRO', 'name' => 'Pro Plan']);
        $pharmacy = Feature::create(['code' => 'PHARMACY', 'name' => 'Pharmacy']);
        $billing = Feature::create(['code' => 'BILLING', 'name' => 'Billing']);

        $plan->features()->attach([$pharmacy->id, $billing->id]);

        $this->assertCount(2, $plan->fresh()->features);
        $this->assertTrue($plan->features->contains('code', 'PHARMACY'));
    }

    public function test_a_tenants_enabled_features_can_diverge_from_its_plan(): void
    {
        // Insert the row directly (bypassing Eloquent's create()) so the
        // TenantCreated event — and its CreateDatabase job — never fires;
        // this test only needs the central `tenants` row to hang
        // `tenant_features` off of, not a real physical tenant database.
        DB::table('tenants')->insert(['id' => 'catalog-test-tenant', 'data' => '{}', 'created_at' => now(), 'updated_at' => now()]);
        $tenant = Tenant::find('catalog-test-tenant');

        $pharmacy = Feature::create(['code' => 'PHARMACY', 'name' => 'Pharmacy']);
        $laboratory = Feature::create(['code' => 'LABORATORY', 'name' => 'Laboratory']);

        TenantFeature::create(['tenant_id' => $tenant->id, 'feature_id' => $pharmacy->id, 'enabled' => true]);
        TenantFeature::create(['tenant_id' => $tenant->id, 'feature_id' => $laboratory->id, 'enabled' => false]);

        $enabled = $tenant->tenantFeatures()->where('enabled', true)->with('feature')->get()->pluck('feature.code');

        $this->assertTrue($enabled->contains('PHARMACY'));
        $this->assertFalse($enabled->contains('LABORATORY'));
    }
}
