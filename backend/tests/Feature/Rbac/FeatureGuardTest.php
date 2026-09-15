<?php

declare(strict_types=1);

namespace Tests\Feature\Rbac;

use App\Models\Feature;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantFeature;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 7 acceptance test: Feature Guard (§7.4, §8.2) — a tenant either
 * has a module enabled or it doesn't, independent of any user permission.
 */
class FeatureGuardTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-feature-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'feature.isolation-test']);

        $this->tenant->run(function () {
            $user = User::create([
                'username' => 'any.user',
                'email' => 'any@feature-test.test',
                'password' => 'Secret123!',
                'first_name' => 'Any',
                'status' => 'ACTIVE',
            ]);
            $user->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());
        });

        $this->postJson('http://feature.isolation-test/api/auth/login', [
            'identifier' => 'any.user',
            'password' => 'Secret123!',
        ])->assertOk();
    }

    protected function tearDown(): void
    {
        $central = config('tenancy.database.central_connection');
        TenantFeature::on($central)->where('feature_id', function ($q) {
            $q->select('id')->from('features')->where('code', 'DEBUG_FEATURE');
        })->delete();
        Feature::on($central)->where('code', 'DEBUG_FEATURE')->delete();

        DB::purge('tenant');
        $this->tenant->delete();

        // Defensive: if the test body threw before reaching its own
        // $other->delete() call, don't leave a second tenant behind.
        Tenant::on($central)->find('other-feature-tenant')?->delete();

        parent::tearDown();
    }

    /**
     * The login request in setUp() leaves the default connection pointed
     * at 'tenant' (nothing in the request lifecycle reverts it within a
     * single test process — see TenantIsolationTest) — features/
     * tenant_features are central tables, so these calls must pin the
     * connection explicitly, exactly like EnsureFeatureEnabled itself does.
     */
    private function createDebugFeature(): Feature
    {
        $central = config('tenancy.database.central_connection');

        return Feature::on($central)->create(['code' => 'DEBUG_FEATURE', 'name' => 'Debug Feature']);
    }

    public function test_route_is_blocked_when_the_feature_is_not_enabled_for_the_tenant(): void
    {
        // No Feature/TenantFeature row exists at all yet.
        $this->getJson('http://feature.isolation-test/api/tenant/_debug/feature-check')
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FEATURE_DISABLED');
    }

    public function test_route_is_blocked_when_the_feature_exists_but_is_disabled_for_this_tenant(): void
    {
        $central = config('tenancy.database.central_connection');
        $feature = $this->createDebugFeature();
        TenantFeature::on($central)->create(['tenant_id' => $this->tenant->id, 'feature_id' => $feature->id, 'enabled' => false]);

        $this->getJson('http://feature.isolation-test/api/tenant/_debug/feature-check')
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FEATURE_DISABLED');
    }

    public function test_route_is_allowed_when_the_feature_is_enabled_for_this_tenant(): void
    {
        $central = config('tenancy.database.central_connection');
        $feature = $this->createDebugFeature();
        TenantFeature::on($central)->create(['tenant_id' => $this->tenant->id, 'feature_id' => $feature->id, 'enabled' => true]);

        $this->getJson('http://feature.isolation-test/api/tenant/_debug/feature-check')->assertOk();
    }

    public function test_enabling_the_feature_for_another_tenant_does_not_enable_it_here(): void
    {
        $central = config('tenancy.database.central_connection');
        $other = Tenant::on($central)->create(['id' => 'other-feature-tenant', 'status' => 'ACTIVE']);

        $feature = $this->createDebugFeature();
        TenantFeature::on($central)->create(['tenant_id' => $other->id, 'feature_id' => $feature->id, 'enabled' => true]);

        $this->getJson('http://feature.isolation-test/api/tenant/_debug/feature-check')
            ->assertStatus(403);

        $other->delete();
    }
}
