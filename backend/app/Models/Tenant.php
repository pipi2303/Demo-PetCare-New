<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

/**
 * Platform-level tenant record. Custom columns beyond the base package's
 * `id`/`data` are added via migrations against the `tenants` table
 * (see Phase 2 for the full platform schema: plan, status, etc.).
 */
class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase;
    use HasDomains;

    /**
     * Real columns on the `tenants` table, as opposed to virtual attributes
     * the package would otherwise fold into the `data` JSON blob (its
     * default here is just `['id']`). `status` is a genuine migrated
     * column (Phase 5) and must stay queryable/settable directly — leaving
     * it out of this list would silently store it in `data` instead, where
     * a plain `WHERE status = ...` query would never see it.
     *
     * @return list<string>
     */
    public static function getCustomColumns(): array
    {
        return ['id', 'status'];
    }

    public function tenantPlans(): HasMany
    {
        return $this->hasMany(TenantPlan::class);
    }

    public function tenantFeatures(): HasMany
    {
        return $this->hasMany(TenantFeature::class);
    }

    public function provisioningJobs(): HasMany
    {
        return $this->hasMany(TenantProvisioningJob::class);
    }
}
