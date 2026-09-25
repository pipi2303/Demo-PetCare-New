<?php

declare(strict_types=1);

namespace Tests\Feature\UserManagement;

use App\Mail\TenantAdminInvitationMail;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Phase 9 acceptance test: the full user lifecycle a Tenant Admin drives
 * (§9, §21 "User") — create -> invite -> accept -> activate/suspend/
 * deactivate -> unlock -> soft delete, each transition audited (§18).
 */
class UserLifecycleTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['id' => 'test-userlife-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'userlife.isolation-test']);

        $this->tenant->run(function () {
            $admin = User::create([
                'username' => 'the.admin',
                'email' => 'admin@userlife-test.test',
                'password' => 'Secret123!',
                'first_name' => 'Admin',
                'status' => 'ACTIVE',
            ]);
            $admin->roles()->attach(Role::where('code', 'TENANT_ADMIN')->firstOrFail());
        });

        $this->postJson('http://userlife.isolation-test/api/auth/login', [
            'identifier' => 'the.admin',
            'password' => 'Secret123!',
        ])->assertOk();
    }

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    public function test_full_user_lifecycle(): void
    {
        Mail::fake();

        $department = $this->tenant->run(fn () => Department::create(['code' => 'MEDICAL', 'name' => 'Medical']));
        $branch = $this->tenant->run(fn () => Branch::create(['code' => 'MAIN', 'name' => 'Main']));

        // Create
        $created = $this->postJson('http://userlife.isolation-test/api/tenant/users', [
            'first_name' => 'Budi',
            'last_name' => 'Santoso',
            'username' => 'budi.santoso',
            'email' => 'budi@userlife-test.test',
            'department_id' => $department->id,
            'branch_id' => $branch->id,
            'roles' => ['USER'],
        ])->assertCreated();

        $userId = $created->json('data.id');
        $this->assertSame('INVITED', $created->json('data.status'));
        $this->assertSame($department->id, $created->json('data.profile.department_id'));

        // Invite
        $this->postJson("http://userlife.isolation-test/api/tenant/users/{$userId}/invite")->assertOk();
        Mail::assertSent(TenantAdminInvitationMail::class);

        $token = null;
        Mail::assertSent(TenantAdminInvitationMail::class, function (TenantAdminInvitationMail $mail) use (&$token) {
            $token = $mail->token;

            return true;
        });

        // Accept (self-service, tenant-context, not an admin action)
        $this->postJson('http://userlife.isolation-test/api/auth/invitations/accept', [
            'email' => 'budi@userlife-test.test',
            'token' => $token,
            'password' => 'BrandNew1!',
            'password_confirmation' => 'BrandNew1!',
        ])->assertOk()->assertJsonPath('data.user.status', 'ACTIVE');

        // Suspend -> Activate
        $this->postJson("http://userlife.isolation-test/api/tenant/users/{$userId}/suspend")
            ->assertOk()->assertJsonPath('data.status', 'SUSPENDED');
        $this->postJson("http://userlife.isolation-test/api/tenant/users/{$userId}/activate")
            ->assertOk()->assertJsonPath('data.status', 'ACTIVE');

        // Deactivate
        $this->postJson("http://userlife.isolation-test/api/tenant/users/{$userId}/deactivate")
            ->assertOk()->assertJsonPath('data.status', 'DEACTIVATED');

        // Unlock (simulate a lockout, then clear it)
        $this->tenant->run(function () use ($userId) {
            User::find($userId)->forceFill(['locked_at' => now(), 'failed_login_attempts' => 5])->save();
        });
        $this->postJson("http://userlife.isolation-test/api/tenant/users/{$userId}/unlock")->assertOk();
        $this->tenant->run(function () use ($userId) {
            $fresh = User::find($userId);
            $this->assertNull($fresh->locked_at);
            $this->assertSame(0, $fresh->failed_login_attempts);
        });

        // Soft delete
        $this->deleteJson("http://userlife.isolation-test/api/tenant/users/{$userId}")->assertOk();
        $this->tenant->run(function () use ($userId) {
            $this->assertNull(User::find($userId));
            $this->assertNotNull(User::withTrashed()->find($userId));
        });

        $this->tenant->run(function () use ($userId) {
            $events = AuditLog::where('target_user_id', $userId)->pluck('event')->all();

            foreach (['USER_CREATED', 'USER_INVITED', 'INVITATION_ACCEPTED', 'USER_SUSPENDED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'USER_UNLOCKED', 'USER_DELETED'] as $expected) {
                $this->assertContains($expected, $events, "Expected {$expected} to have been audited");
            }
        });
    }

    public function test_show_returns_profile_roles_permissions_and_sessions_count(): void
    {
        $user = $this->tenant->run(function () {
            $u = User::create([
                'username' => 'detail.user', 'email' => 'detail@userlife-test.test',
                'first_name' => 'Detail', 'status' => 'ACTIVE',
            ]);
            $u->roles()->attach(Role::where('code', 'USER')->firstOrFail());

            return $u;
        });

        $response = $this->getJson("http://userlife.isolation-test/api/tenant/users/{$user->id}")->assertOk();

        $this->assertTrue(collect($response->json('data.permissions'))->contains('menu.read'));
        $this->assertSame(0, $response->json('data.sessions_count'));
        $this->assertIsArray($response->json('data.recent_activity'));
    }

    public function test_user_management_requires_the_matching_permission(): void
    {
        $this->tenant->run(function () {
            $u = User::create([
                'username' => 'plain.user', 'email' => 'plain@userlife-test.test',
                'password' => 'Secret123!', 'first_name' => 'Plain', 'status' => 'ACTIVE',
            ]);
            $u->roles()->attach(Role::where('code', 'USER')->firstOrFail());
        });

        // Log back in as the unprivileged user.
        $this->postJson('http://userlife.isolation-test/api/auth/logout');
        $this->postJson('http://userlife.isolation-test/api/auth/login', [
            'identifier' => 'plain.user', 'password' => 'Secret123!',
        ])->assertOk();

        $this->getJson('http://userlife.isolation-test/api/tenant/users')
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }
}
