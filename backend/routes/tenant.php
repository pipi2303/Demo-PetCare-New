<?php

declare(strict_types=1);

use App\Http\Controllers\Api\Auth\InvitationController;
use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserRoleController;
use Illuminate\Support\Facades\DB;
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

    // Temporary Phase 1 isolation-proof endpoint (removed once real tenant
    // user endpoints land in Phase 9). Confirms queries only ever see rows
    // from the current tenant's own database.
    Route::get('/api/tenant/_debug/users', function () {
        return response()->json([
            'tenant_id' => tenant('id'),
            'users' => DB::table('users')->get(['id', 'username', 'email']),
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
    });
});
