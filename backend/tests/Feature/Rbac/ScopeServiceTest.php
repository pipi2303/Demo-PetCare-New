<?php

declare(strict_types=1);

namespace Tests\Feature\Rbac;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserAccessScope;
use App\Models\UserProfile;
use App\Services\Auth\ScopeService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 7 acceptance test: ScopeService (§7.4, §9.8) — infrastructure only
 * this phase (no live business resource exists to protect with it yet),
 * exercised directly against the real user_profiles table rather than a
 * synthetic fixture.
 */
class ScopeServiceTest extends TestCase
{
    private Tenant $tenant;

    protected function tearDown(): void
    {
        DB::purge('tenant');
        $this->tenant->delete();

        parent::tearDown();
    }

    private function seedScopeFixtures(): array
    {
        $this->tenant = Tenant::create(['id' => 'test-scope-tenant', 'status' => 'ACTIVE']);
        $this->tenant->domains()->create(['domain' => 'scope.isolation-test']);

        return $this->tenant->run(function () {
            $branchA = Branch::create(['code' => 'BR-A', 'name' => 'Branch A']);
            $branchB = Branch::create(['code' => 'BR-B', 'name' => 'Branch B']);

            $viewer = User::create([
                'username' => 'viewer', 'email' => 'viewer@scope-test.test',
                'password' => 'Secret123!', 'first_name' => 'Viewer', 'status' => 'ACTIVE',
            ]);

            $userInBranchA = User::create([
                'username' => 'in.branch.a', 'email' => 'a@scope-test.test',
                'password' => 'Secret123!', 'first_name' => 'A', 'status' => 'ACTIVE',
            ]);
            UserProfile::create(['user_id' => $userInBranchA->id, 'branch_id' => $branchA->id]);

            $userInBranchB = User::create([
                'username' => 'in.branch.b', 'email' => 'b@scope-test.test',
                'password' => 'Secret123!', 'first_name' => 'B', 'status' => 'ACTIVE',
            ]);
            UserProfile::create(['user_id' => $userInBranchB->id, 'branch_id' => $branchB->id]);

            UserProfile::create(['user_id' => $viewer->id, 'branch_id' => $branchA->id]);

            return compact('branchA', 'branchB', 'viewer', 'userInBranchA', 'userInBranchB');
        });
    }

    public function test_branch_scope_restricts_the_query_to_that_branch(): void
    {
        $seed = $this->seedScopeFixtures();

        $this->tenant->run(function () use ($seed) {
            UserAccessScope::create([
                'user_id' => $seed['viewer']->id,
                'scope_type' => 'BRANCH',
                'branch_id' => $seed['branchA']->id,
            ]);

            $results = (new ScopeService)->applyScope(UserProfile::query(), $seed['viewer']->fresh())->get();

            $this->assertTrue($results->contains('user_id', $seed['userInBranchA']->id));
            $this->assertFalse($results->contains('user_id', $seed['userInBranchB']->id));
        });
    }

    public function test_tenant_scope_is_unrestricted(): void
    {
        $seed = $this->seedScopeFixtures();

        $this->tenant->run(function () use ($seed) {
            UserAccessScope::create(['user_id' => $seed['viewer']->id, 'scope_type' => 'TENANT']);

            $results = (new ScopeService)->applyScope(UserProfile::query(), $seed['viewer']->fresh())->get();

            $this->assertTrue($results->contains('user_id', $seed['userInBranchA']->id));
            $this->assertTrue($results->contains('user_id', $seed['userInBranchB']->id));
        });
    }

    public function test_no_scope_rows_means_no_access_by_default(): void
    {
        $seed = $this->seedScopeFixtures();

        $this->tenant->run(function () use ($seed) {
            $results = (new ScopeService)->applyScope(UserProfile::query(), $seed['viewer']->fresh())->get();

            $this->assertCount(0, $results);
        });
    }

    public function test_own_scope_restricts_to_the_users_own_rows(): void
    {
        $seed = $this->seedScopeFixtures();

        $this->tenant->run(function () use ($seed) {
            UserAccessScope::create(['user_id' => $seed['viewer']->id, 'scope_type' => 'OWN']);

            $results = (new ScopeService)->applyScope(
                UserProfile::query(),
                $seed['viewer']->fresh(),
                ownerColumn: 'user_id',
            )->get();

            $this->assertCount(1, $results);
            $this->assertSame($seed['viewer']->id, $results->first()->user_id);
        });
    }
}
