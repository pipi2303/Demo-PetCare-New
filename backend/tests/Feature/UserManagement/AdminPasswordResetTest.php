<?php

declare(strict_types=1);

namespace Tests\Feature\UserManagement;

use App\Mail\PasswordResetMail;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Phase 9 acceptance test: §15 — an admin never sets a password directly;
 * "reset-password" triggers the same secure email flow Phase 5 built for
 * self-service.
 */
class AdminPasswordResetTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-adminreset-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'adminreset.isolation-test']);

        $this->tenant->run(function () {
            $admin = User::create([
                'username' => 'the.admin', 'email' => 'admin@adminreset-test.test',
                'password' => 'Secret123!', 'first_name' => 'Admin', 'status' => 'ACTIVE',
            ]);
            $admin->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());
        });

        $this->postJson('http://adminreset.isolation-test/api/auth/login', [
            'identifier' => 'the.admin', 'password' => 'Secret123!',
        ])->assertOk();
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_admin_triggered_reset_sends_the_reset_email_and_never_sets_a_password(): void
    {
        Mail::fake();

        $target = $this->tenant->run(function () {
            $user = User::create([
                'username' => 'target.user', 'email' => 'target@adminreset-test.test',
                'password' => 'OriginalPass1!', 'first_name' => 'Target', 'status' => 'ACTIVE',
            ]);
            $user->roles()->attach(Role::where('code', 'USER')->firstOrFail());

            return $user;
        });
        $originalHash = $target->password;

        $this->postJson("http://adminreset.isolation-test/api/tenant/users/{$target->id}/reset-password")
            ->assertOk();

        Mail::assertSent(PasswordResetMail::class);

        // The password hash must be untouched — only the token-confirm
        // step (self-service, same as Phase 5) ever changes it.
        $this->tenant->run(function () use ($target, $originalHash) {
            $this->assertSame($originalHash, User::find($target->id)->password);
            $this->assertTrue(AuditLog::where('event', 'PASSWORD_RESET_REQUESTED')
                ->where('target_user_id', $target->id)->exists());
        });

        // Original password still logs in — proves nothing was changed.
        $this->postJson('http://adminreset.isolation-test/api/auth/logout');
        $this->postJson('http://adminreset.isolation-test/api/auth/login', [
            'identifier' => 'target.user', 'password' => 'OriginalPass1!',
        ])->assertOk();
    }
}
