<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Exceptions\ApiException;
use App\Models\User;

/**
 * Last Tenant Admin protection (§16). Shared by every action that could
 * strip a user's TENANT_ADMIN authority — Phase 7's role sync and Phase
 * 9's destroy/suspend/deactivate — so the "is this really the last one"
 * check exists in exactly one place.
 */
class LastAdminGuard
{
    public function assertNotSoleAdmin(User $user): void
    {
        if ($this->isSoleAdmin($user)) {
            throw new ApiException(
                'LAST_ADMIN_PROTECTED',
                'Tenant must have at least one active administrator.',
                422,
            );
        }
    }

    public function isSoleAdmin(User $user): bool
    {
        if (! $user->roles()->where('code', 'TENANT_ADMIN')->exists()) {
            return false;
        }

        return User::whereHas('roles', fn ($q) => $q->where('code', 'TENANT_ADMIN'))
            ->where('id', '!=', $user->id)
            ->doesntExist();
    }
}
