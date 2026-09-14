<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 5 acceptance test: tenant user login (Master Prompt §2.6, §5, §25).
 * Same real-tenant pattern as earlier phases (no RefreshDatabase — see
 * TenantIsolationTest for why).
 */
class TenantLoginTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-login-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'login.isolation-test']);
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    private function makeUser(array $overrides = []): User
    {
        return $this->tenant->run(fn () => User::create(array_merge([
            'username' => 'budi.santoso',
            'email' => 'budi@login-test.test',
            'password' => 'Secret123!',
            'first_name' => 'Budi',
            'status' => 'ACTIVE',
        ], $overrides)));
    }

    public function test_user_can_login_with_username(): void
    {
        $this->makeUser();

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'budi.santoso',
            'password' => 'Secret123!',
        ])->assertOk()->assertJsonPath('data.user.username', 'budi.santoso');
    }

    public function test_user_can_login_with_email(): void
    {
        $this->makeUser();

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'budi@login-test.test',
            'password' => 'Secret123!',
        ])->assertOk()->assertJsonPath('data.user.email', 'budi@login-test.test');
    }

    public function test_login_identifier_is_case_insensitive(): void
    {
        $this->makeUser();

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'Budi.Santoso',
            'password' => 'Secret123!',
        ])->assertOk();
    }

    public function test_response_never_includes_the_password_hash(): void
    {
        $this->makeUser();

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'budi.santoso',
            'password' => 'Secret123!',
        ])->assertOk()->assertJsonMissingPath('data.user.password');
    }

    public function test_wrong_password_returns_generic_invalid_credentials(): void
    {
        $this->makeUser();

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'budi.santoso',
            'password' => 'wrong-password',
        ])->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_unknown_identifier_returns_the_same_generic_error_as_wrong_password(): void
    {
        // No user created — proves the response doesn't leak whether the
        // identifier exists (username-enumeration prevention).
        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'nobody.here',
            'password' => 'irrelevant',
        ])->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_account_locks_after_max_failed_attempts_and_a_correct_password_is_then_rejected(): void
    {
        $this->makeUser(['username' => 'lockout.user', 'email' => 'lockout@login-test.test']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('http://login.isolation-test/api/auth/login', [
                'identifier' => 'lockout.user',
                'password' => 'wrong',
            ])->assertStatus(401);
        }

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'lockout.user',
            'password' => 'Secret123!', // correct — should still be rejected, account is locked
        ])->assertStatus(423)->assertJsonPath('error.code', 'ACCOUNT_LOCKED');
    }

    public function test_inactive_user_cannot_login(): void
    {
        $this->makeUser(['username' => 'suspended.user', 'email' => 'suspended@login-test.test', 'status' => 'SUSPENDED']);

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'suspended.user',
            'password' => 'Secret123!',
        ])->assertStatus(403)->assertJsonPath('error.code', 'USER_INACTIVE');
    }

    public function test_inactive_tenant_cannot_login(): void
    {
        $this->makeUser(['username' => 'tenant.suspended', 'email' => 'tsusp@login-test.test']);
        $this->tenant->update(['status' => 'SUSPENDED']);

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'tenant.suspended',
            'password' => 'Secret123!',
        ])->assertStatus(403)->assertJsonPath('error.code', 'TENANT_INACTIVE');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('http://login.isolation-test/api/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_logout_revokes_the_session(): void
    {
        $this->makeUser(['username' => 'logout.user', 'email' => 'logout@login-test.test']);

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'logout.user',
            'password' => 'Secret123!',
        ])->assertOk();

        $this->getJson('http://login.isolation-test/api/auth/me')->assertOk();

        $this->postJson('http://login.isolation-test/api/auth/logout')->assertOk();

        $this->getJson('http://login.isolation-test/api/auth/me')->assertStatus(401);
    }

    public function test_login_success_and_failure_are_audited(): void
    {
        $this->makeUser(['username' => 'audit.user', 'email' => 'audit@login-test.test']);

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'audit.user',
            'password' => 'wrong',
        ]);
        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'audit.user',
            'password' => 'Secret123!',
        ]);

        $this->tenant->run(function () {
            $this->assertTrue(AuditLog::where('event', 'LOGIN_FAILED')->exists());
            $this->assertTrue(AuditLog::where('event', 'LOGIN_SUCCESS')->exists());
        });
    }

    public function test_login_is_rate_limited_past_the_configured_threshold(): void
    {
        config(['authentication.login_rate_limit.max_attempts' => 2]);
        $this->makeUser(['username' => 'ratelimit.user', 'email' => 'ratelimit@login-test.test']);

        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'ratelimit.user', 'password' => 'wrong',
        ])->assertStatus(401);
        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'ratelimit.user', 'password' => 'wrong',
        ])->assertStatus(401);
        $this->postJson('http://login.isolation-test/api/auth/login', [
            'identifier' => 'ratelimit.user', 'password' => 'wrong',
        ])->assertStatus(429);
    }
}
