<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateRoleRequest;
use App\Http\Requests\SyncRolePermissionsRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Role::with('permissions')->get()]);
    }

    public function show(Role $role): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $role->load('permissions')]);
    }

    public function store(CreateRoleRequest $request): JsonResponse
    {
        $role = Role::create($request->validated());

        return response()->json(['success' => true, 'data' => $role], 201);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $role->update($request->validated());

        return response()->json(['success' => true, 'data' => $role->fresh()]);
    }

    public function destroy(Role $role): JsonResponse
    {
        $role->delete();

        return response()->json(['success' => true]);
    }

    public function syncPermissions(SyncRolePermissionsRequest $request, Role $role): JsonResponse
    {
        $ids = Permission::whereIn('code', $request->validated('permissions'))->pluck('id');

        $role->permissions()->sync($ids);

        // Not in the doc's §18 minimum audit list (which doesn't cover role
        // CRUD/permission changes at all) — added since a permission grant
        // is exactly the kind of change an audit trail exists to catch.
        AuditLog::create([
            'event' => 'ROLE_PERMISSIONS_UPDATED',
            'actor_user_id' => Auth::guard('web')->id(),
            'metadata' => ['role' => $role->code, 'permissions' => $request->validated('permissions')],
        ]);

        return response()->json(['success' => true, 'data' => $role->fresh('permissions')]);
    }
}
