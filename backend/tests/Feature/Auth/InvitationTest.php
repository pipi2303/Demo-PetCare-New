<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Mail\TenantAdminInvitationMail;
use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Auth\InvitationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Phase 6 acceptance test: invitation accept — the step that turns a
 * freshly provisioned (or Phase 9-invited) INVITED user into someone who
 * can actually log in.
 */
class InvitationTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-invite-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'invite.isolation-test']);
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_accepting_an_invitation_activates_the_user_and_allows_login(): void
    {
        Mail::fake();

        $this->tenant->run(function () {
            $user = User::create([
                'username' => 'budi.santoso',
                'email' => 'budi@invite-test.test',
                'first_name' => 'Budi',
                'status' => 'INVITED',
            ]);
            // TENANT_ADMIN already exists — the tenant is auto-seeded by
            // Phase 6's provisioning pipeline (TenantCreated -> SeedDatabase).

            app(InvitationService::class)->invite($user);
        });

        Mail::assertSent(TenantAdminInvitationMail::class);

        $token = null;
        Mail::assertSent(TenantAdminInvitationMail::class, function (TenantAdminInvitationMail $mail) use (&$token) {
            $token = $mail->token;

            return true;
        });

        $this->postJson('http://invite.isolation-test/api/auth/invitations/accept', [
            'email' => 'budi@invite-test.test',
            'token' => $token,
            'password' => 'BrandNew1!',
            'password_confirmation' => 'BrandNew1!',
        ])->assertOk()->assertJsonPath('data.user.status', 'ACTIVE');

        $this->postJson('http://invite.isolation-test/api/auth/login', [
            'identifier' => 'budi.santoso',
            'password' => 'BrandNew1!',
        ])->assertOk();

        $this->tenant->run(function () {
            $this->assertTrue(AuditLog::where('event', 'INVITATION_ACCEPTED')->exists());
        });
    }

    public function test_an_invalid_token_is_rejected(): void
    {
        Mail::fake();

        $this->tenant->run(function () {
            User::create([
                'username' => 'budi.santoso',
                'email' => 'budi@invite-test.test',
                'first_name' => 'Budi',
                'status' => 'INVITED',
            ]);
        });

        $this->postJson('http://invite.isolation-test/api/auth/invitations/accept', [
            'email' => 'budi@invite-test.test',
            'token' => 'not-the-real-token',
            'password' => 'BrandNew1!',
            'password_confirmation' => 'BrandNew1!',
        ])->assertStatus(422)->assertJsonPath('error.code', 'INVALID_TOKEN');
    }

    public function test_a_user_cannot_login_before_accepting_their_invitation(): void
    {
        Mail::fake();

        $this->tenant->run(function () {
            $user = User::create([
                'username' => 'budi.santoso',
                'email' => 'budi@invite-test.test',
                'first_name' => 'Budi',
                'status' => 'INVITED',
            ]);
            app(InvitationService::class)->invite($user);
        });

        $this->postJson('http://invite.isolation-test/api/auth/login', [
            'identifier' => 'budi.santoso',
            'password' => 'anything',
        ])->assertStatus(403)->assertJsonPath('error.code', 'USER_INACTIVE');
    }
}
