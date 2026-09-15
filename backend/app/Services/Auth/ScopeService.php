<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Scope Guard (§7.4, §9.8). Infrastructure only for this phase — no HTTP
 * resource exists yet to protect with it (that lands with Phase 9+'s
 * actual business endpoints); covered here by a direct unit test instead
 * of a live route.
 *
 * A user can hold several scope rows (e.g. BRANCH scope for two branches).
 * `applyScope()` restricts a query to the union of everything the user's
 * scopes allow — except TENANT scope, which means unrestricted and skips
 * filtering entirely.
 */
class ScopeService
{
    public function for(User $user)
    {
        return $user->accessScopes()->get();
    }

    /**
     * Secure-by-default: a user with no recorded scope rows gets a query
     * that matches nothing, not one that's left unrestricted. Callers that
     * want a role (e.g. TENANT_ADMIN) to bypass scoping entirely should
     * check that before calling this, not rely on an empty-scope fallthrough.
     */
    public function applyScope(
        Builder $query,
        User $user,
        string $branchColumn = 'branch_id',
        string $departmentColumn = 'department_id',
        ?string $ownerColumn = null,
    ): Builder {
        $scopes = $this->for($user);

        if ($scopes->isEmpty()) {
            return $query->whereRaw('1 = 0');
        }

        if ($scopes->contains('scope_type', 'TENANT')) {
            return $query;
        }

        $branchIds = $scopes->where('scope_type', 'BRANCH')->pluck('branch_id')->filter()->all();
        $departmentIds = $scopes->where('scope_type', 'DEPARTMENT')->pluck('department_id')->filter()->all();
        $hasOwnScope = $ownerColumn && $scopes->contains('scope_type', 'OWN');

        return $query->where(function (Builder $q) use ($branchColumn, $branchIds, $departmentColumn, $departmentIds, $ownerColumn, $hasOwnScope, $user) {
            $q->whereRaw('1 = 0'); // base false; each applicable scope OR-extends it

            if (! empty($branchIds)) {
                $q->orWhereIn($branchColumn, $branchIds);
            }

            if (! empty($departmentIds)) {
                $q->orWhereIn($departmentColumn, $departmentIds);
            }

            if ($hasOwnScope) {
                $q->orWhere($ownerColumn, $user->id);
            }
        });
    }
}
