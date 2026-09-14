<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Exceptions\ApiException;
use App\Models\AuditLog;
use App\Models\PlatformAuditLog;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * Shared login/logout logic for every actor type (Master Prompt §2.6, §5) —
 * called by both the tenant and platform auth controllers with their own
 * guard name, so the rules (lockout, rate-limit-adjacent status checks,
 * audit logging) are written once.
 *
 * Deliberate deviation from the doc's literal §2.6 flow diagram: that
 * diagram checks the account lock *after* validating the password. Doing
 * it in that order would let an attacker keep guessing passwords against a
 * locked account — the lock would stop nothing. Lock (and status) are
 * checked before the password here instead, which is what makes a lockout
 * actually work as a brute-force defense.
 */
class AuthenticationService
{
    public function attempt(string $guard, string $identifier, string $password, Request $request): Authenticatable
    {
        $modelClass = $this->modelClass($guard);
        $normalized = mb_strtolower(trim($identifier));

        /** @var Authenticatable|null $user */
        $user = $modelClass::whereRaw('LOWER(username) = ?', [$normalized])->first()
            ?? $modelClass::whereRaw('LOWER(email) = ?', [$normalized])->first();

        if (! $user) {
            // Same generic error as a wrong password — never reveal whether
            // the identifier itself exists (prevents username enumeration).
            $this->recordAudit($guard, 'LOGIN_FAILED', null, ['reason' => 'not_found']);

            throw new ApiException('INVALID_CREDENTIALS', 'Invalid credentials provided.', 401);
        }

        $this->assertNotLocked($guard, $user);
        $this->assertActive($guard, $user);

        if ($guard === 'web') {
            $this->assertTenantActive($guard, $user);
        }

        if (! Hash::check($password, $user->password)) {
            $this->registerFailedAttempt($user);
            $this->recordAudit($guard, 'LOGIN_FAILED', $user, ['reason' => 'invalid_password']);

            throw new ApiException('INVALID_CREDENTIALS', 'Invalid credentials provided.', 401);
        }

        $user->forceFill([
            'failed_login_attempts' => 0,
            'locked_at' => null,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        Auth::guard($guard)->login($user);
        $request->session()->regenerate();

        $this->recordAudit($guard, 'LOGIN_SUCCESS', $user, []);

        return $user;
    }

    public function logout(string $guard, Request $request): void
    {
        $user = Auth::guard($guard)->user();

        Auth::guard($guard)->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($user) {
            $this->recordAudit($guard, 'LOGOUT', $user, []);
        }
    }

    private function assertNotLocked(string $guard, Authenticatable $user): void
    {
        if (! $user->locked_at) {
            return;
        }

        $decayMinutes = config('authentication.lockout.decay_minutes');

        if ($user->locked_at->copy()->addMinutes($decayMinutes)->isPast()) {
            $user->forceFill(['locked_at' => null, 'failed_login_attempts' => 0])->save();

            return;
        }

        $this->recordAudit($guard, 'LOGIN_FAILED', $user, ['reason' => 'locked']);

        throw new ApiException(
            'ACCOUNT_LOCKED',
            'This account is temporarily locked due to too many failed login attempts.',
            423,
        );
    }

    private function assertActive(string $guard, Authenticatable $user): void
    {
        if ($user->status === 'ACTIVE') {
            return;
        }

        $this->recordAudit($guard, 'LOGIN_FAILED', $user, ['reason' => 'inactive_status', 'status' => $user->status]);

        throw new ApiException('USER_INACTIVE', 'This account is not active.', 403);
    }

    private function assertTenantActive(string $guard, Authenticatable $user): void
    {
        $tenant = tenant();

        if (! $tenant || $tenant->status === 'ACTIVE') {
            return;
        }

        $this->recordAudit($guard, 'LOGIN_FAILED', $user, ['reason' => 'tenant_inactive']);

        throw new ApiException('TENANT_INACTIVE', 'This tenant is not currently active.', 403);
    }

    private function registerFailedAttempt(Authenticatable $user): void
    {
        $maxAttempts = config('authentication.lockout.max_attempts');
        $attempts = $user->failed_login_attempts + 1;

        $user->forceFill([
            'failed_login_attempts' => $attempts,
            'locked_at' => $attempts >= $maxAttempts ? now() : null,
        ])->save();
    }

    private function modelClass(string $guard): string
    {
        $provider = config("auth.guards.{$guard}.provider");

        return config("auth.providers.{$provider}.model");
    }

    private function recordAudit(string $guard, string $event, ?Authenticatable $actor, array $metadata): void
    {
        if ($guard === 'platform') {
            PlatformAuditLog::create([
                'event' => $event,
                'actor_platform_user_id' => $actor?->id,
                'metadata' => $metadata,
            ]);

            return;
        }

        AuditLog::create([
            'event' => $event,
            'actor_user_id' => $actor?->id,
            'metadata' => $metadata,
        ]);
    }
}
