<?php

declare(strict_types=1);

use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
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

    Route::middleware('auth:web')->group(function () {
        Route::post('/api/auth/logout', [LoginController::class, 'logout']);
        Route::get('/api/auth/me', [LoginController::class, 'me']);
    });
});
