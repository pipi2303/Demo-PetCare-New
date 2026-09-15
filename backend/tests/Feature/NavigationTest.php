<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Feature;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantFeature;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 8 acceptance test: GET /api/navigation (§8.4) — the union of
 * feature-gating and permission-gating that makes the menu dynamic.
 */
class NavigationTest extends TestCase
{
    private Tenant $tenant;

    private string $central;

    protected function setUp(): void
    {
        parent::setUp();

        $this->central = config('tenancy.database.central_connection');

        $this->tenant = Tenant::create(['id' => 'test-nav-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'nav.isolation-test']);

        $this->tenant->run(function () {
            User::create([
                'username' => 'plain.user',
                'email' => 'plain@nav-test.test',
                'password' => 'Secret123!',
                'first_name' => 'Plain',
                'status' => 'ACTIVE',
            ]);
        });
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        TenantFeature::on($this->central)->where('tenant_id', 'test-nav-tenant')->delete();
        Feature::on($this->central)->where('code', 'PATIENT_MANAGEMENT')->delete();

        parent::tearDown();
    }

    private function loginAsPlainUser(): void
    {
        $this->postJson('http://nav.isolation-test/api/auth/login', [
            'identifier' => 'plain.user',
            'password' => 'Secret123!',
        ])->assertOk();
    }

    public function test_a_user_with_no_permissions_and_no_enabled_features_sees_only_dashboard(): void
    {
        $this->loginAsPlainUser();

        $response = $this->getJson('http://nav.isolation-test/api/navigation')->assertOk();

        $this->assertSame(['DASHBOARD'], collect($response->json('items'))->pluck('code')->all());
    }

    public function test_enabling_a_feature_adds_its_menu_item(): void
    {
        $feature = Feature::on($this->central)->create(['code' => 'PATIENT_MANAGEMENT', 'name' => 'Patient Management']);
        TenantFeature::on($this->central)->create([
            'tenant_id' => $this->tenant->id, 'feature_id' => $feature->id, 'enabled' => true,
        ]);

        $this->loginAsPlainUser();

        $response = $this->getJson('http://nav.isolation-test/api/navigation')->assertOk();
        $codes = collect($response->json('items'))->pluck('code');

        $this->assertTrue($codes->contains('PATIENT_MANAGEMENT'));
    }

    public function test_granting_a_permission_adds_its_menu_item(): void
    {
        $this->tenant->run(function () {
            $user = User::where('username', 'plain.user')->first();
            $user->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());
        });

        $this->loginAsPlainUser();

        $response = $this->getJson('http://nav.isolation-test/api/navigation')->assertOk();
        $codes = collect($response->json('items'))->pluck('code');

        $this->assertTrue($codes->contains('USER_MANAGEMENT'));
        $this->assertTrue($codes->contains('ROLE_MANAGEMENT'));
    }

    public function test_a_feature_enabled_for_a_different_tenant_does_not_leak_in(): void
    {
        $other = Tenant::on($this->central)->create(['id' => 'other-nav-tenant', 'status' => 'ACTIVE']);
        $feature = Feature::on($this->central)->create(['code' => 'PATIENT_MANAGEMENT', 'name' => 'Patient Management']);
        TenantFeature::on($this->central)->create(['tenant_id' => $other->id, 'feature_id' => $feature->id, 'enabled' => true]);

        $this->loginAsPlainUser();

        $response = $this->getJson('http://nav.isolation-test/api/navigation')->assertOk();
        $codes = collect($response->json('items'))->pluck('code');

        $this->assertFalse($codes->contains('PATIENT_MANAGEMENT'));

        $other->delete();
    }
}
