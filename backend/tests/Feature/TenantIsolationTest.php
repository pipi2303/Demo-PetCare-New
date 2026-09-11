<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 1 acceptance test: proves the database-per-tenant architecture
 * actually isolates data, not just tenant metadata (Master Prompt §1.2, §25).
 *
 * Deliberately does NOT use RefreshDatabase: that trait wraps the central
 * connection in a transaction, and Postgres rejects CREATE DATABASE inside
 * a transaction block — which is exactly what tenant provisioning issues on
 * that same connection. Central-DB rows are cleaned up manually in
 * tearDown() instead (tenant deletion cascades to its domain row and drops
 * its physical database via stancl/tenancy's DeleteDatabase job).
 */
class TenantIsolationTest extends TestCase
{
    private Tenant $tenantA;

    private Tenant $tenantB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create(['id' => 'test-tenant-a']);
        $this->tenantA->domains()->create(['domain' => 'tenant-a.isolation-test']);

        $this->tenantB = Tenant::create(['id' => 'test-tenant-b']);
        $this->tenantB->domains()->create(['domain' => 'tenant-b.isolation-test']);

        $this->tenantA->run(function (): void {
            DB::table('users')->insert([
                'username' => 'budi.santoso',
                'first_name' => 'Budi (Tenant A)',
                'email' => 'budi@tenant-a.test',
                'password' => bcrypt('secret'),
                'status' => 'ACTIVE',
            ]);
        });

        $this->tenantB->run(function (): void {
            DB::table('users')->insert([
                'username' => 'sari.wulandari',
                'first_name' => 'Sari (Tenant B)',
                'email' => 'sari@tenant-b.test',
                'password' => bcrypt('secret'),
                'status' => 'ACTIVE',
            ]);
        });
    }

    protected function tearDown(): void
    {
        // The tenant HTTP requests above leave a live PDO connection cached
        // on the dynamic "tenant" connection name; Postgres refuses to DROP
        // DATABASE while a session is still attached to it, so purge first.
        DB::purge('tenant');

        $this->tenantA->delete();
        $this->tenantB->delete();

        parent::tearDown();
    }

    public function test_each_tenant_domain_resolves_to_its_own_database(): void
    {
        $this->get('http://tenant-a.isolation-test/api/tenant/ping')
            ->assertOk()
            ->assertJson([
                'tenant_id' => 'test-tenant-a',
                'database' => 'tenant_test-tenant-a',
            ]);

        $this->get('http://tenant-b.isolation-test/api/tenant/ping')
            ->assertOk()
            ->assertJson([
                'tenant_id' => 'test-tenant-b',
                'database' => 'tenant_test-tenant-b',
            ]);
    }

    public function test_tenant_a_cannot_read_tenant_bs_data(): void
    {
        $this->get('http://tenant-a.isolation-test/api/tenant/_debug/users')
            ->assertOk()
            ->assertJsonCount(1, 'users')
            ->assertJsonFragment(['email' => 'budi@tenant-a.test'])
            ->assertJsonMissing(['email' => 'sari@tenant-b.test']);
    }

    public function test_tenant_b_cannot_read_tenant_as_data(): void
    {
        $this->get('http://tenant-b.isolation-test/api/tenant/_debug/users')
            ->assertOk()
            ->assertJsonCount(1, 'users')
            ->assertJsonFragment(['email' => 'sari@tenant-b.test'])
            ->assertJsonMissing(['email' => 'budi@tenant-a.test']);
    }

    public function test_central_domain_is_blocked_from_tenant_routes(): void
    {
        $this->get('http://localhost/api/tenant/ping')->assertNotFound();
    }

    public function test_unregistered_domain_cannot_resolve_a_tenant(): void
    {
        $response = $this->get('http://unregistered.isolation-test/api/tenant/ping');

        $response->assertNotFound();
        $response->assertJson([
            'success' => false,
            'error' => ['code' => 'TENANT_NOT_FOUND'],
        ]);
    }
}
