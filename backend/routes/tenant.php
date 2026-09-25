<?php

declare(strict_types=1);

use App\Http\Controllers\Api\Auth\InvitationController;
use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\NavigationController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserRoleController;
use App\Http\Controllers\Api\UserSessionController;
use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Here you can register the tenant routes for your application.
| These routes are loaded by the TenantRouteServiceProvider.
|
| Feel free to customize them however you want. Good luck!
|
*/

Route::middleware([
    'web',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    // Phase 1 acceptance-test endpoint: proves each tenant domain resolves to
    // its own isolated tenant context (and, transitively, its own database).
    Route::get('/api/tenant/ping', function () {
        return response()->json([
            'tenant_id' => tenant('id'),
            'database' => tenant()->database()->getName(),
            'message' => 'pong',
        ]);
    });

    Route::post('/api/auth/login', [LoginController::class, 'login'])->middleware('throttle:login');
    Route::post('/api/auth/password-reset/request', [PasswordResetController::class, 'request']);
    Route::post('/api/auth/password-reset/confirm', [PasswordResetController::class, 'confirm']);
    Route::post('/api/auth/invitations/accept', [InvitationController::class, 'accept']);

    Route::middleware('auth:web')->group(function () {
        Route::post('/api/auth/logout', [LoginController::class, 'logout']);
        Route::get('/api/auth/me', [LoginController::class, 'me']);

        // Temporary Phase 7 debug endpoint proving the Feature Guard works
        // (no real feature-gated business resource exists yet — that's
        // Phase 8+). Same pattern as Phase 1's other _debug routes. The
        // code is fixed, not a route param — middleware parameters aren't
        // substituted from the URI the way route-model-binding is.
        Route::get('/api/tenant/_debug/feature-check', function () {
            return response()->json(['success' => true, 'feature' => 'DEBUG_FEATURE']);
        })->middleware('feature:DEBUG_FEATURE');

        // Phase 7 — RBAC management. Each route carries its own Permission
        // Guard, matching the Phase 4 seeded catalog exactly.
        Route::get('/api/tenant/permissions', [PermissionController::class, 'index'])
            ->middleware('permission:permission.read');

        Route::get('/api/tenant/roles', [RoleController::class, 'index'])
            ->middleware('permission:role.read');
        Route::post('/api/tenant/roles', [RoleController::class, 'store'])
            ->middleware('permission:role.create');
        Route::get('/api/tenant/roles/{role}', [RoleController::class, 'show'])
            ->middleware('permission:role.read');
        Route::patch('/api/tenant/roles/{role}', [RoleController::class, 'update'])
            ->middleware('permission:role.update');
        Route::delete('/api/tenant/roles/{role}', [RoleController::class, 'destroy'])
            ->middleware('permission:role.delete');
        Route::put('/api/tenant/roles/{role}/permissions', [RoleController::class, 'syncPermissions'])
            ->middleware('permission:role.update');

        Route::put('/api/tenant/users/{user}/roles', [UserRoleController::class, 'sync'])
            ->middleware('permission:user.update');

        // Phase 8 — Dynamic Menu (§8.4).
        Route::get('/api/navigation', [NavigationController::class, 'index']);

        // Phase 9 — Departments & Branches.
        Route::get('/api/tenant/departments', [DepartmentController::class, 'index'])
            ->middleware('permission:user.read');
        Route::post('/api/tenant/departments', [DepartmentController::class, 'store'])
            ->middleware('permission:department.manage');
        Route::get('/api/tenant/departments/{department}', [DepartmentController::class, 'show'])
            ->middleware('permission:user.read');
        Route::patch('/api/tenant/departments/{department}', [DepartmentController::class, 'update'])
            ->middleware('permission:department.manage');
        Route::delete('/api/tenant/departments/{department}', [DepartmentController::class, 'destroy'])
            ->middleware('permission:department.manage');

        Route::get('/api/tenant/branches', [BranchController::class, 'index'])
            ->middleware('permission:user.read');
        Route::post('/api/tenant/branches', [BranchController::class, 'store'])
            ->middleware('permission:branch.manage');
        Route::get('/api/tenant/branches/{branch}', [BranchController::class, 'show'])
            ->middleware('permission:user.read');
        Route::patch('/api/tenant/branches/{branch}', [BranchController::class, 'update'])
            ->middleware('permission:branch.manage');
        Route::delete('/api/tenant/branches/{branch}', [BranchController::class, 'destroy'])
            ->middleware('permission:branch.manage');

        // Phase 9 — Tenant User Management (§9, §21 "User").
        Route::get('/api/tenant/users', [UserController::class, 'index'])
            ->middleware('permission:user.read');
        Route::post('/api/tenant/users', [UserController::class, 'store'])
            ->middleware('permission:user.create');
        Route::get('/api/tenant/users/{user}', [UserController::class, 'show'])
            ->middleware('permission:user.read');
        Route::patch('/api/tenant/users/{user}', [UserController::class, 'update'])
            ->middleware('permission:user.update');
        Route::delete('/api/tenant/users/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:user.delete');

        Route::post('/api/tenant/users/{user}/invite', [UserController::class, 'invite'])
            ->middleware('permission:user.update');
        Route::post('/api/tenant/users/{user}/resend-invite', [UserController::class, 'resendInvite'])
            ->middleware('permission:user.update');
        Route::post('/api/tenant/users/{user}/activate', [UserController::class, 'activate'])
            ->middleware('permission:user.update');
        Route::post('/api/tenant/users/{user}/suspend', [UserController::class, 'suspend'])
            ->middleware('permission:user.update');
        Route::post('/api/tenant/users/{user}/deactivate', [UserController::class, 'deactivate'])
            ->middleware('permission:user.update');
        Route::post('/api/tenant/users/{user}/unlock', [UserController::class, 'unlock'])
            ->middleware('permission:user.update');
        Route::post('/api/tenant/users/{user}/reset-password', [UserController::class, 'resetPassword'])
            ->middleware('permission:user.update');
        Route::put('/api/tenant/users/{user}/scopes', [UserController::class, 'syncScopes'])
            ->middleware('permission:user.update');

        Route::get('/api/tenant/users/{user}/sessions', [UserSessionController::class, 'index'])
            ->middleware('permission:user.read');
        Route::post('/api/tenant/users/{user}/sessions/revoke', [UserSessionController::class, 'revoke'])
            ->middleware('permission:user.update');
        Route::post('/api/tenant/users/{user}/sessions/revoke-all', [UserSessionController::class, 'revokeAll'])
            ->middleware('permission:user.update');
    });
});
