<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Models\Feature;
use App\Models\TenantFeature;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Feature Guard (§7.4, §8.2 — a tenant having a module is distinct from a
 * user having a permission within it). Route usage:
 * ->middleware('feature:PATIENT_MANAGEMENT').
 *
 * tenant_features/features live in the *central* database (Phase 2), but
 * this middleware runs on tenant-context routes where the default
 * connection is the tenant's own — so both queries are pinned explicitly
 * to the central connection rather than relying on the default.
 */
class EnsureFeatureEnabled
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $featureCode): Response
    {
        $central = config('tenancy.database.central_connection');

        $feature = Feature::on($central)->where('code', $featureCode)->first();

        $enabled = $feature && TenantFeature::on($central)
            ->where('tenant_id', tenant('id'))
            ->where('feature_id', $feature->id)
            ->where('enabled', true)
            ->exists();

        if (! $enabled) {
            throw new ApiException('FEATURE_DISABLED', "The [{$featureCode}] feature is not enabled for this tenant.", 403);
        }

        return $next($request);
    }
}
