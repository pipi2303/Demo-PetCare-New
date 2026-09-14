<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Exceptions\ApiException;
use App\Mail\PasswordResetMail;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Built directly against the (already-hashed-token) reset-token tables
 * rather than Laravel's `Password` broker: the broker's provider/table
 * wiring lives in static `config/auth.php`, which doesn't follow
 * stancl/tenancy's runtime connection switching — and we need custom
 * per-guard table selection either way (tenant vs platform).
 */
class PasswordResetService
{
    public function requestReset(string $guard, string $email): void
    {
        $modelClass = $this->modelClass($guard);
        $normalizedEmail = mb_strtolower(trim($email));

        /** @var Authenticatable|null $user */
        $user = $modelClass::whereRaw('LOWER(email) = ?', [$normalizedEmail])->first();

        // Always behave the same whether or not the email exists — the
        // response must not reveal which is the case.
        if (! $user) {
            return;
        }

        $token = Str::random(64);

        DB::table($this->tokenTable($guard))->updateOrInsert(
            ['email' => $normalizedEmail],
            ['token' => Hash::make($token), 'created_at' => now()],
        );

        Mail::to($user->email)->send(new PasswordResetMail($user, $token, $guard));
    }

    public function confirmReset(string $guard, string $email, string $token, string $newPassword): void
    {
        $normalizedEmail = mb_strtolower(trim($email));
        $table = $this->tokenTable($guard);

        $record = DB::table($table)->where('email', $normalizedEmail)->first();

        if (! $record || ! Hash::check($token, $record->token)) {
            throw new ApiException('INVALID_TOKEN', 'This password reset token is invalid or has expired.', 422);
        }

        $expireMinutes = config('authentication.password_reset.expire_minutes');

        if (Carbon::parse($record->created_at)->addMinutes($expireMinutes)->isPast()) {
            DB::table($table)->where('email', $normalizedEmail)->delete();

            throw new ApiException('INVALID_TOKEN', 'This password reset token is invalid or has expired.', 422);
        }

        $modelClass = $this->modelClass($guard);
        /** @var Authenticatable|null $user */
        $user = $modelClass::whereRaw('LOWER(email) = ?', [$normalizedEmail])->first();

        if (! $user) {
            throw new ApiException('INVALID_TOKEN', 'This password reset token is invalid or has expired.', 422);
        }

        $user->forceFill([
            'password' => $newPassword,
            'password_changed_at' => now(),
            'failed_login_attempts' => 0,
            'locked_at' => null,
        ])->save();

        DB::table($table)->where('email', $normalizedEmail)->delete();
    }

    private function tokenTable(string $guard): string
    {
        return $guard === 'platform' ? 'platform_password_reset_tokens' : 'password_reset_tokens';
    }

    private function modelClass(string $guard): string
    {
        $provider = config("auth.guards.{$guard}.provider");

        return config("auth.providers.{$provider}.model");
    }
}
