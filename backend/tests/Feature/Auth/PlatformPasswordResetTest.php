<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Mail\PasswordResetMail;
use App\Models\PlatformUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Platform-side password reset — separate from PasswordResetTest (tenant)
 * since this one is safe to back with RefreshDatabase (never touches
 * CREATE DATABASE) and PSR-4 requires one class per file either way.
 */
class PlatformPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_can_request_and_confirm_a_password_reset(): void
    {
        Mail::fake();

        PlatformUser::create([
            'username' => 'superadmin',
            'email' => 'admin@platform-test.test',
            'password' => 'OldPassword1!',
            'first_name' => 'Super',
            'status' => 'ACTIVE',
        ]);

        $this->postJson('/api/platform/auth/password-reset/request', [
            'email' => 'admin@platform-test.test',
        ])->assertOk();

        $token = null;
        Mail::assertSent(PasswordResetMail::class, function (PasswordResetMail $mail) use (&$token) {
            $token = $mail->token;

            return true;
        });

        $this->postJson('/api/platform/auth/password-reset/confirm', [
            'email' => 'admin@platform-test.test',
            'token' => $token,
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertOk();

        $this->postJson('/api/platform/auth/login', [
            'identifier' => 'superadmin', 'password' => 'NewPassword1!',
        ])->assertOk();
    }
}
