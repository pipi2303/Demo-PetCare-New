<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\PlatformAuditLog;
use App\Models\PlatformUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 5 acceptance test: Platform Admin login. Mirrors TenantLoginTest's
 * coverage at a lighter weight — the underlying rules are proven there;
 * this confirms the `platform` guard wiring actually works end to end.
 *
 * Safe to use RefreshDatabase: unlike tenant login, none of this touches
 * CREATE DATABASE.
 */
class PlatformLoginTest extends TestCase
{
    use RefreshDatabase;

    private function makePlatformUser(array $overrides = []): PlatformUser
    {
        return PlatformUser::create(array_merge([
            'username' => 'superadmin',
            'email' => 'admin@platform-test.test',
            'password' => 'Secret123!',
            'first_name' => 'Super',
            'status' => 'ACTIVE',
        ], $overrides));
    }

    public function test_platform_admin_can_login_with_username_or_email(): void
    {
        $this->makePlatformUser();

        $this->postJson('/api/platform/auth/login', [
            'identifier' => 'superadmin',
            'password' => 'Secret123!',
        ])->assertOk()->assertJsonPath('data.user.username', 'superadmin');

        $this->postJson('/api/platform/auth/logout');

        $this->postJson('/api/platform/auth/login', [
            'identifier' => 'admin@platform-test.test',
            'password' => 'Secret123!',
        ])->assertOk();
    }

    public function test_wrong_password_is_rejected(): void
    {
        $this->makePlatformUser();

        $this->postJson('/api/platform/auth/login', [
            'identifier' => 'superadmin',
            'password' => 'wrong',
        ])->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_me_and_logout_require_authentication(): void
    {
        $this->getJson('/api/platform/auth/me')->assertStatus(401);
        $this->postJson('/api/platform/auth/logout')->assertStatus(401);
    }

    public function test_logout_revokes_the_session(): void
    {
        $this->makePlatformUser();

        $this->postJson('/api/platform/auth/login', [
            'identifier' => 'superadmin',
            'password' => 'Secret123!',
        ])->assertOk();

        $this->getJson('/api/platform/auth/me')->assertOk();
        $this->postJson('/api/platform/auth/logout')->assertOk();
        $this->getJson('/api/platform/auth/me')->assertStatus(401);
    }

    public function test_login_success_is_audited_on_the_platform_audit_log(): void
    {
        $this->makePlatformUser();

        $this->postJson('/api/platform/auth/login', [
            'identifier' => 'superadmin',
            'password' => 'Secret123!',
        ]);

        $this->assertTrue(PlatformAuditLog::where('event', 'LOGIN_SUCCESS')->exists());
    }
}
