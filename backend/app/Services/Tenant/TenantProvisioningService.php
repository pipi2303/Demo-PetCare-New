<?php

declare(strict_types=1);

namespace App\Services\Tenant;

use App\Exceptions\ApiException;
use App\Models\Feature;
use App\Models\PlatformAuditLog;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantFeature;
use App\Models\TenantProvisioningJob;
use App\Models\User;
use App\Services\Auth\InvitationService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Stancl\Tenancy\Jobs\CreateDatabase;
use Stancl\Tenancy\Jobs\MigrateDatabase;
use Stancl\Tenancy\Jobs\SeedDatabase;
use Throwable;

/**
 * Orchestrates Master Prompt §6 / §27's create-tenant pipeline:
 * tenant row -> physical DB (create/migrate/seed, via the existing
 * TenantCreated event pipeline in TenancyServiceProvider) -> domain ->
 * Tenant Admin user -> invitation -> tenant flipped ACTIVE.
 *
 * A tenant starts (and stays, on failure) `SUSPENDED` — login already
 * refuses non-ACTIVE tenants (Phase 5), so a half-provisioned tenant is
 * inert without needing a separate "is this ready" flag. On failure the
 * tenant and job rows are kept (§6.2 — diagnostics must survive); only a
 * possibly-inconsistent physical database is dropped.
 */
class TenantProvisioningService
{
    public function __construct(private InvitationService $invitations) {}

    /**
     * @param  array{id: string, name: string, domain: string, admin: array{first_name: string, last_name?: string, email: string, username?: string}, features?: list<string>}  $data
     */
    public function provision(array $data): Tenant
    {
        $featureCodes = $data['features'] ?? [];

        $tenant = new Tenant([
            'id' => $data['id'],
            'status' => 'SUSPENDED',
            'name' => $data['name'],
            // Persisted so a later retry (see retry()) doesn't need the
            // original request payload again — it just re-reads this.
            'pending_admin' => $data['admin'],
            'pending_domain' => $data['domain'],
            'pending_features' => $featureCodes,
        ]);

        try {
            // Synchronously fires CreateDatabase -> MigrateDatabase ->
            // SeedDatabase via the TenantCreated event pipeline.
            $tenant->save();

            $tenant->domains()->create(['domain' => $data['domain']]);

            $this->enableFeatures($tenant, $featureCodes);
        } catch (Throwable $e) {
            $this->recordFailure($tenant, null, $e);

            throw new ApiException('PROVISIONING_FAILED', 'Tenant provisioning failed: '.$e->getMessage(), 500, $e);
        }

        return $this->finishProvisioning($tenant, $data['admin']);
    }

    public function retry(Tenant $tenant): Tenant
    {
        if ($tenant->status === 'ACTIVE') {
            throw new ApiException('TENANT_ALREADY_ACTIVE', 'This tenant has already been provisioned.', 422);
        }

        $adminData = $tenant->pending_admin;

        if (! $adminData) {
            throw new ApiException('PROVISIONING_FAILED', 'No pending admin data was recorded for this tenant.', 422);
        }

        try {
            if (! $tenant->database()->manager()->databaseExists($tenant->database()->getName())) {
                Bus::dispatchSync(new CreateDatabase($tenant));
            }

            Bus::dispatchSync(new MigrateDatabase($tenant));
            Bus::dispatchSync(new SeedDatabase($tenant));

            if ($tenant->domains()->doesntExist() && $tenant->pending_domain) {
                $tenant->domains()->create(['domain' => $tenant->pending_domain]);
            }

            if ($tenant->tenantFeatures()->doesntExist()) {
                $this->enableFeatures($tenant, $tenant->pending_features ?? []);
            }
        } catch (Throwable $e) {
            $this->recordFailure($tenant, null, $e);

            throw new ApiException('PROVISIONING_FAILED', 'Tenant provisioning retry failed: '.$e->getMessage(), 500, $e);
        }

        return $this->finishProvisioning($tenant, $adminData);
    }

    /**
     * @param  array{first_name: string, last_name?: string, email: string, username?: string}  $adminData
     */
    private function finishProvisioning(Tenant $tenant, array $adminData): Tenant
    {
        $job = TenantProvisioningJob::create([
            'tenant_id' => $tenant->id,
            'status' => 'PROVISIONING',
            'started_at' => now(),
        ]);

        try {
            $admin = $tenant->run(function () use ($adminData) {
                // updateOrCreate, not create: makes a retry safe to run
                // against a tenant whose admin user already exists from a
                // previous partial attempt (§25 "Retry provisioning aman",
                // "Tidak terjadi duplicate tenant").
                $user = User::updateOrCreate(
                    ['email' => mb_strtolower(trim($adminData['email']))],
                    [
                        'username' => $adminData['username']
                            ?? Str::slug($adminData['first_name'].'.'.($adminData['last_name'] ?? ''), '.'),
                        'first_name' => $adminData['first_name'],
                        'last_name' => $adminData['last_name'] ?? null,
                        'status' => $adminData['status'] ?? 'INVITED',
                    ],
                );

                if ($role = Role::where('code', 'TENANT_ADMIN')->first()) {
                    $user->roles()->syncWithoutDetaching([$role->id]);
                }

                return $user;
            });

            if ($admin->status === 'INVITED') {
                $tenant->run(fn () => $this->invitations->invite($admin));
            }

            $tenant->forceFill(['status' => 'ACTIVE'])->save();

            $job->forceFill([
                'status' => 'COMPLETED',
                'completed_at' => now(),
            ])->save();

            PlatformAuditLog::create([
                'event' => 'TENANT_CREATED',
                'target_type' => 'Tenant',
                'target_id' => $tenant->id,
            ]);

            return $tenant->fresh();
        } catch (Throwable $e) {
            $this->recordFailure($tenant, $job, $e);

            throw new ApiException('PROVISIONING_FAILED', 'Tenant provisioning failed: '.$e->getMessage(), 500, $e);
        }
    }

    /**
     * @param  list<string>  $featureCodes
     */
    private function enableFeatures(Tenant $tenant, array $featureCodes): void
    {
        if (empty($featureCodes)) {
            return;
        }

        $featureIds = Feature::whereIn('code', $featureCodes)->pluck('id');

        foreach ($featureIds as $featureId) {
            TenantFeature::create([
                'tenant_id' => $tenant->id,
                'feature_id' => $featureId,
                'enabled' => true,
            ]);
        }
    }

    private function recordFailure(Tenant $tenant, ?TenantProvisioningJob $job, Throwable $e): void
    {
        $job ??= new TenantProvisioningJob([
            'tenant_id' => $tenant->id,
            'started_at' => now(),
        ]);

        $job->forceFill([
            'status' => 'FAILED',
            'error_message' => $e->getMessage(),
            'diagnostics' => [
                'exception' => get_class($e),
                'trace' => collect(explode("\n", $e->getTraceAsString()))->take(5)->all(),
            ],
            'completed_at' => now(),
        ])->save();

        // Cleanup is best-effort and must never mask the original failure
        // being recorded above — a secondary error here (e.g. the tenant
        // connection still being open) is logged, not thrown.
        try {
            // A prior step (e.g. $tenant->run(...) while creating the admin
            // user) may have left a live connection on the tenant DB, and
            // Postgres refuses to DROP DATABASE while one is attached.
            DB::purge('tenant');

            if ($tenant->exists && $tenant->database()->manager()->databaseExists($tenant->database()->getName())) {
                $tenant->database()->manager()->deleteDatabase($tenant);
            }
        } catch (Throwable $cleanupException) {
            report($cleanupException);
        }
    }
}
