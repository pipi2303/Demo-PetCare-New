<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Exceptions\ApiException;
use App\Mail\TenantAdminInvitationMail;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Tenant-only (platform users aren't invited this way — they're created
 * directly). Same secure-token pattern as PasswordResetService: only the
 * token's hash is ever stored.
 */
class InvitationService
{
    public function invite(User $user, ?User $createdBy = null): void
    {
        $token = Str::random(64);

        $invitation = UserInvitation::create([
            'user_id' => $user->id,
            'token_hash' => Hash::make($token),
            'expires_at' => now()->addDays(config('authentication.invitation.expire_days')),
            'created_by' => $createdBy?->id,
        ]);

        AuditLog::create([
            'event' => 'USER_INVITED',
            'actor_user_id' => $createdBy?->id,
            'target_user_id' => $user->id,
        ]);

        Mail::to($user->email)->send(new TenantAdminInvitationMail($user, $token));

        unset($invitation);
    }

    public function accept(string $email, string $token, string $password): User
    {
        $normalizedEmail = mb_strtolower(trim($email));

        /** @var User|null $user */
        $user = User::whereRaw('LOWER(email) = ?', [$normalizedEmail])->first();

        $invitation = $user
            ? UserInvitation::where('user_id', $user->id)->whereNull('accepted_at')->latest('id')->first()
            : null;

        if (! $user || ! $invitation || ! Hash::check($token, $invitation->token_hash)) {
            throw new ApiException('INVALID_TOKEN', 'This invitation is invalid or has expired.', 422);
        }

        if (Carbon::parse($invitation->expires_at)->isPast()) {
            throw new ApiException('INVALID_TOKEN', 'This invitation is invalid or has expired.', 422);
        }

        $user->forceFill([
            'password' => $password,
            'password_changed_at' => now(),
            'status' => 'ACTIVE',
        ])->save();

        $invitation->forceFill(['accepted_at' => now()])->save();

        AuditLog::create([
            'event' => 'INVITATION_ACCEPTED',
            'target_user_id' => $user->id,
        ]);

        return $user;
    }
}
