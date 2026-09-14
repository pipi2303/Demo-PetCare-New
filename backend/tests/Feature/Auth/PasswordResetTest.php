<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Mail\PasswordResetMail;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    public function test_tenant_user_can_request_and_confirm_a_password_reset(): void
    {
        Mail::fake();

        $tenant = Tenant::create(['id' => 'test-reset-tenant', 'status' => 'ACTIVE']);
        $tenant->domains()->create(['domain' => 'reset.isolation-test']);

        $tenant->run(function () {
            User::create([
                'username' => 'budi.santoso',
                'email' => 'budi@reset-test.test',
                'password' => 'OldPassword1!',
                'first_name' => 'Budi',
                'status' => 'ACTIVE',
            ]);
        });

        $this->postJson('http://reset.isolation-test/api/auth/password-reset/request', [
            'email' => 'budi@reset-test.test',
        ])->assertOk();

        Mail::assertSent(PasswordResetMail::class);

        $token = null;
        Mail::assertSent(PasswordResetMail::class, function (PasswordResetMail $mail) use (&$token) {
            $token = $mail->token;

            return true;
        });

        $this->postJson('http://reset.isolation-test/api/auth/password-reset/confirm', [
            'email' => 'budi@reset-test.test',
            'token' => $token,
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertOk();

        // Old password no longer works, new one does.
        $this->postJson('http://reset.isolation-test/api/auth/login', [
            'identifier' => 'budi.santoso', 'password' => 'OldPassword1!',
        ])->assertStatus(401);

        $this->postJson('http://reset.isolation-test/api/auth/login', [
            'identifier' => 'budi.santoso', 'password' => 'NewPassword1!',
        ])->assertOk();

        DB::purge('tenant');
        $tenant->delete();
    }

    public function test_reset_request_for_an_unknown_email_still_returns_a_generic_success(): void
    {
        Mail::fake();

        $tenant = Tenant::create(['id' => 'test-reset-unknown', 'status' => 'ACTIVE']);
        $tenant->domains()->create(['domain' => 'reset-unknown.isolation-test']);

        $this->postJson('http://reset-unknown.isolation-test/api/auth/password-reset/request', [
            'email' => 'nobody@reset-test.test',
        ])->assertOk();

        Mail::assertNothingSent();

        DB::purge('tenant');
        $tenant->delete();
    }

    public function test_an_invalid_token_is_rejected(): void
    {
        $tenant = Tenant::create(['id' => 'test-reset-badtoken', 'status' => 'ACTIVE']);
        $tenant->domains()->create(['domain' => 'reset-badtoken.isolation-test']);

        $tenant->run(function () {
            User::create([
                'username' => 'budi.santoso',
                'email' => 'budi@reset-test.test',
                'password' => 'OldPassword1!',
                'first_name' => 'Budi',
                'status' => 'ACTIVE',
            ]);
        });

        $this->postJson('http://reset-badtoken.isolation-test/api/auth/password-reset/confirm', [
            'email' => 'budi@reset-test.test',
            'token' => 'not-a-real-token',
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertStatus(422)->assertJsonPath('error.code', 'INVALID_TOKEN');

        DB::purge('tenant');
        $tenant->delete();
    }
}
