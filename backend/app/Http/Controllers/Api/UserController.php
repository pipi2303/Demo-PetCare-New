<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\SyncUserScopesRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\InvitationService;
use App\Services\Auth\LastAdminGuard;
use App\Services\Auth\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct(
        private LastAdminGuard $lastAdminGuard,
        private InvitationService $invitations,
        private PasswordResetService $passwordReset,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with('profile');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($departmentId = $request->query('department_id')) {
            $query->whereHas('profile', fn ($q) => $q->where('department_id', $departmentId));
        }

        if ($branchId = $request->query('branch_id')) {
            $query->whereHas('profile', fn ($q) => $q->where('branch_id', $branchId));
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    /**
     * §9.5 detail: profile, roles, effective permissions, session count,
     * recent activity.
     */
    public function show(User $user): JsonResponse
    {
        $user->load(['profile', 'roles']);

        return response()->json(['success' => true, 'data' => [
            'user' => $user,
            'permissions' => $user->permissionCodes(),
            'sessions_count' => DB::table('sessions')->where('user_id', $user->id)->count(),
            'recent_activity' => AuditLog::where('target_user_id', $user->id)->latest('id')->limit(10)->get(),
        ]]);
    }

    public function store(CreateUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'] ?? null,
            'username' => $validated['username'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'status' => 'INVITED',
        ]);

        $user->profile()->create([
            'employee_number' => $validated['employee_number'] ?? null,
            'job_title' => $validated['job_title'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'branch_id' => $validated['branch_id'] ?? null,
        ]);

        if (! empty($validated['roles'])) {
            $user->roles()->sync(Role::whereIn('code', $validated['roles'])->pluck('id'));
        }

        $this->audit('USER_CREATED', $user);

        return response()->json(['success' => true, 'data' => $user->fresh(['profile', 'roles'])], 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $validated = collect($request->validated());

        $user->update($validated->only(['first_name', 'last_name', 'username', 'email', 'phone'])->all());

        $profileFields = $validated->only(['employee_number', 'job_title', 'department_id', 'branch_id']);

        if ($profileFields->isNotEmpty()) {
            $user->profile()->updateOrCreate([], $profileFields->all());
        }

        $this->audit('USER_UPDATED', $user);

        return response()->json(['success' => true, 'data' => $user->fresh(['profile', 'roles'])]);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->lastAdminGuard->assertNotSoleAdmin($user);

        $user->delete();

        $this->audit('USER_DELETED', $user);

        return response()->json(['success' => true]);
    }

    /**
     * §9.3/§9.4. Both invite() and resendInvite() do the same thing (a
     * fresh token, a new email) — the doc lists them as separate actions,
     * but neither invalidates a token from the other, so there's no
     * meaningful behavioral difference to encode.
     */
    public function invite(User $user): JsonResponse
    {
        $this->assertInvitable($user);

        $this->invitations->invite($user, Auth::guard('web')->user());

        return response()->json(['success' => true]);
    }

    public function resendInvite(User $user): JsonResponse
    {
        return $this->invite($user);
    }

    public function activate(User $user): JsonResponse
    {
        $user->update(['status' => 'ACTIVE']);
        $this->audit('USER_ACTIVATED', $user);

        return response()->json(['success' => true, 'data' => $user->fresh()]);
    }

    public function suspend(User $user): JsonResponse
    {
        $this->lastAdminGuard->assertNotSoleAdmin($user);

        $user->update(['status' => 'SUSPENDED']);
        $this->audit('USER_SUSPENDED', $user);

        return response()->json(['success' => true, 'data' => $user->fresh()]);
    }

    public function deactivate(User $user): JsonResponse
    {
        $this->lastAdminGuard->assertNotSoleAdmin($user);

        $user->update(['status' => 'DEACTIVATED']);
        $this->audit('USER_DEACTIVATED', $user);

        return response()->json(['success' => true, 'data' => $user->fresh()]);
    }

    /**
     * §5.4 — admin override of Phase 5's account lockout.
     */
    public function unlock(User $user): JsonResponse
    {
        $user->forceFill(['locked_at' => null, 'failed_login_attempts' => 0])->save();
        $this->audit('USER_UNLOCKED', $user);

        return response()->json(['success' => true, 'data' => $user->fresh()]);
    }

    /**
     * §15 — an admin never sets a password directly; this triggers the
     * same secure reset flow Phase 5 built for self-service.
     */
    public function resetPassword(User $user): JsonResponse
    {
        $this->passwordReset->requestReset('web', $user->email);
        $this->audit('PASSWORD_RESET_REQUESTED', $user);

        return response()->json(['success' => true, 'message' => 'Password reset email sent.']);
    }

    /**
     * §9.8 — full replace of a user's access scopes.
     */
    public function syncScopes(SyncUserScopesRequest $request, User $user): JsonResponse
    {
        $user->accessScopes()->delete();

        foreach ($request->validated('scopes') as $scope) {
            $user->accessScopes()->create($scope);
        }

        return response()->json(['success' => true, 'data' => $user->fresh('accessScopes')]);
    }

    private function assertInvitable(User $user): void
    {
        if ($user->status !== 'INVITED') {
            throw new ApiException('VALIDATION_ERROR', 'Only a user with INVITED status can be sent an invitation.', 422);
        }
    }

    private function audit(string $event, User $user): void
    {
        AuditLog::create([
            'event' => $event,
            'actor_user_id' => Auth::guard('web')->id(),
            'target_user_id' => $user->id,
        ]);
    }
}
