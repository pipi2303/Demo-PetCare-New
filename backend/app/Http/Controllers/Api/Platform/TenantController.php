<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\CreateTenantRequest;
use App\Http\Requests\Platform\UpdateTenantRequest;
use App\Models\PlatformAuditLog;
use App\Models\Tenant;
use App\Services\Tenant\TenantProvisioningService;
use Illuminate\Http\JsonResponse;

/**
 * Granular permission checks (Phase 7) aren't wired in yet — these routes
 * are gated only by `auth:platform` (any logged-in platform user) for now.
 */
class TenantController extends Controller
{
    public function __construct(private TenantProvisioningService $provisioning) {}

    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Tenant::all()]);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $tenant]);
    }

    public function store(CreateTenantRequest $request): JsonResponse
    {
        $tenant = $this->provisioning->provision($request->validated());

        return response()->json(['success' => true, 'data' => $tenant], 201);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant): JsonResponse
    {
        $tenant->update(['name' => $request->validated('name')]);

        PlatformAuditLog::create([
            'event' => 'TENANT_UPDATED',
            'target_type' => 'Tenant',
            'target_id' => $tenant->id,
        ]);

        return response()->json(['success' => true, 'data' => $tenant->fresh()]);
    }

    public function activate(Tenant $tenant): JsonResponse
    {
        $tenant->update(['status' => 'ACTIVE']);

        PlatformAuditLog::create([
            'event' => 'TENANT_UPDATED',
            'target_type' => 'Tenant',
            'target_id' => $tenant->id,
            'metadata' => ['status' => 'ACTIVE'],
        ]);

        return response()->json(['success' => true, 'data' => $tenant->fresh()]);
    }

    public function suspend(Tenant $tenant): JsonResponse
    {
        $tenant->update(['status' => 'SUSPENDED']);

        PlatformAuditLog::create([
            'event' => 'TENANT_SUSPENDED',
            'target_type' => 'Tenant',
            'target_id' => $tenant->id,
        ]);

        return response()->json(['success' => true, 'data' => $tenant->fresh()]);
    }

    public function retryProvisioning(Tenant $tenant): JsonResponse
    {
        // TenantProvisioningService::retry() itself guards against
        // retrying an already-ACTIVE tenant.
        $tenant = $this->provisioning->retry($tenant);

        return response()->json(['success' => true, 'data' => $tenant]);
    }
}
