<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SyncUserRolesRequest;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\LastAdminGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class UserRoleController extends Controller
{
    public function __construct(private LastAdminGuard $lastAdminGuard) {}

    /**
     * Full replace, via sync.
     */
    public function sync(SyncUserRolesRequest $request, User $user): JsonResponse
    {
        $newCodes = $request->validated('roles');
        $currentCodes = $user->roles()->pluck('code')->all();

        // Last Tenant Admin protection (§16): reject before applying
        // anything if this sync would leave zero TENANT_ADMIN-role users.
        $losingTenantAdmin = in_array('TENANT_ADMIN', $currentCodes, true)
            && ! in_array('TENANT_ADMIN', $newCodes, true);

        if ($losingTenantAdmin) {
            $this->lastAdminGuard->assertNotSoleAdmin($user);
        }

        $newRoleIds = Role::whereIn('code', $newCodes)->pluck('id');
        $user->roles()->sync($newRoleIds);

        $actorId = Auth::guard('web')->id();

        foreach (array_diff($newCodes, $currentCodes) as $code) {
            AuditLog::create([
                'event' => 'ROLE_ASSIGNED',
                'actor_user_id' => $actorId,
                'target_user_id' => $user->id,
                'metadata' => ['role' => $code],
            ]);
        }

        foreach (array_diff($currentCodes, $newCodes) as $code) {
            AuditLog::create([
                'event' => 'ROLE_REMOVED',
                'actor_user_id' => $actorId,
                'target_user_id' => $user->id,
                'metadata' => ['role' => $code],
            ]);
        }

        return response()->json(['success' => true, 'data' => $user->fresh('roles')]);
    }
}
