<?php

declare(strict_types=1);

namespace Tests\Feature\UserManagement;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 9 acceptance test: §14 session listing/revocation.
 *
 * phpunit.xml sets SESSION_DRIVER=array for the whole suite (fast,
 * isolated) — that driver never touches the `sessions` table at all, so
 * there is no way to prove "revoke -> the cookie stops authenticating"
 * end-to-end here. That exact flow (login -> revoke-all -> the same
 * cookie gets 401) was verified manually against the real dev environment
 * (SESSION_DRIVER=database, as production would run). What's tested here
 * instead — and what's actually reachable in this environment — is the
 * controller's own query/permission-guard logic, against rows seeded
 * directly into `sessions` the way the database driver would leave them.
 */
class UserSessionTest extends TestCase
{
    private Tenant $tenant;

    private User $target;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-usersession-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'usersession.isolation-test']);

        $this->target = $this->tenant->run(function () {
            $admin = User::create([
                'username' => 'the.admin', 'email' => 'admin@usersession-test.test',
                'password' => 'Secret123!', 'first_name' => 'Admin', 'status' => 'ACTIVE',
            ]);
            $admin->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());

            $target = User::create([
                'username' => 'target.user', 'email' => 'target@usersession-test.test',
                'password' => 'Secret123!', 'first_name' => 'Target', 'status' => 'ACTIVE',
            ]);
            $target->roles()->attach(Role::where('code', 'USER')->firstOrFail());

            DB::table('sessions')->insert([
                'id' => 'session-one', 'user_id' => $target->id,
                'ip_address' => '127.0.0.1', 'user_agent' => 'test-agent',
                'payload' => base64_encode('x'), 'last_activity' => time(),
            ]);
            DB::table('sessions')->insert([
                'id' => 'session-two', 'user_id' => $target->id,
                'ip_address' => '127.0.0.2', 'user_agent' => 'test-agent-2',
                'payload' => base64_encode('x'), 'last_activity' => time(),
            ]);

            return $target;
        });

        $this->postJson('http://usersession.isolation-test/api/auth/login', [
            'identifier' => 'the.admin', 'password' => 'Secret123!',
        ])->assertOk();
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_admin_can_list_a_users_sessions(): void
    {
        $response = $this->getJson("http://usersession.isolation-test/api/tenant/users/{$this->target->id}/sessions")
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
    }

    public function test_admin_can_revoke_a_single_session(): void
    {
        $this->postJson("http://usersession.isolation-test/api/tenant/users/{$this->target->id}/sessions/revoke", [
            'session_id' => 'session-one',
        ])->assertOk();

        $this->tenant->run(function () {
            $this->assertFalse(DB::table('sessions')->where('id', 'session-one')->exists());
            $this->assertTrue(DB::table('sessions')->where('id', 'session-two')->exists());
            $this->assertTrue(AuditLog::where('event', 'SESSION_REVOKED')->exists());
        });
    }

    public function test_admin_can_revoke_all_of_a_users_sessions(): void
    {
        $this->postJson("http://usersession.isolation-test/api/tenant/users/{$this->target->id}/sessions/revoke-all")
            ->assertOk();

        $this->tenant->run(function () {
            $this->assertSame(0, DB::table('sessions')->where('user_id', $this->target->id)->count());
        });
    }

    public function test_revoking_a_session_never_touches_another_users_sessions(): void
    {
        $otherUserId = $this->tenant->run(function () {
            $other = User::create([
                'username' => 'other.user', 'email' => 'other@usersession-test.test',
                'first_name' => 'Other', 'status' => 'ACTIVE',
            ]);
            DB::table('sessions')->insert([
                'id' => 'session-other', 'user_id' => $other->id,
                'payload' => base64_encode('x'), 'last_activity' => time(),
            ]);

            return $other->id;
        });

        $this->postJson("http://usersession.isolation-test/api/tenant/users/{$this->target->id}/sessions/revoke-all")
            ->assertOk();

        $this->tenant->run(function () use ($otherUserId) {
            $this->assertTrue(DB::table('sessions')->where('user_id', $otherUserId)->exists());
        });
    }
}
