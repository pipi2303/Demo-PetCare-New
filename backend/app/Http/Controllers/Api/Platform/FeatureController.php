<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\SyncTenantFeaturesRequest;
use App\Models\Feature;
use App\Models\PlatformAuditLog;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;

class FeatureController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Feature::all()]);
    }

    public function forTenant(Tenant $tenant): JsonResponse
    {
        $enabledCodes = $tenant->tenantFeatures()->where('enabled', true)->with('feature')->get()
            ->pluck('feature.code');

        $features = Feature::all()->map(fn (Feature $feature) => [
            ...$feature->toArray(),
            'enabled' => $enabledCodes->contains($feature->code),
        ]);

        return response()->json(['success' => true, 'data' => $features]);
    }

    /**
     * Full replace, via sync (same pattern as Phase 7's role/permission
     * syncs) — `features` lists every code that should end up enabled;
     * anything not listed is disabled, not deleted.
     */
    public function syncForTenant(SyncTenantFeaturesRequest $request, Tenant $tenant): JsonResponse
    {
        $newCodes = $request->validated('features');
        $allFeatures = Feature::all()->keyBy('code');

        $currentlyEnabled = $tenant->tenantFeatures()->where('enabled', true)->pluck('feature_id')->all();

        foreach ($allFeatures as $code => $feature) {
            $tenant->tenantFeatures()->updateOrCreate(
                ['feature_id' => $feature->id],
                ['enabled' => in_array($code, $newCodes, true)],
            );
        }

        // toBase(): Eloquent\Collection::only() filters by *primary key*,
        // not by the collection's array keys like Support\Collection::only()
        // does — $allFeatures is keyed by `code`, so the Eloquent version
        // would silently match nothing here.
        $newlyEnabledIds = $allFeatures->toBase()->only($newCodes)->pluck('id')->all();

        foreach (array_diff($newlyEnabledIds, $currentlyEnabled) as $featureId) {
            $this->audit('FEATURE_ENABLED', $tenant, $allFeatures->firstWhere('id', $featureId)->code);
        }

        foreach (array_diff($currentlyEnabled, $newlyEnabledIds) as $featureId) {
            $this->audit('FEATURE_DISABLED', $tenant, $allFeatures->firstWhere('id', $featureId)->code);
        }

        return $this->forTenant($tenant);
    }

    private function audit(string $event, Tenant $tenant, string $featureCode): void
    {
        PlatformAuditLog::create([
            'event' => $event,
            'target_type' => 'Tenant',
            'target_id' => $tenant->id,
            'metadata' => ['feature' => $featureCode],
        ]);
    }
}
