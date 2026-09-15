<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * This same class is the entry point for both `artisan db:seed`
     * (central DB) and `artisan tenants:seed` (a tenant DB, tenancy already
     * initialized by the time this runs) — so it must branch on which
     * context is active rather than assume tenant-only tables exist.
     */
    public function run(): void
    {
        if (tenancy()->initialized) {
            $this->call(TenantRolesAndPermissionsSeeder::class);

            return;
        }

        // Default platform roles are a DB-level enum, not catalog rows (see
        // the Phase 3/4 plan) — nothing to seed for those. A bootstrap
        // Platform Super Admin account is deferred until it's actually
        // needed by a concrete flow (none yet requires one to exist by
        // default).
        $this->call(PlatformFeatureSeeder::class);
    }
}
